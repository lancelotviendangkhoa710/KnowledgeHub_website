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

export const aiCompanionClient = {
  listConversations: (page = 1) =>
    api.get<PaginatedEnvelope<AIConversation>>(`/ai/conversations?page=${page}`),

  createConversation: (title?: string) =>
    api.post<ApiEnvelope<AIConversation>>('/ai/conversations', title ? { title } : {}),

  updateConversation: (id: string, title: string) =>
    api.patch<ApiEnvelope<AIConversation>>(`/ai/conversations/${encodeURIComponent(id)}`, { title }),

  deleteConversation: (id: string) =>
    api.delete<{ status: 'success'; message?: string }>(`/ai/conversations/${encodeURIComponent(id)}`),

  listMessages: (conversationId: string, options: { limit?: number; beforeId?: string | null } = {}) => {
    const params = new URLSearchParams();
    params.set('limit', String(options.limit ?? 30));
    if (options.beforeId) params.set('before_id', options.beforeId);
    return api.get<MessagePageEnvelope>(`${messagesPath(conversationId)}?${params.toString()}`);
  },

  sendMessage: (conversationId: string, content: string, clientMessageId?: string) =>
    api.post<ApiEnvelope<SendMessageResult>>(messagesPath(conversationId), {
      content,
      ...(clientMessageId ? { client_message_id: clientMessageId } : {}),
    }),

  listMemories: () => api.get<ApiEnvelope<UserMemory[]>>('/ai/memories'),

  createMemory: (input: { memory_type: MemoryType; content: string; expires_at?: string | null }) =>
    api.post<ApiEnvelope<UserMemory>>('/ai/memories', input),

  updateMemory: (id: string, input: { content?: string; expires_at?: string | null }) =>
    api.patch<ApiEnvelope<UserMemory>>(`/ai/memories/${encodeURIComponent(id)}`, input),

  deleteMemory: (id: string) =>
    api.delete<{ status: 'success'; message?: string }>(`/ai/memories/${encodeURIComponent(id)}`),
};

export type { AIConversation, AIMessage, UserMemory };
