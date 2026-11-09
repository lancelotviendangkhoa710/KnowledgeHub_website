import { api } from '@/lib/api';
import type {
  AIConversation,
  AIMessage,
  ApiEnvelope,
  MemoryType,
  MessagePageEnvelope,
  PaginatedEnvelope,
  SendMessageResult,
  UserMemory,
} from '@/types/ai';

function messagesPath(conversationId: string): string {
  return `/ai/conversations/${encodeURIComponent(conversationId)}/messages`;
}

/**
 * `api.ts` spreads the parsed error body after the numeric HTTP status. AI
 * endpoints return `{ status: 'error', ... }`, which would otherwise replace
 * the numeric status and hide 404/502/503 from callers. Restore a numeric
 * status from the stable error envelope so resilience handling can react.
 */
function normalizeApiError(caught: unknown): never {
  if (typeof caught === 'object' && caught !== null) {
    const raw = caught as Record<string, unknown>;
    if (raw.status === 'error') {
      const code = typeof raw.code === 'string' ? raw.code : '';
      const message = typeof raw.message === 'string' ? raw.message : '';
      const status = code === 'not_found'
        ? 404
        : code === 'chat_disabled'
          ? 503
          : /too many|rate limit/i.test(message)
            ? 429
            : 502;
      throw { ...raw, status };
    }
  }
  throw caught;
}

async function requestWithStatus<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (caught) {
    return normalizeApiError(caught);
  }
}

export const aiCompanionClient = {
  listConversations: (page = 1) =>
    requestWithStatus(api.get<PaginatedEnvelope<AIConversation>>(`/ai/conversations?page=${page}`)),

  createConversation: (title?: string) =>
    requestWithStatus(api.post<ApiEnvelope<AIConversation>>('/ai/conversations', title ? { title } : {})),

  updateConversation: (id: string, title: string) =>
    requestWithStatus(api.patch<ApiEnvelope<AIConversation>>(`/ai/conversations/${encodeURIComponent(id)}`, { title })),

  deleteConversation: (id: string) =>
    requestWithStatus(api.delete<{ status: 'success'; message?: string }>(`/ai/conversations/${encodeURIComponent(id)}`)),

  listMessages: (conversationId: string, options: { limit?: number; beforeId?: string | null } = {}) => {
    const params = new URLSearchParams();
    params.set('limit', String(options.limit ?? 30));
    if (options.beforeId) params.set('before_id', options.beforeId);
    return requestWithStatus(api.get<MessagePageEnvelope>(`${messagesPath(conversationId)}?${params.toString()}`));
  },

  sendMessage: (conversationId: string, content: string, clientMessageId?: string) =>
    requestWithStatus(api.post<ApiEnvelope<SendMessageResult>>(messagesPath(conversationId), {
      content,
      ...(clientMessageId ? { client_message_id: clientMessageId } : {}),
    })),

  listMemories: () => requestWithStatus(api.get<ApiEnvelope<UserMemory[]>>('/ai/memories')),

  createMemory: (input: { memory_type: MemoryType; content: string; expires_at?: string | null }) =>
    requestWithStatus(api.post<ApiEnvelope<UserMemory>>('/ai/memories', input)),

  updateMemory: (id: string, input: { content?: string; expires_at?: string | null }) =>
    requestWithStatus(api.patch<ApiEnvelope<UserMemory>>(`/ai/memories/${encodeURIComponent(id)}`, input)),

  deleteMemory: (id: string) =>
    requestWithStatus(api.delete<{ status: 'success'; message?: string }>(`/ai/memories/${encodeURIComponent(id)}`)),
};

export type { AIConversation, AIMessage, UserMemory };
