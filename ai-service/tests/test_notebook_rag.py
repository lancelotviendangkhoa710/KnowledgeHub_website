import os
import unittest
from unittest.mock import AsyncMock, patch

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.vectorstores import InMemoryVectorStore

from app import notebook_rag


class FixedEmbeddings(Embeddings):
    def embed_documents(self, texts):
        return [[1.0, 0.0] if "Python" in text else [0.0, 1.0] for text in texts]

    def embed_query(self, text):
        return [1.0, 0.0] if "Python" in text else [0.0, 1.0]


class Page:
    def __init__(self, text):
        self.text = text

    def extract_text(self):
        return self.text


class Reader:
    is_encrypted = False
    pages = [Page("Python is a programming language."), Page("PostgreSQL stores data.")]


class NotebookRagTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"AI_SERVICE_TOKEN": "internal"})
        self.env.start()

    def tearDown(self):
        self.env.stop()

    def test_loader_splitter_embedding_and_retriever_pipeline(self):
        with patch.object(notebook_rag, "PdfReader", return_value=Reader()):
            pages = notebook_rag.loader(b"%PDF-1.7 test")
        chunks = notebook_rag.splitter(pages)
        self.assertEqual([1, 2], [page.metadata["page"] for page in pages])
        self.assertEqual([1, 2], [chunk.metadata["page"] for chunk in chunks])

        with patch.object(notebook_rag, "embed", return_value=[[0.1] * notebook_rag.DIMENSIONS] * len(chunks)) as embed:
            vectors = notebook_rag.embed(["passage: " + chunk.page_content for chunk in chunks])
        self.assertEqual(len(chunks), len(vectors))
        self.assertTrue(all(text.startswith("passage: ") for text in embed.call_args.args[0]))

        store = InMemoryVectorStore(FixedEmbeddings())
        store.add_documents([Document(page_content=chunk.page_content, metadata=chunk.metadata) for chunk in chunks])
        retrieved = store.similarity_search("What is Python?", k=1)
        self.assertEqual("Python is a programming language.", retrieved[0].page_content)

    async def test_empty_context_returns_no_answer_without_calling_model(self):
        with patch.object(notebook_rag, "model") as model:
            result = await notebook_rag.answer(notebook_rag.AnswerInput(question="What is Python?", chunks=[]), "internal")
        self.assertEqual({"answer": notebook_rag.NO_ANSWER}, result)
        model.assert_not_called()

    async def test_answer_supplies_selected_document_metadata_to_model(self):
        response = type("Reply", (), {"content": "Synthesis."})()
        with patch.object(notebook_rag, "model") as model:
            model.return_value.ainvoke = AsyncMock(return_value=response)
            result = await notebook_rag.answer(notebook_rag.AnswerInput(
                question="Compare both documents", documents=[
                    {"filename": "one.pdf", "title": "One", "chunk_count": 2},
                    {"filename": "two.pdf", "title": "Two", "chunk_count": 3},
                ], chunks=[{"filename": "one.pdf", "page": 1, "content": "First source."}, {"filename": "two.pdf", "page": 1, "content": "Second source."}],
            ), "internal")
        self.assertEqual("Synthesis.", result["answer"])
        prompt = model.return_value.ainvoke.call_args.args[0][1].content
        self.assertIn('"one.pdf"', prompt)
        self.assertIn('"two.pdf"', prompt)


if __name__ == "__main__":
    unittest.main()
