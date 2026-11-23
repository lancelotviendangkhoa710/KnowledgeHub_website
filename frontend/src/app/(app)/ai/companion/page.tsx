'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { aiCompanionClient } from '@/lib/aiCompanionClient';
import RoadmapForm from '@/components/learning/RoadmapForm';
import { LogoMark } from '@/components/layout/Logo';
import AssistantMarkdown from '@/components/ai/AssistantMarkdown';
import { getAccessToken } from '@/lib/authToken';
import { aiRoadmapClient } from '@/lib/aiRoadmapClient';
import type { ConversationMode, NotebookDocument } from '@/lib/aiRoadmapClient';
import type { AIConversation, AIMessage, SendMessageResult } from '@/types/ai';
import styles from './companion.module.css';

const MOBILE_QUERY = '(max-width: 980px)';
const LOGIN_REDIRECT = '/login?redirect=%2Fai%2Fcompanion';
const MAX_MESSAGE_LENGTH = 8000;
const NOTEBOOK_SESSION_KEY = 'knowledgehub:active-notebook';
const STALE_CONVERSATION_MESSAGE = 'Cuộc trò chuyện này không còn tồn tại, có thể đã bị xóa.';
const ASSISTANT_STARTING_MESSAGE = 'Trợ lý đang khởi động, vui lòng thử lại sau ít phút.';

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
  mode: 'chat' | 'cv';
};
type CompanionConversation = AIConversation & { mode: ConversationMode };

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
  if (!value) return 'Chưa có hoạt động';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Vừa xong';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  const includeYear = date.getFullYear() !== new Date().getFullYear();
  return date.toLocaleDateString('vi-VN', includeYear
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' });
}

function formatMessageTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString('vi-VN', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleString('vi-VN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function messagesLabel(count: number): string {
  return `${count} tin nhắn`;
}

function conversationLabel(conversation: CompanionConversation | null): string {
  if (!conversation?.title) return conversation?.mode === 'notebook' ? 'Notebook mới' : 'Cuộc trò chuyện mới';
  return conversation.title;
}

function citationsFor(message: AIMessage): Array<{ filename: string; page: number }> {
  const citations = message.metadata?.citations;
  if (!Array.isArray(citations)) return [];
  return citations.filter((citation): citation is { filename: string; page: number } => (
    typeof citation === 'object' && citation !== null
    && typeof citation.filename === 'string' && typeof citation.page === 'number'
  )).filter((citation, index, all) => all.findIndex((entry) => entry.filename === citation.filename && entry.page === citation.page) === index);
}

export default function AICompanionPage() {
  const router = useRouter();

  const [booting, setBooting] = useState(true);
  const [conversations, setConversations] = useState<CompanionConversation[]>([]);
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
  const [roadmapMode, setRoadmapMode] = useState(false);
  const [notebookMode, setNotebookMode] = useState(false);
  const [notebookDocuments, setNotebookDocuments] = useState<NotebookDocument[]>([]);
  const [selectedNotebookDocumentIds, setSelectedNotebookDocumentIds] = useState<string[]>([]);
  const [notebookFiles, setNotebookFiles] = useState<Record<string, File>>({});
  const [notebookBusy, setNotebookBusy] = useState(false);
  const [notebookSourcesOpen, setNotebookSourcesOpen] = useState(false);
  const [notebookError, setNotebookError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;

  const activeIdRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const creatingRef = useRef(false);
  const messageRequestRef = useRef(0);
  const skipMessagesLoadRef = useRef<string | null>(null);
  const preserveScrollRef = useRef<{ height: number; top: number } | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const roadmapReturnScrollRef = useRef<number | null>(null);
  const roadmapPaneRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const aiRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notebookRequestVersionRef = useRef(0);
  const notebookSelectionInitializedRef = useRef(false);
  const restoredNotebookIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (roadmapMode) roadmapPaneRef.current?.scrollTo({ top: 0 });
    else if (roadmapReturnScrollRef.current !== null && threadRef.current) {
      threadRef.current.scrollTop = roadmapReturnScrollRef.current;
      roadmapReturnScrollRef.current = null;
    }
  }, [roadmapMode]);

  // Chiều cao header đổi theo khổ màn hình (nav xuống dòng trên điện thoại) nên đo thực tế thay vì dùng --head.
  useEffect(() => {
    const el = aiRef.current;
    if (!el) return;
    const measure = () => el.style.setProperty('--ai-offset', `${el.getBoundingClientRect().top + window.scrollY}px`);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [booting]);

  useEffect(() => {
    mountedRef.current = true;
    if (!getAccessToken()) {
      router.replace(LOGIN_REDIRECT);
      return;
    }
    const initialMode: ConversationMode = new URLSearchParams(window.location.search).get('mode') === 'notebook'
      ? 'notebook' : 'chat';
    restoredNotebookIdRef.current = window.sessionStorage.getItem(NOTEBOOK_SESSION_KEY);
    if (initialMode === 'notebook') setNotebookMode(true);
    void loadConversations(initialMode);
    // Ẩn chân trang ở màn này (quy tắc body[data-screen] trong globals.css).
    document.body.dataset.screen = 'tro-ly';
    return () => {
      delete document.body.dataset.screen;
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
  }, [activeId, notebookMode]);

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
    const overlayOpen = sidebarOpen;
    if (!overlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setSidebarOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

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

  async function loadConversations(mode: ConversationMode, isRetry = false): Promise<void> {
    if (!isRetry) setBooting(true);
    try {
      const response = await aiRoadmapClient.listConversations(mode);
      if (!mountedRef.current) return;
      const nextConversations = response.data as CompanionConversation[];
      setConversations(nextConversations);
      const preferredId = mode === 'notebook' ? restoredNotebookIdRef.current : activeIdRef.current;
      const nextId = preferredId && nextConversations.some((conversation) => conversation.id === preferredId)
        ? preferredId
        : (mode === 'notebook' || isRetry ? null : nextConversations[0]?.id ?? null);
      activeIdRef.current = nextId;
      setActiveId(nextId);
      if (mode === 'notebook' && nextId) void refreshNotebook(nextId);
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
          await loadConversations(mode, true);
        }
        return;
      }
      setError('Không tải được danh sách cuộc trò chuyện. Vui lòng thử lại.');
    } finally {
      if (!isRetry && mountedRef.current) setBooting(false);
    }
  }

  async function refreshConversations(): Promise<void> {
    const mode: ConversationMode = notebookMode ? 'notebook' : 'chat';
    try {
      const response = await aiRoadmapClient.listConversations(mode);
      if (!mountedRef.current) return;
      const nextConversations = response.data as CompanionConversation[];
      setConversations(nextConversations);
      const current = activeIdRef.current;
      if (current && !nextConversations.some((conversation) => conversation.id === current)) {
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
      setError('Không làm mới được danh sách cuộc trò chuyện. Vui lòng thử lại.');
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
      handleApiError(caught, 'Không tải được cuộc trò chuyện này. Vui lòng thử lại.');
    } finally {
      if (requestId === messageRequestRef.current) setLoadingMessages(false);
    }
  }

  async function createConversation(mode: ConversationMode = notebookMode ? 'notebook' : 'chat'): Promise<CompanionConversation | null> {
    if (creatingRef.current) return null;
    creatingRef.current = true;
    setCreating(true);
    setError(null);
    try {
      const response = await aiRoadmapClient.createConversation({ mode, title: null });
      const conversation = response.data as CompanionConversation;
      setConversations((current) => [
        conversation,
        ...current.filter((entry) => entry.id !== conversation.id),
      ]);
      skipMessagesLoadRef.current = conversation.id;
      activeIdRef.current = conversation.id;
      if (mode === 'notebook') window.sessionStorage.setItem(NOTEBOOK_SESSION_KEY, conversation.id);
      setActiveId(conversation.id);
      setMessages([]);
      setHasMore(false);
      setNextBeforeId(null);
      setFailedSend(null);
      setRetryNotice(null);
      if (mode === 'notebook') {
        notebookRequestVersionRef.current += 1;
        notebookSelectionInitializedRef.current = false;
        setNotebookDocuments([]);
        setSelectedNotebookDocumentIds([]);
      }
      setSidebarOpen(false);
      return conversation;
    } catch (caught) {
      handleApiError(caught, 'Không tạo được cuộc trò chuyện. Vui lòng thử lại.');
      return null;
    } finally {
      creatingRef.current = false;
      if (mountedRef.current) setCreating(false);
    }
  }

  function selectConversation(conversation: CompanionConversation): void {
    if (activeIdRef.current !== conversation.id) {
      setMessages([]);
      setHasMore(false);
      setNextBeforeId(null);
    }
    activeIdRef.current = conversation.id;
    if (notebookMode) window.sessionStorage.setItem(NOTEBOOK_SESSION_KEY, conversation.id);
    setActiveId(conversation.id);
    setSidebarOpen(false);
    setError(null);
    if (notebookMode) {
      notebookRequestVersionRef.current += 1;
      notebookSelectionInitializedRef.current = false;
      void refreshNotebook(conversation.id);
    }
  }

  function startRename(conversation: CompanionConversation): void {
    setRenamingId(conversation.id);
    setRenameValue(conversation.title ?? '');
    if (window.matchMedia(MOBILE_QUERY).matches) {
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
      handleApiError(caught, 'Không đổi được tên cuộc trò chuyện. Vui lòng thử lại.');
    }
  }

  async function deleteConversation(conversation: CompanionConversation): Promise<void> {
    if (!window.confirm(`Xóa cuộc trò chuyện "${conversationLabel(conversation)}" cùng các tin nhắn của nó?`)) {
      return;
    }
    setError(null);
    try {
      await aiCompanionClient.deleteConversation(conversation.id);
      const remaining = conversations.filter((entry) => entry.id !== conversation.id);
      setConversations(remaining);
      if (activeIdRef.current === conversation.id) {
        if (conversation.mode === 'notebook') window.sessionStorage.removeItem(NOTEBOOK_SESSION_KEY);
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
      handleApiError(caught, 'Không xóa được cuộc trò chuyện. Vui lòng thử lại.');
    }
  }

  async function attemptSend(
    conversationId: string,
    content: string,
    clientMessageId: string,
    mode: 'chat' | 'cv',
  ): Promise<SendAttempt> {
    try {
      const response = await aiCompanionClient.sendMessage(conversationId, content, clientMessageId, mode);
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
            title: (result as SendMessageResult & { conversation_title?: string | null }).conversation_title ?? conversation.title ?? content.slice(0, 80),
            messages_count: (conversation.messages_count ?? 0) + 2,
            updated_at: new Date().toISOString(),
          }
        : conversation
    )));
  }

  async function submitMessage(
    rawContent: string,
    options: { conversationId?: string; clientMessageId?: string; mode?: 'chat' | 'cv' } = {},
  ): Promise<void> {
    const content = rawContent.trim();
    if (!content || sendingRef.current || creatingRef.current || chatDisabled) return;
    if (content.length > MAX_MESSAGE_LENGTH) {
      setError('Tin nhắn tối đa 8000 ký tự.');
      return;
    }

    if (notebookMode) {
      if (selectedNotebookDocumentIds.length === 0) {
        setError('Chọn ít nhất một tài liệu sẵn sàng trước khi hỏi.');
        return;
      }
      sendingRef.current = true;
      setSending(true);
      setError(null);
      try {
        if (!activeIdRef.current || active?.mode !== 'notebook') return;
        const response = await aiRoadmapClient.queryNotebook(activeIdRef.current, content, selectedNotebookDocumentIds);
        if (mountedRef.current) {
          setMessages((current) => [...current, ...response.data.chat_history.filter((message) => !current.some((existing) => existing.id === message.id))]);
          setConversations((current) => current.map((conversation) => conversation.id === activeIdRef.current ? {
            ...conversation,
            title: response.data.conversation_title ?? conversation.title,
            messages_count: (conversation.messages_count ?? messages.length) + response.data.chat_history.length,
            updated_at: new Date().toISOString(),
          } : conversation));
          setDraft('');
        }
      } catch (caught) {
        handleApiError(caught, 'Không thể hỏi Notebook. Vui lòng thử lại.');
      } finally {
        sendingRef.current = false;
        if (mountedRef.current) setSending(false);
      }
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError(null);
    setRetryNotice(null);
    setFailedSend(null);

    let conversationId = options.conversationId ?? activeIdRef.current;
    const mode = options.mode ?? 'chat';
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

      let outcome = await attemptSend(conversationId, content, clientMessageId, mode);
      if (outcome.kind === 'unavailable') {
        setRetryNotice(ASSISTANT_STARTING_MESSAGE);
        if (mountedRef.current) {
          await waitForRetry();
        }
        if (!mountedRef.current) return;
        outcome = await attemptSend(conversationId, content, clientMessageId, mode);
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
          setError('Không gửi được tin nhắn gần nhất. Hãy mở lại cuộc trò chuyện đó và thử lại.');
        } else {
          handleApiError(outcome.kind === 'error' ? outcome.error : null, 'Không gửi được tin nhắn. Vui lòng thử lại.');
        }
        return;
      }

      if (outcome.kind === 'unavailable') {
        setFailedSend({ conversationId, content, clientMessageId, mode });
        setRetryNotice(ASSISTANT_STARTING_MESSAGE);
        setDraft((current) => current || content);
        return;
      }

      setRetryNotice(null);
      setDraft((current) => current || content);
      handleApiError(outcome.kind === 'error' ? outcome.error : null, 'Không gửi được tin nhắn, chưa có gì được lưu. Vui lòng thử lại.');
    } catch (caught) {
      if (optimisticId) {
        setMessages((current) => current.filter((message) => message.id !== optimisticId));
      }
      handleApiError(caught, 'Không gửi được tin nhắn. Vui lòng thử lại.');
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
    const { conversationId, content, clientMessageId, mode } = failedSend;
    setFailedSend(null);
    void submitMessage(content, { conversationId, clientMessageId, mode });
  }

  async function refreshNotebook(conversationId = activeIdRef.current): Promise<NotebookDocument[] | null> {
    if (!conversationId) return null;
    const requestVersion = notebookRequestVersionRef.current;
    try {
      const documents = (await aiRoadmapClient.listNotebookDocuments(conversationId)).data;
      if (!mountedRef.current || requestVersion !== notebookRequestVersionRef.current) return null;
      setNotebookDocuments(documents);
      setSelectedNotebookDocumentIds((current) => {
        const readyIds = documents.filter((document) => document.status === 'ready').map((document) => document.id);
        if (!notebookSelectionInitializedRef.current) {
          notebookSelectionInitializedRef.current = true;
          return readyIds;
        }
        return current.filter((id) => readyIds.includes(id));
      });
      setNotebookError(null);
      return documents;
    } catch {
      if (mountedRef.current && requestVersion === notebookRequestVersionRef.current) setNotebookError('Không kiểm tra được trạng thái tài liệu. Vui lòng thử lại.');
      return null;
    }
  }

  async function uploadNotebook(files: File[]): Promise<void> {
    const validFiles = files.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (validFiles.length === 0) {
      setNotebookError('Chỉ hỗ trợ tệp PDF.');
      return;
    }
    let conversationId = activeIdRef.current;
    if (!conversationId || active?.mode !== 'notebook') {
      const notebook = await createConversation('notebook');
      if (!notebook) return;
      conversationId = notebook.id;
    }
    notebookRequestVersionRef.current += 1;
    const temporary = validFiles.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      original_filename: file.name,
      size_bytes: file.size,
      status: 'processing' as const,
      error_message: null,
      title: null,
      summary: null,
      chunk_count: 0,
      created_at: null,
      updated_at: null,
    }));
    setNotebookDocuments((current) => [...temporary, ...current]);
    setNotebookBusy(true); setNotebookError(null);
    try {
      const response = await aiRoadmapClient.uploadNotebookDocuments(conversationId, validFiles);
      setNotebookFiles((current) => ({ ...current, ...Object.fromEntries(response.data.map((document, index) => [document.id, validFiles[index]])) }));
      setNotebookDocuments((current) => [...response.data, ...current.filter((document) => !temporary.some((item) => item.id === document.id))]);
      setSelectedNotebookDocumentIds((current) => [...new Set([...current, ...response.data.filter((document) => document.status === 'ready').map((document) => document.id)])]);
      const title = response.data.find((document) => document.notebook_title)?.notebook_title;
      if (title) {
        setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, title } : conversation));
      }
      notebookSelectionInitializedRef.current = true;
    } catch {
      setNotebookDocuments((current) => current.map((document) => temporary.some((item) => item.id === document.id)
        ? { ...document, status: 'failed', error_message: 'Không thể tải lên tài liệu.' }
        : document));
      setNotebookError('Không lưu được PDF Notebook. Kiểm tra tệp PDF và thử lại.');
    }
    finally { setNotebookBusy(false); }
  }

  async function deleteNotebookDocument(document: NotebookDocument): Promise<void> {
    setNotebookError(null);
    if (document.id.startsWith('upload-')) {
      setNotebookDocuments((current) => current.filter((item) => item.id !== document.id));
      return;
    }
    try {
      await aiRoadmapClient.deleteNotebookDocument(document.id);
      setNotebookDocuments((current) => current.filter((item) => item.id !== document.id));
      setSelectedNotebookDocumentIds((current) => current.filter((id) => id !== document.id));
    } catch (caught) {
      handleApiError(caught, 'Không thể xóa tài liệu. Vui lòng thử lại.');
    }
  }

  async function retryNotebookDocument(document: NotebookDocument): Promise<void> {
    const file = notebookFiles[document.id];
    if (!file) {
      setNotebookError('Không còn tệp cục bộ để thử lại. Hãy chọn lại PDF.');
      return;
    }
    await deleteNotebookDocument(document);
    await uploadNotebook([file]);
  }

  function selectNotebookMode(nextNotebookMode: boolean): void {
    if (nextNotebookMode === notebookMode) return;
    setNotebookMode(nextNotebookMode);
    notebookRequestVersionRef.current += 1;
    notebookSelectionInitializedRef.current = false;
    setActiveId(null);
    activeIdRef.current = null;
    if (nextNotebookMode) window.sessionStorage.removeItem(NOTEBOOK_SESSION_KEY);
    setMessages([]);
    setNotebookDocuments([]);
    setSelectedNotebookDocumentIds([]);
    if (!nextNotebookMode) {
      setNotebookSourcesOpen(false);
    }
    void loadConversations(nextNotebookMode ? 'notebook' : 'chat');
  }

  if (booting) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingShell}>
          <div className={styles.loadingCard} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <p className={styles.loadingText}>Đang tải trợ lý AI...</p>
          </div>
        </div>
      </div>
    );
  }

  const composerDisabled = sending || creating || chatDisabled;
  const canSend = !composerDisabled && draft.trim().length > 0 && (!notebookMode || selectedNotebookDocumentIds.length > 0);
  const composerPlaceholder = chatDisabled
    ? 'Trò chuyện với AI chưa được bật.'
    : notebookMode ? 'Hỏi Notebook về tài liệu PDF của bạn' : 'Hỏi về bài học hoặc lộ trình';
  const showRetryAction = Boolean(failedSend && failedSend.conversationId === activeId);
  const readyNotebookDocuments = notebookDocuments.filter((document) => document.status === 'ready');
  const overviewDocument = readyNotebookDocuments[0] ?? null;
  const selectedNotebookSourceCount = readyNotebookDocuments.filter((document) => selectedNotebookDocumentIds.includes(document.id)).length;
  const notebookSourceLabel = notebookDocuments.length ? `${selectedNotebookSourceCount}/${notebookDocuments.length} nguồn` : 'Thêm nguồn';
  const openRoadmapForm = () => {
    roadmapReturnScrollRef.current = threadRef.current?.scrollTop ?? null;
    setRoadmapMode(true);
  };
  const dismissButton = (label: string, onClick: () => void) => (
    <button type="button" className={styles.iconButton} onClick={onClick} aria-label={label}>
      <Icon size={14}><path d="M18 6 6 18M6 6l12 12" /></Icon>
    </button>
  );

  return (
    <div className={styles.page}>
      <div ref={aiRef} className={styles.ai}>
        {sidebarOpen && (
          <div
            className={styles.overlay}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          id="companion-sidebar"
          className={`${styles.list} ${sidebarOpen ? styles.listOpen : ''}`}
          aria-label="Cuộc trò chuyện"
        >
          <div className={styles.listHead}>
            <h2>{notebookMode ? 'Notebook' : 'Trợ lý AI'}</h2>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setSidebarOpen(false)}
              aria-label="Đóng danh sách cuộc trò chuyện"
            >
              <Icon size={16}><path d="M18 6 6 18M6 6l12 12" /></Icon>
            </button>
          </div>

          <div className={`${styles.modeToggle} ${styles.drawerModeToggle}`} role="group" aria-label="Chế độ trò chuyện">
            <button type="button" className={!notebookMode ? styles.modeToggleActive : undefined} aria-pressed={!notebookMode} onClick={() => selectNotebookMode(false)}>Trò chuyện</button>
            <button type="button" className={notebookMode ? styles.modeToggleActive : undefined} aria-pressed={notebookMode} onClick={() => selectNotebookMode(true)}>Notebook</button>
          </div>

          <button
            type="button"
            className={styles.btn}
            onClick={() => void createConversation(notebookMode ? 'notebook' : 'chat')}
            disabled={creating}
          >
            <Icon size={16}><path d="M12 5v14M5 12h14" /></Icon>
            {creating ? 'Đang tạo...' : notebookMode ? 'Notebook mới' : 'Cuộc trò chuyện mới'}
          </button>

          <div className={styles.convs}>
            {conversations.length === 0 ? (
              <div className={styles.emptyList}>
                <p>Chưa có cuộc trò chuyện nào</p>
                <p>Bắt đầu một cuộc trò chuyện mới để thấy nó ở đây.</p>
              </div>
            ) : (
              <ul className={styles.convList}>
                {conversations.map((conversation) => {
                  const isActive = activeId === conversation.id;
                  const title = conversationLabel(conversation);
                  return (
                    <li key={conversation.id} className={`${styles.convItem} ${isActive ? styles.convItemActive : ''}`}>
                      {renamingId === conversation.id ? (
                        <form className={styles.renameForm} onSubmit={(event) => void saveRename(event, conversation.id)}>
                          <label className={styles.srOnly} htmlFor={`rename-${conversation.id}`}>Tên cuộc trò chuyện</label>
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
                            <button type="submit" className={`${styles.btn} ${styles.btnSm}`}>Lưu</button>
                            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setRenamingId(null)}>Hủy</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={styles.conv}
                            onClick={() => selectConversation(conversation)}
                            aria-current={isActive ? 'true' : undefined}
                          >
                            <b>{title}</b>
                            <small>
                              {messagesLabel(conversation.messages_count ?? 0)}, {formatRelativeTime(conversation.updated_at ?? conversation.created_at)}
                            </small>
                          </button>
                          <div className={styles.convActions}>
                            <button type="button" className={styles.iconButton} onClick={() => startRename(conversation)} aria-label={`Đổi tên cuộc trò chuyện ${title}`}>
                              <Icon size={14}>
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                              </Icon>
                            </button>
                            <button type="button" className={`${styles.iconButton} ${styles.iconButtonDanger}`} onClick={() => void deleteConversation(conversation)} aria-label={`Xóa cuộc trò chuyện ${title}`}>
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

          <p className={styles.listFoot}>Chỉ bạn xem được các cuộc trò chuyện này.</p>
        </aside>

        <section className={styles.chat} aria-label="Trò chuyện với trợ lý AI">
          <div className={styles.chatHead}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label="Mở danh sách cuộc trò chuyện"
              aria-expanded={sidebarOpen}
              aria-controls="companion-sidebar"
            >
              <Icon size={18}><path d="M3 6h18M3 12h18M3 18h18" /></Icon>
            </button>
            <div className={styles.chatHeadSpacer} />
            <div className={styles.conversationHead}>
            <div className={styles.chatHeading}>
              <h1>{active ? conversationLabel(active) : 'Trợ lý AI'}</h1>
              <small>
                {active
                  ? `${messagesLabel(active.messages_count ?? messages.length)}, cập nhật ${formatRelativeTime(active.updated_at ?? active.created_at)}`
                  : 'Đặt câu hỏi để bắt đầu một cuộc trò chuyện mới'}
              </small>
            </div>
            <div className={styles.acts}>
              <button type="button" className={styles.iconButton} onClick={() => { if (active) startRename(active); }} disabled={!active} aria-label="Đổi tên cuộc trò chuyện">
                <Icon size={16}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                </Icon>
              </button>
              <button type="button" className={`${styles.iconButton} ${styles.iconButtonDanger}`} onClick={() => { if (active) void deleteConversation(active); }} disabled={!active} aria-label="Xóa cuộc trò chuyện">
                <Icon size={16}>
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </Icon>
              </button>
            </div>
            </div>
          </div>

          {(staleNotice || error || retryNotice || chatDisabled) && (
            <div className={styles.notices}>
              {staleNotice && (
                <div className={`${styles.notice} ${styles.noticeWarn}`} role="alert">
                  <span>{STALE_CONVERSATION_MESSAGE}</span>
                  {dismissButton('Đóng thông báo', () => setStaleNotice(false))}
                </div>
              )}
              {error && (
                <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
                  <span>{error}</span>
                  {dismissButton('Đóng thông báo lỗi', () => setError(null))}
                </div>
              )}
              {retryNotice && (
                <div className={`${styles.notice} ${styles.noticeWarn}`} role="status">
                  <span>{retryNotice}</span>
                  {showRetryAction && (
                    <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={retryFailedSend} disabled={sending || creating}>
                      Thử lại
                    </button>
                  )}
                </div>
              )}
              {chatDisabled && (
                <div className={styles.notice} role="status">
                  <span>Trò chuyện với AI chưa được bật trên nền tảng này. Bạn vẫn xem được lịch sử và quản lý ghi nhớ.</span>
                </div>
              )}
            </div>
          )}

          <div ref={roadmapPaneRef} className={styles.roadmapPane} style={{ display: roadmapMode ? 'block' : 'none' }}>
            <RoadmapForm onBack={() => setRoadmapMode(false)} />
          </div>
          {!roadmapMode && <>
            <div
              ref={threadRef}
              className={styles.thread}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Tin nhắn của cuộc trò chuyện"
              tabIndex={0}
            >
              <div className={styles.threadIn}>
                {notebookMode && <>
                  {overviewDocument ? (
                    <section className={styles.notebookOverview} aria-label="Tổng quan Notebook">
                      <p>Tổng quan</p>
                      <h2>{overviewDocument.title || overviewDocument.original_filename}</h2>
                      <small>{notebookSourceLabel}</small>
                      <div>{overviewDocument.summary || 'Tài liệu đã sẵn sàng để hỏi đáp.'}</div>
                    </section>
                  ) : (
                    <div className={styles.emptyThread}>
                      <h2>Thêm nguồn cho Notebook</h2>
                      <p>Mở Nguồn để tải một hoặc nhiều tệp PDF, rồi chọn tài liệu dùng khi hỏi.</p>
                    </div>
                  )}
                </>}
                {active && hasMore && (
                  <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm} ${styles.loadEarlier}`} onClick={() => void loadMessages(active.id, nextBeforeId)} disabled={loadingMessages}>
                    {loadingMessages ? 'Đang tải...' : 'Tải tin nhắn cũ hơn'}
                  </button>
                )}

                {loadingMessages && messages.length === 0 ? (
                  <div className={styles.threadLoading} role="status">
                    <span className={styles.spinner} aria-hidden="true" />
                    <span>Đang tải cuộc trò chuyện...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className={styles.emptyThread}>
                    <h2>{active ? 'Hôm nay bạn muốn học gì?' : 'Bắt đầu cuộc trò chuyện mới'}</h2>
                    <p>
                      {active
                        ? 'Hỏi về một khóa học, nhờ giải thích một khái niệm hoặc lên kế hoạch học tiếp theo.'
                        : 'Gửi tin nhắn bên dưới, cuộc trò chuyện sẽ được tạo tự động.'}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isUser = message.role === 'user';
                    const isPending = message.id.startsWith('pending-');
                    if (isUser) {
                      return (
                        <div key={message.id} className={styles.me}>
                          {message.content}
                          {isPending && <small className={styles.pending}>Đang gửi...</small>}
                        </div>
                      );
                    }
                    return (
                      <div key={message.id} className={styles.bot}>
                        <span className={styles.botAv} aria-hidden="true"><LogoMark size={22} /></span>
                        <div className={styles.botTxt}>
                          <AssistantMarkdown content={message.content} />
                          {citationsFor(message).length > 0 && <div className={styles.citations}><strong>Nguồn</strong>{citationsFor(message).map((citation) => <span key={`${citation.filename}-${citation.page}`}>{citation.filename} · trang {citation.page}</span>)}</div>}
                        </div>
                      </div>
                    );
                  })
                )}

                {sending && (
                  <div className={styles.bot} role="status" aria-label="Trợ lý đang trả lời">
                    <span className={styles.botAv} aria-hidden="true"><LogoMark size={22} /></span>
                    <span className={styles.dots} aria-hidden="true"><i /><i /><i /></span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.compose}>
              <div className={styles.composeIn}>
                {!notebookMode && <div className={styles.sugg} role="group" aria-label="Công cụ lộ trình">
                  <button type="button" className={styles.suggAction} onClick={openRoadmapForm}>Tạo lộ trình bằng AI</button>
                  <Link className={styles.suggAction} href="/learning/my-roadmaps">Lộ trình AI của tôi</Link>
                </div>}
                {notebookMode && (
                  <button type="button" className={styles.sourceChip} onClick={() => setNotebookSourcesOpen(true)} aria-haspopup="dialog">
                    <Icon size={15}><path d="M6 2h9l4 4v16H6zM15 2v5h4M9 13h6M9 17h6" /></Icon>
                    <span>{notebookSourceLabel}</span>
                    {notebookBusy ? <i className={styles.spinnerSmall} aria-label="Đang tải lên" /> : <b aria-label="Mở nguồn">+</b>}
                  </button>
                )}
                {notebookMode && selectedNotebookDocumentIds.length === 0 && (
                  <p className={styles.sourceRequired} role="alert">Vui lòng chọn ít nhất 1 nguồn tài liệu để Notebook có thể trả lời. <button type="button" onClick={() => setNotebookSourcesOpen(true)}>Mở Nguồn</button></p>
                )}
                <form className={styles.box} onSubmit={handleSend}>
                  <label className={styles.srOnly} htmlFor="ai-companion-message">Tin nhắn</label>
                  <textarea
                    id="ai-companion-message"
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    rows={1}
                    maxLength={MAX_MESSAGE_LENGTH}
                    disabled={composerDisabled}
                    placeholder={composerPlaceholder}
                    aria-describedby="ai-companion-helper"
                  />
                  <button type="submit" className={styles.send} aria-label="Gửi tin nhắn" disabled={!canSend}>
                    {sending ? (
                      <span className={styles.spinnerSmall} aria-hidden="true" />
                    ) : (
                      <Icon size={18}><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></Icon>
                    )}
                  </button>
                </form>
                <div className={styles.hint}>
                  <span id="ai-companion-helper">Enter để gửi, Shift + Enter để xuống dòng. Trợ lý có thể sai, hãy đối chiếu với nội dung khóa học.</span>
                  <span className={styles.charCount}>{draft.length}/{MAX_MESSAGE_LENGTH}</span>
                </div>
              </div>
            </div>
          </>}
        </section>

        {notebookSourcesOpen && (
          <div className={styles.sourceModalBackdrop} role="presentation" onMouseDown={() => setNotebookSourcesOpen(false)}>
            <section className={styles.sourceModal} role="dialog" aria-modal="true" aria-labelledby="notebook-sources-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className={styles.sourceModalHead}>
                <div><p>Nguồn</p><h2 id="notebook-sources-title">Tài liệu Notebook</h2></div>
                <button type="button" className={styles.iconButton} onClick={() => setNotebookSourcesOpen(false)} aria-label="Đóng quản lý nguồn">
                  <Icon size={18}><path d="M18 6 6 18M6 6l12 12" /></Icon>
                </button>
              </div>

              <div className={styles.sourceList}>
                {readyNotebookDocuments.length > 0 && <label className={styles.sourceSelectAll}>
                  <input
                    type="checkbox"
                    checked={readyNotebookDocuments.every((document) => selectedNotebookDocumentIds.includes(document.id))}
                    onChange={(event) => setSelectedNotebookDocumentIds((current) => event.target.checked
                      ? [...new Set([...current, ...readyNotebookDocuments.map((document) => document.id)])]
                      : current.filter((id) => !readyNotebookDocuments.some((document) => document.id === id)))}
                  />
                  Chọn tất cả nguồn sẵn sàng
                </label>}
                {notebookDocuments.map((document) => (
                  <div key={document.id} className={styles.sourceItem}>
                    <input
                      type="checkbox"
                      checked={selectedNotebookDocumentIds.includes(document.id)}
                      disabled={document.status !== 'ready'}
                      onChange={() => setSelectedNotebookDocumentIds((current) => current.includes(document.id) ? current.filter((id) => id !== document.id) : [...current, document.id])}
                      aria-label={`Dùng ${document.original_filename} khi hỏi`}
                    />
                    <Icon size={18}><path d="M6 2h9l4 4v16H6zM15 2v5h4M9 13h6M9 17h6" /></Icon>
                    <span>{document.original_filename}</span>
                    {document.status === 'processing' ? <><i className={styles.spinnerSmall} aria-label="Đang xử lý" /><small>Đang xử lý</small></> : document.status === 'failed' ? <><b className={styles.sourceWarn} aria-label="Lỗi">!</b><small>{document.error_message || 'Không thể xử lý'}</small></> : <><b className={styles.sourceReady} aria-label="Sẵn sàng">✓</b><small>Sẵn sàng</small></>}
                    <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => void deleteNotebookDocument(document)}>Xóa</button>
                    {document.status === 'failed' && <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => void retryNotebookDocument(document)}>Thử lại</button>}
                  </div>
                ))}
              </div>
              {notebookError && <p className={styles.sourceError} role="alert">{notebookError}</p>}

              <label
                className={styles.sourceDropzone}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void uploadNotebook(Array.from(event.dataTransfer.files));
                }}
              >
                <input
                  className={styles.srOnly}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = '';
                    if (files.length) void uploadNotebook(files);
                  }}
                />
                <strong>+ Thêm nguồn / Tải các tệp PDF lên</strong>
                <span>Kéo và thả nhiều tệp PDF vào đây hoặc bấm để chọn.</span>
              </label>
              <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => void refreshNotebook()} disabled={notebookBusy}>Làm mới</button>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}
