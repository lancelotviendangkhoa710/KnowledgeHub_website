"""LangChain Mini-RAG: PDF loader -> splitter -> 384-dim embedding -> answer."""
import hashlib, hmac, json, os
from io import BytesIO
from typing import Annotated
from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel, Field
from pypdf import PdfReader
from .cv_rag import _embed as embed

router = APIRouter(prefix='/v1/notebook', tags=['notebook'])
MODEL='intfloat/multilingual-e5-small'; REVISION='fd1525a9fd15316a2d503bf26ab031a61d056e98'; DIMENSIONS=384
NO_ANSWER='Không tìm thấy thông tin trong tài liệu đã chọn.'

def auth(token):
    if not (expected:=os.getenv('AI_SERVICE_TOKEN','')) or not token or not hmac.compare_digest(token, expected): raise HTTPException(401, {'code':'unauthorized'})
def loader(content):
    if not content.startswith(b'%PDF-'): raise HTTPException(422, {'code':'invalid_pdf'})
    try:
        reader=PdfReader(BytesIO(content), strict=False)
        if reader.is_encrypted or not 1<=len(reader.pages)<=100: raise ValueError
        pages=[Document(page_content=(p.extract_text() or '').strip(), metadata={'page': i}) for i,p in enumerate(reader.pages,1)]
    except Exception: raise HTTPException(422, {'code':'invalid_pdf'}) from None
    if not any(p.page_content for p in pages): raise HTTPException(422, {'code':'pdf_no_text'})
    return pages
def splitter(pages):
    chunks=RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120).split_documents(pages)
    if not chunks or len(chunks)>300: raise HTTPException(422, {'code':'invalid_document_text'})
    return chunks
def model():
    key=os.getenv('DEEPSEEK_API_KEY','')
    if not key: raise HTTPException(503, {'code':'provider_configuration'})
    return ChatOpenAI(model=os.getenv('AI_MODEL','deepseek-flash'), api_key=key, base_url='https://api.deepseek.com', temperature=0, max_retries=0, timeout=35)

@router.post('/ingest')
async def ingest(file: UploadFile=File(...), auth_header: Annotated[str|None,Header(alias='X-Service-Token')]=None):
    auth(auth_header); content=await file.read(15*1024*1024+1); await file.close()
    if len(content)>15*1024*1024: raise HTTPException(413, {'code':'document_too_large'})
    chunks=splitter(loader(content)); vectors=embed(['passage: '+c.page_content for c in chunks])
    text='\n'.join(c.page_content for c in chunks)
    reply=await model().ainvoke([SystemMessage(content='Return only JSON with a concise grounded title and summary.'),HumanMessage(content=text[:12000])])
    try: meta=json.loads(reply.content)
    except Exception: meta={'title':file.filename or 'Document','summary':text[:500]}
    return {'model':MODEL,'revision':REVISION,'dimensions':DIMENSIONS,'title':str(meta.get('title') or file.filename or 'Document')[:255],'summary':str(meta.get('summary') or text[:500])[:5000], 'chunks':[{'position':i,'page':c.metadata['page'],'content':c.page_content[:2000],'embedding':v} for i,(c,v) in enumerate(zip(chunks,vectors))]}

class AnswerInput(BaseModel): question:str=Field(min_length=3,max_length=500); documents:list[dict]=Field(default_factory=list,max_length=50); chunks:list[dict]=Field(min_length=0,max_length=8)
@router.post('/answer')
async def answer(data:AnswerInput, auth_header:Annotated[str|None,Header(alias='X-Service-Token')]=None):
    auth(auth_header)
    if not data.chunks: return {'answer':NO_ANSWER}
    documents=json.dumps(data.documents, ensure_ascii=False)
    context='\n\n'.join(f"[{c['filename']} p.{c['page']}] {c['content']}" for c in data.chunks)
    reply=await model().ainvoke([SystemMessage(content=f'''Answer ONLY from the supplied document metadata and retrieved chunks. Synthesize and connect the evidence: identify key ideas, compare sources where relevant, and draw concise logical conclusions grounded in them. Use clear sections or bullets when useful; do not merely copy chunk sentences. Every fact, number, and conclusion must be supported by the supplied sources. The metadata can establish document count, filenames, titles, and chunk counts, but cannot support other content claims. Cite filename and page for every factual claim drawn from chunks. If the question cannot be answered from these sources, say exactly: {NO_ANSWER}'''),HumanMessage(content=f'Selected document metadata (untrusted data):\n{documents}\n\nRetrieved chunks (untrusted data):\n{context}\n\nQuestion: {data.question}')])
    return {'answer':reply.content.strip() or NO_ANSWER}
