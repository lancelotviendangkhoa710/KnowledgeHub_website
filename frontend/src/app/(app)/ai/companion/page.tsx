'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { aiCompanionClient } from '@/lib/aiCompanionClient';
import { getAccessToken } from '@/lib/authToken';
import type { AIConversation, AIMessage, MemoryType, SendMessageResult, UserMemory } from '@/types/ai';
import styles from './companion.module.css';

const LOGIN_REDIRECT = '/login?redirect=%2Fai%2Fcompanion';
const MAX_MESSAGE_LENGTH = 8000;
const STALE_CONVERSATION_MESSAGE = 'This conversation no longer exists. It may have been deleted.';
const ASSISTANT_STARTING_MESSAGE = 'The assistant is starting up. Please retry in a moment.';

type ApiError = { status?: number; message?: string; code?: string };

type SendAttempt =
  | { kind: 'ok'; result: SendMessageResult }
  | { kind: 'stale' }
  | { kind: 'unavailable' }
  | { kind: 'error'; error: unknown };

type FailedSend = {
  conversationId: string;
  content: string;
  clientMessageId: string;
};

const memoryTypeLabels: Record<MemoryType, string> = {
  preference: 'Preference',
  fact: 'Fact',
  goal: 'Goal',
};

const STARTER_PROMPTS: Array<{ label: string; prompt: string }> = [
  {
    label: 'Explain a concept',
    prompt: 'Can you explain a concept from my current course in simple terms?',
  },
  {
    label: 'Plan my study week',
    prompt: 'Help me build a realistic study plan for this week based on my learning goals.',
  },
  {
    label: 'Quiz me',
    prompt: 'Quiz me on what I have learned recently, one question at a time.',
  },
];

function Icon({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function createClientMessageId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toApiError(caught: unknown): ApiError {
  if (typeof caught === 'object' && caught !== null) {
    return caught as ApiError;
  }
  return {};
}

function isNotFoundError(apiError: ApiError): boolean {
  return apiError.status === 404 || apiError.code === 'not_found';
}

function formatRelativeTime(value: string | null): string {
  if (!value) return 'No activity';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Just now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const includeYear = date.getFullYear() !== new Date().getFullYear();
  return date.toLocaleDateString('en-US', includeYear
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' });
}

function formatMessageTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatExpiryDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function messagesLabel(count: number): string {
  return `${count} ${count === 1 ? 'message' : 'messages'}`;
}

function EmptyThread({
  hasConversation,
  onSuggestion,
}: {
  hasConversation: boolean;
  onSuggestion: (prompt: string) => void;
}) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon} aria-hidden="true">
        <Icon size={24}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Icon>
      </span>
      <h2 className={styles.emptyTitle}>
        {hasConversation ? 'How can I help you learn today?' : 'Start a new conversation'}
      </h2>
      <p className={styles.emptyText}>
        {hasConversation
          ? 'Ask about a course, untangle a concept, or plan what to study next.'
          : 'Send a message below and a new chat will be created for you automatically.'}
      </p>
      <div className={styles.suggestions} aria-label="Suggested prompts">
        {STARTER_PROMPTS.map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            className={styles.suggestion}
            onClick={() => onSuggestion(suggestion.prompt)}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AICompanionPage() {
  const router = useRouter();

  const [booting, setBooting] = useState(true);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBeforeId, setNextBeforeId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState(false);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);
  const [failedSend, setFailedSend] = useState<FailedSend | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [memoriesLoaded, setMemoriesLoaded] = useState(false);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryLoadFailed, setMemoryLoadFailed] = useState(false);
  const [memoryType, setMemoryType] = useState<MemoryType>('preference');
  const [memoryContent, setMemoryContent] = useState('');
  const [memoryExpires, setMemoryExpires] = useState('');
  const [savingMemory, setSavingMemory] = useState(false);

  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;

  const activeIdRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const creatingRef = useRef(false);
  const messageRequestRef = useRef(0);
  const skipMessagesLoadRef = useRef<string | null>(null);
  const preserveScrollRef = useRef<{ height: number; top: number } | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const memoryCloseRef = useRef<HTMLButtonElement | null>(null);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!getAccessToken()) {
      router.replace(LOGIN_REDIRECT);
      return;
    }
    void loadConversations();
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setFailedSend(null);
    setRetryNotice(null);
    if (!activeId) {
      messageRequestRef.current += 1;
      setMessages([]);
      setHasMore(false);
      setNextBeforeId(null);
      setLoadingMessages(false);
      return;
    }
    if (skipMessagesLoadRef.current === activeId) {
      skipMessagesLoadRef.current = null;
      return;
    }
    void loadMessages(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const preserved = preserveScrollRef.current;
    if (preserved) {
      preserveScrollRef.current = null;
      thread.scrollTop = preserved.top + (thread.scrollHeight - preserved.height);
      return;
    }
    if (messages.length === 0) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
  }, [messages.length, activeId]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`;
  }, [draft]);

  useEffect(() => {
    const overlayOpen = memoryOpen || sidebarOpen;
    if (!overlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [memoryOpen, sidebarOpen]);

  useEffect(() => {
    if (!memoryOpen && !sidebarOpen) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (memoryOpen) {
        setMemoryOpen(false);
        return;
      }
      setSidebarOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [memoryOpen, sidebarOpen]);

  useEffect(() => {
    if (memoryOpen) {
      memoryCloseRef.current?.focus();
    }
  }, [memoryOpen]);

  function handleApiError(caught: unknown, fallback: string): void {
    const apiError = toApiError(caught);
    if (apiError.status === 401) {
      router.replace(LOGIN_REDIRECT);
      return;
    }
    if (apiError.code === 'chat_disabled') {
      setChatDisabled(true);
      setError(null);
      return;
    }
    if (isNotFoundError(apiError)) {
      void handleStaleConversation();
      return;
    }
    setError(fallback);
  }

  async function loadConversations(isRetry = false): Promise<void> {
    if (!isRetry) setBooting(true);
    try {
      const response = await aiCompanionClient.listConversations();
      if (!mountedRef.current) return;
      setConversations(response.data);
      setActiveId((current) => {
        if (current && response.data.some((conversation) => conversation.id === current)) return current;
        return isRetry ? current : (response.data[0]?.id ?? null);
      });
    } catch (caught) {
      if (!mountedRef.current) return;
      const apiError = toApiError(caught);
      if (apiError.status === 401) {
        router.replace(LOGIN_REDIRECT);
        return;
      }
      if (isNotFoundError(apiError)) {
        setStaleNotice(true);
        if (!isRetry) {
          await loadConversations(true);
        }
        return;
      }
      setError('Unable to load your conversations. Please retry.');
    } finally {
      if (!isRetry && mountedRef.current) setBooting(false);
    }
  }

  async function refreshConversations(): Promise<void> {
    try {
      const response = await aiCompanionClient.listConversations();
      if (!mountedRef.current) return;
      setConversations(response.data);
      const current = activeIdRef.current;
      if (current && !response.data.some((conversation) => conversation.id === current)) {
        activeIdRef.current = null;
        setActiveId(null);
        setMessages([]);
        setHasMore(false);
        setNextBeforeId(null);
        setFailedSend(null);
      }
    } catch (caught) {
      if (!mountedRef.current) return;
      const apiError = toApiError(caught);
      if (apiError.status === 401) {
        router.replace(LOGIN_REDIRECT);
        return;
      }
      setError('Unable to refresh your conversations. Please retry.');
    }
  }

  async function handleStaleConversation(): Promise<void> {
    setStaleNotice(true);
    setError(null);
    await refreshConversations();
  }

  async function loadMessages(conversationId: string, beforeId?: string | null): Promise<void> {
    const requestId = messageRequestRef.current + 1;
    messageRequestRef.current = requestId;
    setLoadingMessages(true);
    try {
      const response = await aiCompanionClient.listMessages(conversationId, { beforeId: beforeId ?? null });
      if (requestId !== messageRequestRef.current || activeIdRef.current !== conversationId) return;
      if (beforeId) {
        const thread = threadRef.current;
        preserveScrollRef.current = thread
          ? { height: thread.scrollHeight, top: thread.scrollTop }
          : null;
        setMessages((current) => [...response.data, ...current]);
      } else {
        setMessages(response.data);
      }
      setHasMore(Boolean(response.meta?.has_more));
      setNextBeforeId(response.meta?.next_before_id ?? null);
    } catch (caught) {
      if (requestId !== messageRequestRef.current || activeIdRef.current !== conversationId) return;
      const apiError = toApiError(caught);
      if (isNotFoundError(apiError)) {
        await handleStaleConversation();
        return;
      }
      handleApiError(caught, 'Unable to load this conversation. Please retry.');
    } finally {
      if (requestId === messageRequestRef.current) setLoadingMessages(false);
    }
  }

  async function loadMemories(): Promise<void> {
    setMemoryLoading(true);
    setMemoryError(null);
    setMemoryLoadFailed(false);
    try {
      const response = await aiCompanionClient.listMemories();
      if (!mountedRef.current) return;
      setMemories(response.data);
      setMemoriesLoaded(true);
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.status === 401) {
        router.replace(LOGIN_REDIRECT);
        return;
      }
      setMemoryError('Unable to load your memories. Please retry.');
      setMemoryLoadFailed(true);
    } finally {
      if (mountedRef.current) setMemoryLoading(false);
    }
  }

  async function createConversation(): Promise<AIConversation | null> {
    if (creatingRef.current) return null;
    creatingRef.current = true;
    setCreating(true);
    setError(null);
    try {
      const response = await aiCompanionClient.createConversation();
      const conversation = response.data;
      setConversations((current) => [
        conversation,
        ...current.filter((entry) => entry.id !== conversation.id),
      ]);
      skipMessagesLoadRef.current = conversation.id;
      activeIdRef.current = conversation.id;
      setActiveId(conversation.id);
      setMessages([]);
      setHasMore(false);
      setNextBeforeId(null);
      setFailedSend(null);
      setRetryNotice(null);
      setSidebarOpen(false);
      return conversation;
    } catch (caught) {
      handleApiError(caught, 'Unable to create a conversation. Please retry.');
      return null;
    } finally {
      creatingRef.current = false;
      if (mountedRef.current) setCreating(false);
    }
  }

  function selectConversation(conversation: AIConversation): void {
    if (activeIdRef.current !== conversation.id) {
      setMessages([]);
      setHasMore(false);
      setNextBeforeId(null);
    }
    activeIdRef.current = conversation.id;
    setActiveId(conversation.id);
    setSidebarOpen(false);
    setError(null);
  }

  function startRename(conversation: AIConversation): void {
    setRenamingId(conversation.id);
    setRenameValue(conversation.title ?? '');
    if (window.matchMedia('(max-width: 960px)').matches) {
      setSidebarOpen(true);
    }
    setError(null);
  }

  async function saveRename(event: FormEvent, conversationId: string): Promise<void> {
    event.preventDefault();
    const title = renameValue.trim();
    const existingTitle = conversations.find((conversation) => conversation.id === conversationId)?.title ?? '';
    if (!title || title === existingTitle) {
      setRenamingId(null);
      return;
    }
    try {
      const response = await aiCompanionClient.updateConversation(conversationId, title);
      const nextTitle = response.data.title ?? title;
      setConversations((current) => current.map((conversation) => (
        conversation.id === conversationId ? { ...conversation, title: nextTitle } : conversation
      )));
      setRenamingId(null);
    } catch (caught) {
      const apiError = toApiError(caught);
      if (isNotFoundError(apiError)) {
        setRenamingId(null);
        await handleStaleConversation();
        return;
      }
      handleApiError(caught, 'Unable to rename this conversation. Please retry.');
    }
  }

  async function deleteConversation(conversation: AIConversation): Promise<void> {
    if (!window.confirm(`Delete conversation "${conversation.title ?? 'Untitled chat'}" and its messages?`)) {
      return;
    }
    setError(null);
    try {
      await aiCompanionClient.deleteConversation(conversation.id);
      const remaining = conversations.filter((entry) => entry.id !== conversation.id);
      setConversations(remaining);
      if (activeIdRef.current === conversation.id) {
        const next = remaining[0] ?? null;
        activeIdRef.current = next?.id ?? null;
        setActiveId(next?.id ?? null);
        setMessages([]);
        setHasMore(false);
        setNextBeforeId(null);
        setFailedSend(null);
        setRetryNotice(null);
      }
    } catch (caught) {
      const apiError = toApiError(caught);
      if (isNotFoundError(apiError)) {
        await handleStaleConversation();
        return;
      }
      handleApiError(caught, 'Unable to delete this conversation. Please retry.');
    }
  }

  async function attemptSend(
    conversationId: string,
    content: string,
    clientMessageId: string,
  ): Promise<SendAttempt> {
    try {
      const response = await aiCompanionClient.sendMessage(conversationId, content, clientMessageId);
      return { kind: 'ok', result: response.data };
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === 'chat_disabled') return { kind: 'error', error: caught };
      if (isNotFoundError(apiError)) return { kind: 'stale' };
      if (apiError.status === 502 || apiError.status === 503) return { kind: 'unavailable' };
      return { kind: 'error', error: caught };
    }
  }

  function waitForRetry(): Promise<void> {
    return new Promise((resolve) => {
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        resolve();
      }, 2000);
    });
  }

  function applySendSuccess(
    conversationId: string,
    optimisticId: string,
    content: string,
    result: SendMessageResult,
  ): void {
    if (activeIdRef.current === conversationId) {
      setMessages((current) => [
        ...current.filter((message) => (
          message.id !== optimisticId
          && message.id !== result.user_message.id
          && message.id !== result.assistant_message.id
        )),
        result.user_message,
        result.assistant_message,
      ]);
    }
    setConversations((current) => current.map((conversation) => (
      conversation.id === conversationId
        ? {
            ...conversation,
            title: conversation.title ?? content.slice(0, 80),
            messages_count: (conversation.messages_count ?? 0) + 2,
            updated_at: new Date().toISOString(),
          }
        : conversation
    )));
  }

  async function submitMessage(
    rawContent: string,
    options: { conversationId?: string; clientMessageId?: string } = {},
  ): Promise<void> {
    const content = rawContent.trim();
    if (!content || sendingRef.current || creatingRef.current || chatDisabled) return;
    if (content.length > MAX_MESSAGE_LENGTH) {
      setError('Messages must be 8000 characters or fewer.');
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError(null);
    setRetryNotice(null);
    setFailedSend(null);

    let conversationId = options.conversationId ?? activeIdRef.current;
    let optimisticId: string | null = null;

    try {
      if (!conversationId) {
        const created = await createConversation();
        if (!created) return;
        conversationId = created.id;
      }

      const clientMessageId = options.clientMessageId ?? createClientMessageId();
      optimisticId = `pending-${clientMessageId}`;
      const optimistic: AIMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        role: 'user',
        content,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setDraft('');
      if (activeIdRef.current === conversationId) {
        setMessages((current) => [...current, optimistic]);
      }

      let outcome = await attemptSend(conversationId, content, clientMessageId);
      if (outcome.kind === 'unavailable') {
        setRetryNotice(ASSISTANT_STARTING_MESSAGE);
        if (mountedRef.current) {
          await waitForRetry();
        }
        if (!mountedRef.current) return;
        outcome = await attemptSend(conversationId, content, clientMessageId);
      }

      if (outcome.kind === 'ok') {
        applySendSuccess(conversationId, optimisticId, content, outcome.result);
        setRetryNotice(null);
        setFailedSend(null);
        return;
      }

      setMessages((current) => current.filter((message) => message.id !== optimisticId));

      if (outcome.kind === 'stale') {
        setFailedSend(null);
        setRetryNotice(null);
        setDraft((current) => current || content);
        await handleStaleConversation();
        return;
      }

      if (activeIdRef.current !== conversationId) {
        setRetryNotice(null);
        if (outcome.kind === 'unavailable') {
          setError('Your last message could not be sent. Open that conversation and try again.');
        } else {
          handleApiError(outcome.kind === 'error' ? outcome.error : null, 'Unable to send your message. Please retry.');
        }
        return;
      }

      if (outcome.kind === 'unavailable') {
        setFailedSend({ conversationId, content, clientMessageId });
        setRetryNotice(ASSISTANT_STARTING_MESSAGE);
        setDraft((current) => current || content);
        return;
      }

      setRetryNotice(null);
      setDraft((current) => current || content);
      handleApiError(outcome.kind === 'error' ? outcome.error : null, 'Unable to send your message. Nothing was saved; please retry.');
    } catch (caught) {
      if (optimisticId) {
        setMessages((current) => current.filter((message) => message.id !== optimisticId));
      }
      handleApiError(caught, 'Unable to send your message. Please retry.');
    } finally {
      sendingRef.current = false;
      if (mountedRef.current) setSending(false);
    }
  }

  function handleSend(event: FormEvent): void {
    event.preventDefault();
    void submitMessage(draft);
  }

  function handleComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (sendingRef.current || creatingRef.current || chatDisabled) return;
    if (!draft.trim()) return;
    void submitMessage(draft);
  }

  function retryFailedSend(): void {
    if (!failedSend || sendingRef.current || creatingRef.current) return;
    if (failedSend.conversationId !== activeIdRef.current) return;
    const { conversationId, content, clientMessageId } = failedSend;
    setFailedSend(null);
    void submitMessage(content, { conversationId, clientMessageId });
  }

  function fillComposer(prompt: string): void {
    setDraft(prompt);
    setError(null);
    textareaRef.current?.focus();
  }

  async function addMemory(event: FormEvent): Promise<void> {
    event.preventDefault();
    const content = memoryContent.trim();
    if (!content || savingMemory) return;
    setSavingMemory(true);
    setMemoryError(null);
    try {
      const response = await aiCompanionClient.createMemory({
        memory_type: memoryType,
        content,
        expires_at: memoryExpires ? new Date(`${memoryExpires}T23:59:59Z`).toISOString() : null,
      });
      setMemories((current) => [response.data, ...current]);
      setMemoriesLoaded(true);
      setMemoryContent('');
      setMemoryExpires('');
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.status === 401) {
        router.replace(LOGIN_REDIRECT);
        return;
      }
      setMemoryError('Unable to save this memory. Please retry.');
    } finally {
      setSavingMemory(false);
    }
  }

  async function removeMemory(memory: UserMemory): Promise<void> {
    if (!window.confirm('Delete this memory? It will no longer be used by the AI companion.')) return;
    setMemoryError(null);
    try {
      await aiCompanionClient.deleteMemory(memory.id);
      setMemories((current) => current.filter((entry) => entry.id !== memory.id));
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.status === 401) {
        router.replace(LOGIN_REDIRECT);
        return;
      }
      if (isNotFoundError(apiError)) {
        setMemories((current) => current.filter((entry) => entry.id !== memory.id));
        setMemoryError('That memory no longer exists. It may have been deleted.');
        return;
      }
      setMemoryError('Unable to delete this memory. Please retry.');
    }
  }

  function toggleMemoryPanel(): void {
    const nextOpen = !memoryOpen;
    setMemoryOpen(nextOpen);
    if (nextOpen) {
      setSidebarOpen(false);
      if (!memoriesLoaded && !memoryLoading) {
        void loadMemories();
      }
    }
  }

  if (booting) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingShell}>
          <div className={styles.loadingCard} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <p className={styles.loadingText}>Loading your AI companion…</p>
          </div>
        </div>
      </div>
    );
  }

  const composerDisabled = sending || creating || chatDisabled;
  const canSend = !composerDisabled && draft.trim().length > 0;
  const composerPlaceholder = chatDisabled
    ? 'AI chat is not enabled yet.'
    : active
      ? 'Message the AI Companion…'
      : 'Ask anything to start a new chat…';
  const showRetryAction = Boolean(failedSend && failedSend.conversationId === activeId);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {sidebarOpen && (
          <div
            className={styles.sidebarOverlay}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          id="companion-sidebar"
          className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
          aria-label="Conversations"
        >
          <div className={styles.sidebarHeader}>
            <div className={styles.brand}>
              <span className={styles.brandMark} aria-hidden="true">
                <Icon size={17}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </Icon>
              </span>
              <span className={styles.brandText}>
                <strong className={styles.brandTitle}>AI Companion</strong>
                <span className={styles.brandSubtitle}>Your learning copilot</span>
              </span>
            </div>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.sidebarClose}`}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close conversation list"
            >
              <Icon size={16}>
                <path d="M18 6 6 18M6 6l12 12" />
              </Icon>
            </button>
          </div>

          <button
            type="button"
            className={styles.newChatButton}
            onClick={() => void createConversation()}
            disabled={creating}
          >
            <Icon size={16}>
              <path d="M12 5v14M5 12h14" />
            </Icon>
            {creating ? 'Creating…' : 'New chat'}
          </button>

          <div className={styles.conversations}>
            {conversations.length === 0 ? (
              <div className={styles.sidebarEmpty}>
                <p className={styles.sidebarEmptyTitle}>No conversations yet</p>
                <p className={styles.sidebarEmptyText}>Start a new chat to see it here.</p>
              </div>
            ) : (
              <ul className={styles.conversationList}>
                {conversations.map((conversation) => {
                  const isActive = activeId === conversation.id;
                  return (
                    <li
                      key={conversation.id}
                      className={`${styles.conversationItem} ${isActive ? styles.conversationItemActive : ''}`}
                    >
                      {renamingId === conversation.id ? (
                        <form
                          className={styles.renameForm}
                          onSubmit={(event) => void saveRename(event, conversation.id)}
                        >
                          <label className={styles.srOnly} htmlFor={`rename-${conversation.id}`}>
                            Conversation title
                          </label>
                          <input
                            id={`rename-${conversation.id}`}
                            className={styles.renameInput}
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') {
                                event.preventDefault();
                                setRenamingId(null);
                              }
                            }}
                            maxLength={120}
                            autoFocus
                          />
                          <div className={styles.renameActions}>
                            <button type="submit" className={styles.smallPrimaryButton}>Save</button>
                            <button
                              type="button"
                              className={styles.smallSecondaryButton}
                              onClick={() => setRenamingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={styles.conversationButton}
                            onClick={() => selectConversation(conversation)}
                            aria-pressed={isActive}
                          >
                            <span className={styles.conversationTitle}>
                              {conversation.title ?? 'Untitled chat'}
                            </span>
                            <span className={styles.conversationMeta}>
                              <span>{messagesLabel(conversation.messages_count ?? 0)}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatRelativeTime(conversation.updated_at ?? conversation.created_at)}</span>
                            </span>
                          </button>
                          <div className={styles.conversationActions}>
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => startRename(conversation)}
                              aria-label={`Rename ${conversation.title ?? 'untitled chat'}`}
                            >
                              <Icon size={14}>
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                              </Icon>
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                              onClick={() => void deleteConversation(conversation)}
                              aria-label={`Delete ${conversation.title ?? 'untitled chat'}`}
                            >
                              <Icon size={14}>
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                              </Icon>
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={styles.sidebarFooter}>
            Chats are private to your account.
          </div>
        </aside>

        <section className={styles.chatPanel} aria-label="Chat with AI Companion">
          <header className={styles.chatHeader}>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.sidebarToggle}`}
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label="Open conversation list"
              aria-expanded={sidebarOpen}
              aria-controls="companion-sidebar"
            >
              <Icon size={18}>
                <path d="M3 6h18M3 12h18M3 18h18" />
              </Icon>
            </button>

            <div className={styles.chatHeading}>
              <h1 className={styles.chatTitle}>
                {active ? (active.title ?? 'Untitled chat') : 'AI Companion'}
              </h1>
              <p className={styles.chatSubtitle}>
                {active
                  ? `${messagesLabel(active.messages_count ?? messages.length)} · Updated ${formatRelativeTime(active.updated_at ?? active.created_at)}`
                  : 'Ask a question to begin a new chat'}
              </p>
            </div>

            <div className={styles.chatActions}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={toggleMemoryPanel}
                aria-expanded={memoryOpen}
                aria-controls="memory-drawer"
                aria-label="Open memory panel"
              >
                <Icon size={15}>
                  <rect x="7" y="7" width="10" height="10" rx="2" />
                  <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
                </Icon>
                <span className={styles.actionLabel}>Memory</span>
                {memories.length > 0 && <span className={styles.countBadge}>{memories.length}</span>}
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => { if (active) startRename(active); }}
                disabled={!active}
                aria-label="Rename current conversation"
              >
                <Icon size={15}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                </Icon>
                <span className={styles.actionLabel}>Rename</span>
              </button>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                onClick={() => { if (active) void deleteConversation(active); }}
                disabled={!active}
                aria-label="Delete current conversation"
              >
                <Icon size={15}>
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </Icon>
                <span className={styles.actionLabel}>Delete</span>
              </button>
            </div>
          </header>

          {(staleNotice || error || retryNotice || chatDisabled) && (
            <div className={styles.noticeStack} aria-live="polite">
              {staleNotice && (
                <div className={`${styles.notice} ${styles.noticeWarning}`} role="alert">
                  <span className={styles.noticeText}>{STALE_CONVERSATION_MESSAGE}</span>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => setStaleNotice(false)}
                    aria-label="Dismiss conversation notice"
                  >
                    <Icon size={14}>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </Icon>
                  </button>
                </div>
              )}

              {error && (
                <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
                  <span className={styles.noticeText}>{error}</span>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => setError(null)}
                    aria-label="Dismiss error"
                  >
                    <Icon size={14}>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </Icon>
                  </button>
                </div>
              )}

              {retryNotice && (
                <div className={`${styles.notice} ${styles.noticeWarning}`} role="status">
                  <span className={styles.noticeText}>{retryNotice}</span>
                  {showRetryAction && (
                    <button
                      type="button"
                      className={styles.smallPrimaryButton}
                      onClick={retryFailedSend}
                      disabled={sending || creating}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {chatDisabled && (
                <div className={styles.notice} role="status">
                  <span className={styles.noticeText}>
                    AI chat is not enabled yet on this platform. You can still review history and manage memories.
                  </span>
                </div>
              )}
            </div>
          )}

          <div
            ref={threadRef}
            className={styles.thread}
            role="log"
            aria-live="polite"
            aria-label="Conversation messages"
            tabIndex={0}
          >
            <div className={styles.threadInner}>
              {active && hasMore && (
                <button
                  type="button"
                  className={styles.loadEarlierButton}
                  onClick={() => void loadMessages(active.id, nextBeforeId)}
                  disabled={loadingMessages}
                >
                  <Icon size={14}>
                    <path d="M18 15l-6-6-6 6" />
                  </Icon>
                  {loadingMessages ? 'Loading…' : 'Load earlier messages'}
                </button>
              )}

              {loadingMessages && messages.length === 0 ? (
                <div className={styles.threadLoading} role="status">
                  <span className={styles.spinner} aria-hidden="true" />
                  <span>Loading conversation…</span>
                </div>
              ) : messages.length === 0 ? (
                <EmptyThread hasConversation={Boolean(active)} onSuggestion={fillComposer} />
              ) : (
                <ul className={styles.messageList}>
                  {messages.map((message) => {
                    const isUser = message.role === 'user';
                    const isPending = message.id.startsWith('pending-');
                    return (
                      <li
                        key={message.id}
                        className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}
                      >
                        {!isUser && (
                          <span className={styles.avatar} aria-hidden="true">AI</span>
                        )}
                        <div className={`${styles.messageBody} ${isUser ? styles.messageBodyUser : ''}`}>
                          <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
                            {message.content}
                          </div>
                          <div className={styles.messageMeta}>
                            <span>{isUser ? 'You' : 'AI Companion'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{isPending ? 'Sending…' : formatMessageTime(message.created_at)}</span>
                            {isPending && <span className={styles.pendingDot} aria-hidden="true" />}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className={styles.composerArea}>
            <form className={styles.composer} onSubmit={handleSend}>
              <label className={styles.srOnly} htmlFor="ai-companion-message">
                Message the AI companion
              </label>
              <textarea
                id="ai-companion-message"
                ref={textareaRef}
                className={styles.textarea}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={composerDisabled}
                placeholder={composerPlaceholder}
                aria-describedby="ai-companion-helper"
              />
              <div className={styles.composerToolbar}>
                <span className={styles.composerHint}>Enter to send · Shift+Enter for a new line</span>
                <span className={styles.charCount}>{draft.length}/{MAX_MESSAGE_LENGTH}</span>
                <button
                  type="submit"
                  className={styles.sendButton}
                  aria-label="Send message"
                  disabled={!canSend}
                >
                  {sending ? (
                    <span className={styles.spinnerSmall} aria-hidden="true" />
                  ) : (
                    <Icon size={18}>
                      <path d="M12 19V5" />
                      <path d="M5 12l7-7 7 7" />
                    </Icon>
                  )}
                </button>
              </div>
            </form>
            <p id="ai-companion-helper" className={styles.helperText}>
              AI Companion can make mistakes. Check important information against your course material.
            </p>
          </div>
        </section>
      </div>

      {memoryOpen && (
        <>
          <div
            className={styles.drawerOverlay}
            onClick={() => setMemoryOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="memory-drawer"
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="memory-drawer-title"
          >
            <header className={styles.drawerHeader}>
              <div>
                <h2 id="memory-drawer-title" className={styles.drawerTitle}>Memory</h2>
                <p className={styles.drawerSubtitle}>
                  Only memories you add explicitly are saved. The companion never extracts memories on its own.
                </p>
              </div>
              <button
                type="button"
                ref={memoryCloseRef}
                className={styles.iconButton}
                onClick={() => setMemoryOpen(false)}
                aria-label="Close memory panel"
              >
                <Icon size={16}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </Icon>
              </button>
            </header>

            <div className={styles.drawerBody}>
              <form className={styles.memoryForm} onSubmit={(event) => void addMemory(event)}>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    Memory type
                    <select
                      value={memoryType}
                      onChange={(event) => setMemoryType(event.target.value as MemoryType)}
                    >
                      {(Object.keys(memoryTypeLabels) as MemoryType[]).map((type) => (
                        <option key={type} value={type}>{memoryTypeLabels[type]}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Expires on (optional)
                    <input
                      type="date"
                      value={memoryExpires}
                      onChange={(event) => setMemoryExpires(event.target.value)}
                    />
                  </label>
                </div>
                <label className={styles.field}>
                  Memory content
                  <textarea
                    required
                    maxLength={1000}
                    rows={3}
                    value={memoryContent}
                    onChange={(event) => setMemoryContent(event.target.value)}
                    placeholder="e.g. I prefer hands-on projects before theory."
                  />
                </label>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={savingMemory || !memoryContent.trim()}
                >
                  {savingMemory ? 'Saving…' : 'Add memory'}
                </button>
              </form>

              {memoryError && (
                <div className={styles.memoryError} role="alert">
                  <span>{memoryError}</span>
                  {memoryLoadFailed && (
                    <button
                      type="button"
                      className={styles.smallSecondaryButton}
                      onClick={() => void loadMemories()}
                      disabled={memoryLoading}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {memoryLoading ? (
                <div className={styles.memoryLoading} role="status">
                  <span className={styles.spinner} aria-hidden="true" />
                  <span>Loading memories…</span>
                </div>
              ) : memories.length === 0 ? (
                <div className={styles.memoryEmpty}>
                  <p className={styles.memoryEmptyTitle}>No memories yet</p>
                  <p className={styles.memoryEmptyText}>
                    Add a preference, fact, or goal above and the companion will keep it in mind.
                  </p>
                </div>
              ) : (
                <ul className={styles.memoryList}>
                  {memories.map((memory) => (
                    <li key={memory.id} className={styles.memoryCard}>
                      <div className={styles.memoryBody}>
                        <span className={styles.memoryBadge}>{memoryTypeLabels[memory.memory_type]}</span>
                        <p className={styles.memoryContent}>{memory.content}</p>
                        {memory.expires_at && (
                          <small className={styles.memoryExpiry}>
                            Expires {formatExpiryDate(memory.expires_at)}
                          </small>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                        onClick={() => void removeMemory(memory)}
                        aria-label="Delete memory"
                      >
                        <Icon size={14}>
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                        </Icon>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
