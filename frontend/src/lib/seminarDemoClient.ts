import { api } from '@/lib/api';

export type BaselineCitation = { page: number; excerpt: string };
export type CvCitation = {
  cv_id: string;
  cv_version: string;
  page: number;
  excerpt: string;
  chunk_id: string;
  embedding_model: string;
  embedding_revision: string;
  similarity: number;
};

export type CvRagStatus = {
  cv: null | { id: string; filename: string; size_bytes: number; consented_at: string; created_at: string };
  index: null | {
    status: 'pending' | 'ready' | 'failed';
    embedding_model: string;
    embedding_revision: string;
    embedding_dimensions: number;
    indexed_at: string | null;
  };
};

type Envelope<T> = { status: 'success'; message?: string; data: T };
type Message = { content: string; metadata?: { citations?: CvCitation[] } | null };

export type DemoError = { status?: number; code?: string; message?: string };

export const seminarDemoClient = {
  async askBaseline(file: File, question: string) {
    const response = await fetch(`/rag-lite/ask?question=${encodeURIComponent(question)}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/pdf' },
      body: file,
    });
    const payload = await response.json().catch(() => ({})) as {
      answer?: string;
      citations?: BaselineCitation[];
      chunks_used?: number;
      detail?: { code?: string };
    };
    if (!response.ok) {
      throw { status: response.status, code: payload.detail?.code, message: payload.detail?.code } satisfies DemoError;
    }
    return {
      answer: payload.answer ?? '',
      citations: payload.citations ?? [],
      chunksUsed: payload.chunks_used ?? 0,
    };
  },

  getCvRagStatus: () => api.get<Envelope<CvRagStatus>>('/ai/cv/rag-status'),

  createConversation: () => api.post<Envelope<{ id: string }>>('/ai/conversations', {
    title: 'Seminar CV-RAG Demo',
  }),

  sendCvQuestion: (conversationId: string, content: string) =>
    api.post<Envelope<{ user_message: Message; assistant_message: Message }>>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
      { content, mode: 'cv', client_message_id: crypto.randomUUID() },
    ),
};
