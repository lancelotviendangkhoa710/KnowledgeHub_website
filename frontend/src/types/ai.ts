export type AICompanionRole = 'user' | 'assistant';

export type MemoryType = 'preference' | 'fact' | 'goal';

export type MemoryStatus = 'active' | 'superseded' | 'expired' | 'deleted';

export interface AIConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
  messages_count?: number;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: AICompanionRole;
  content: string;
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
}

export interface UserMemory {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  content: string;
  status: MemoryStatus;
  source_message_id: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiEnvelope<T> {
  status: 'success';
  message?: string;
  data: T;
}

export interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> {
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface MessagePageEnvelope extends ApiEnvelope<AIMessage[]> {
  meta?: {
    has_more: boolean;
    next_before_id: string | null;
  };
}

export interface SendMessageResult {
  user_message: AIMessage;
  assistant_message: AIMessage;
}
