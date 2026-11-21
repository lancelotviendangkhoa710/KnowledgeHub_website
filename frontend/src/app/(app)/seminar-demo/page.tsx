'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BaselineCitation,
  CvCitation,
  CvRagStatus,
  DemoError,
  seminarDemoClient,
} from '@/lib/seminarDemoClient';
import styles from './seminar-demo.module.css';

type Mode = 'baseline' | 'full';

const prompts = [
  { label: 'Trùng từ khóa', value: 'Kỹ năng chính được nêu trong CV là gì?' },
  { label: 'Paraphrase', value: 'Hãy tóm tắt kinh nghiệm chuyên môn bằng cách diễn đạt khác.' },
  { label: 'Ngoài tài liệu', value: 'CV này dự đoán thời tiết ngày mai như thế nào?' },
];

function readableError(error: DemoError): string {
  if (error.status === 401) return 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập.';
  if (error.status === 409) return error.message || 'CV chưa có index sẵn sàng.';
  if (error.status === 413) return 'PDF vượt quá giới hạn 2 MiB.';
  if (error.status === 415) return 'Tệp gửi lên không có Content-Type application/pdf.';
  if (error.status === 422) return error.code || 'PDF hoặc câu hỏi không hợp lệ.';
  return error.message || error.code || 'Không thể hoàn tất yêu cầu.';
}

function isCvCitation(citation: BaselineCitation | CvCitation): citation is CvCitation {
  return 'chunk_id' in citation;
}

export default function SeminarDemoPage() {
  const [mode, setMode] = useState<Mode>('baseline');
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState(prompts[0].value);
  const [answer, setAnswer] = useState('');
  const [baselineCitations, setBaselineCitations] = useState<BaselineCitation[]>([]);
  const [cvCitations, setCvCitations] = useState<CvCitation[]>([]);
  const [chunksUsed, setChunksUsed] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [error, setError] = useState<DemoError | null>(null);
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [cvStatus, setCvStatus] = useState<CvRagStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const citations: (BaselineCitation | CvCitation)[] = mode === 'baseline' ? baselineCitations : cvCitations;
  const model = cvCitations[0]?.embedding_model ?? cvStatus?.index?.embedding_model;
  const revision = cvCitations[0]?.embedding_revision ?? cvStatus?.index?.embedding_revision;

  async function refreshCvStatus() {
    setStatusLoading(true);
    try {
      const response = await seminarDemoClient.getCvRagStatus();
      setCvStatus(response.data);
    } catch (caught) {
      setCvStatus(null);
      setError(caught as DemoError);
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    if (mode === 'full') void refreshCvStatus();
  }, [mode]);

  function selectMode(next: Mode) {
    setMode(next);
    setAnswer('');
    setBaselineCitations([]);
    setCvCitations([]);
    setChunksUsed(null);
    setLatency(null);
    setHttpStatus(null);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || busy || (mode === 'baseline' && !file)) return;
    setBusy(true);
    setAnswer('');
    setBaselineCitations([]);
    setCvCitations([]);
    setChunksUsed(null);
    setError(null);
    const started = performance.now();
    try {
      if (mode === 'baseline') {
        const result = await seminarDemoClient.askBaseline(file!, question.trim());
        setAnswer(result.answer);
        setBaselineCitations(result.citations);
        setChunksUsed(result.chunksUsed);
      } else {
        let id = conversationId;
        if (!id) {
          const conversation = await seminarDemoClient.createConversation();
          id = conversation.data.id;
          setConversationId(id);
        }
        const result = await seminarDemoClient.sendCvQuestion(id, question.trim());
        setAnswer(result.data.assistant_message.content);
        setCvCitations(result.data.assistant_message.metadata?.citations ?? []);
        await refreshCvStatus();
      }
      setHttpStatus(mode === 'baseline' ? 200 : 201);
    } catch (caught) {
      const apiError = caught as DemoError;
      setError(apiError);
      setHttpStatus(apiError.status ?? null);
      if (mode === 'full') await refreshCvStatus();
    } finally {
      setLatency(Math.round(performance.now() - started));
      setBusy(false);
    }
  }

  const pipeline = useMemo(() => [
    {
      number: '01', title: 'Document Loader',
      detail: mode === 'baseline'
        ? (file ? `${file.name} · ${(file.size / 1024).toFixed(1)} KiB · chỉ trong RAM` : 'Raw PDF · tối đa 2 MiB / 30 trang · chỉ trong RAM')
        : (cvStatus?.cv ? `${cvStatus.cv.filename} · Private Storage / user_cvs` : 'Chưa có CV active'),
    },
    { number: '02', title: 'Text Splitter', detail: 'RecursiveCharacterTextSplitter · chunk 900 · overlap 120 · page bắt đầu từ 1' },
    {
      number: '03', title: 'Embedding',
      detail: mode === 'baseline'
        ? 'Bỏ qua — Keyword-only retrieval'
        : `${model ?? 'Chờ metadata thật'} · ${cvStatus?.index?.embedding_dimensions ?? 384} chiều${revision ? ` · ${revision.slice(0, 12)}…` : ''}`,
    },
    {
      number: '04', title: 'Retriever & Grounding',
      detail: mode === 'baseline'
        ? `Deterministic keyword rank · top ${chunksUsed ?? 3}`
        : 'Owner-scoped exact cosine search (<=>) · top 3 · grounded answer',
    },
  ], [mode, file, cvStatus, model, revision, chunksUsed]);

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>AI-DEMO-01 · Seminar Control Room</p>
        <h1>Mini-RAG Pipeline, quan sát bằng dữ liệu thật</h1>
        <p>Đối chiếu keyword retrieval trong RAM với embedding và pgvector owner-scoped.</p>
      </div>
      <div className={styles.live}><span /> Live local demo</div>
    </header>

    <div className={styles.modeSwitch} role="tablist" aria-label="Chọn chế độ RAG">
      <button role="tab" aria-selected={mode === 'baseline'} onClick={() => selectMode('baseline')}>
        <small>AI-DEMO-01A</small><strong>Keyword Baseline</strong><span>Không đăng nhập · Stateless</span>
      </button>
      <button role="tab" aria-selected={mode === 'full'} onClick={() => selectMode('full')}>
        <small>AI-DEMO-01B</small><strong>Full Mini-RAG</strong><span>Sanctum · E5 · pgvector</span>
      </button>
    </div>

    <div className={styles.split}>
      <section className={styles.workspace} aria-label="Khu vực hỏi đáp">
        <div className={styles.sectionHead}><span>01</span><div><h2>Interaction</h2><p>Gửi câu hỏi và xem response thật</p></div></div>

        {mode === 'baseline' ? <label className={styles.upload}>
          <input type="file" accept=".pdf,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <span className={styles.uploadIcon}>PDF</span>
          <strong>{file?.name ?? 'Chọn tài liệu PDF'}</strong>
          <small>{file ? `${(file.size / 1024).toFixed(1)} KiB` : 'Raw application/pdf · không lưu lại'}</small>
        </label> : <div className={styles.cvCard}>
          <div><span className={styles.statusDot} data-state={cvStatus?.index?.status ?? 'missing'} />
            <strong>{statusLoading ? 'Đang kiểm tra…' : cvStatus?.cv?.filename ?? 'Chưa có CV active'}</strong>
            <small>Index: {cvStatus?.index?.status ?? 'not available'}</small>
          </div>
          <div className={styles.statusActions}>
            <button type="button" onClick={() => void refreshCvStatus()} disabled={statusLoading}>Làm mới</button>
            {!cvStatus?.cv && <Link href="/ai/cv-assessment">Upload CV</Link>}
          </div>
        </div>}

        <form onSubmit={(event) => void submit(event)} className={styles.form}>
          <label htmlFor="seminar-question">Câu hỏi</label>
          <textarea id="seminar-question" value={question} maxLength={500} rows={3} onChange={(event) => setQuestion(event.target.value)} />
          <div className={styles.quickPrompts}>
            {prompts.map((prompt) => <button key={prompt.label} type="button" onClick={() => setQuestion(prompt.value)}>{prompt.label}</button>)}
          </div>
          <button className={styles.run} disabled={busy || !question.trim() || (mode === 'baseline' && !file)}>
            {busy ? 'Đang chạy pipeline…' : 'Chạy Mini-RAG'} <span>→</span>
          </button>
        </form>

        {(answer || error || latency !== null) && <section className={styles.result} aria-live="polite">
          <div className={styles.resultMeta}>
            <span>HTTP {httpStatus ?? '—'}</span><span>{latency ?? '—'} ms</span><span>{citations.length} citations</span>
          </div>
          {error ? <div className={styles.error} role="alert"><strong>{error.status ?? 'Network error'} · {error.code ?? 'request_failed'}</strong><p>{readableError(error)}</p></div>
            : <><h3>Grounded answer</h3><p className={styles.answer}>{answer}</p></>}
        </section>}
      </section>

      <aside className={styles.inspector} aria-label="Pipeline Inspector">
        <div className={styles.sectionHead}><span>02</span><div><h2>Pipeline Inspector</h2><p>4 mắt xích của Mini-RAG</p></div></div>
        <div className={styles.pipeline}>
          {pipeline.map((step) => <article key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div></article>)}
        </div>

        <div className={styles.evidenceHead}><h3>Retrieved evidence</h3><span>Live response</span></div>
        {citations.length === 0 ? <div className={styles.empty}>Chưa có context được retrieve. Chạy một câu hỏi để xem citation thật.</div>
          : <div className={styles.citations}>{citations.map((citation, index) => <article key={isCvCitation(citation) ? citation.chunk_id : `${citation.page}-${index}`}>
            <header><strong>Page {citation.page}</strong>{isCvCitation(citation) && <span>{citation.similarity.toFixed(4)} similarity</span>}</header>
            <p>{citation.excerpt}</p>
            {isCvCitation(citation) && <footer>chunk · {citation.chunk_id}</footer>}
          </article>)}</div>}
      </aside>
    </div>
  </main>;
}
