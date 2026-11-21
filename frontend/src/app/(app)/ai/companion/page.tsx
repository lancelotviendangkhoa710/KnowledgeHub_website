'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { aiCompanionClient } from '@/lib/aiCompanionClient';
import RoadmapForm from '@/components/learning/RoadmapForm';
import { LogoMark } from '@/components/layout/Logo';
import DatePicker from '@/components/ui/DatePicker';
import Select from '@/components/ui/Select';
import AssistantMarkdown from '@/components/ai/AssistantMarkdown';
import { getAccessToken } from '@/lib/authToken';
import { aiRoadmapClient } from '@/lib/aiRoadmapClient';
import type { AIConversation, AIMessage, MemoryType, SendMessageResult, UserMemory } from '@/types/ai';
import styles from './companion.module.css';

const MOBILE_QUERY = '(max-width: 980px)';
const LOGIN_REDIRECT = '/login?redirect=%2Fai%2Fcompanion';
const MAX_MESSAGE_LENGTH = 8000;
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

const memoryTypeLabels: Record<MemoryType, string> = {
  preference: 'Sở thích',
  fact: 'Thông tin',
  goal: 'Mục tiêu',
};

const STARTER_PROMPTS: string[] = [
  'ETL và ELT khác nhau thế nào?',
  'Gợi ý khóa học tiếp theo cho mình',
  'Giải thích Raft bằng ví dụ đời thường',
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

function formatExpiryDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function messagesLabel(count: number): string {
  return `${count} tin nhắn`;
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
  const [roadmapMode, setRoadmapMode] = useState(false);
  const [notebookMode, setNotebookMode] = useState(false);
  const [notebookStatus, setNotebookStatus] = useState<{ cv: { filename: string } | null; index: { status: string } | null } | null>(null);
  const [notebookBusy, setNotebookBusy] = useState(false);
  const [notebookSourcesOpen, setNotebookSourcesOpen] = useState(false);
  const [notebookFile, setNotebookFile] = useState<File | null>(null);
  const [notebookError, setNotebookError] = useState<string | null>(null);

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
  const roadmapReturnScrollRef = useRef<number | null>(null);
  const roadmapPaneRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const aiRef = useRef<HTMLDivElement | null>(null);
  const memoryCloseRef = useRef<HTMLButtonElement | null>(null);
  const memoryToggleRef = useRef<HTMLButtonElement | null>(null);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!notebookMode || notebookBusy || notebookStatus?.index?.status !== 'pending') return;
    const timer = window.setInterval(() => { void refreshNotebook(); }, 2500);
    return () => window.clearInterval(timer);
  }, [notebookBusy, notebookMode, notebookStatus?.index?.status]);

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
    void loadConversations();
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
    const overlayOpen = sidebarOpen || memoryOpen;
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
    if (memoryOpen) memoryCloseRef.current?.focus();
  }, [memoryOpen]);

  // Bảng ghi nhớ là drawer: giữ focus trong bảng, vô hiệu hóa phần phía sau, đóng thì trả focus về nút "Ghi nhớ".
  useEffect(() => {
    if (!memoryOpen) return;
    const behind = Array.from(aiRef.current?.querySelectorAll<HTMLElement>(':scope > aside:not(#memory-panel), :scope > section') ?? []);
    const toggle = memoryToggleRef.current;
    behind.forEach((element) => element.setAttribute('inert', ''));
    function trapTab(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(document.querySelectorAll<HTMLElement>(
        '#memory-panel button:not([disabled]), #memory-panel input:not([disabled]), #memory-panel textarea:not([disabled]), #memory-panel [href], #memory-panel [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !focusable.includes(current as HTMLElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', trapTab);
    return () => {
      document.removeEventListener('keydown', trapTab);
      behind.forEach((element) => element.removeAttribute('inert'));
      toggle?.focus();
    };
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
      setError('Không tải được danh sách cuộc trò chuyện. Vui lòng thử lại.');
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
      setMemoryError('Không tải được ghi nhớ. Vui lòng thử lại.');
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
      handleApiError(caught, 'Không tạo được cuộc trò chuyện. Vui lòng thử lại.');
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

  async function deleteConversation(conversation: AIConversation): Promise<void> {
    if (!window.confirm(`Xóa cuộc trò chuyện "${conversation.title ?? 'Chưa đặt tên'}" cùng các tin nhắn của nó?`)) {
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
            title: conversation.title ?? content.slice(0, 80),
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

    sendingRef.current = true;
    setSending(true);
    setError(null);
    setRetryNotice(null);
    setFailedSend(null);

    let conversationId = options.conversationId ?? activeIdRef.current;
    const mode = options.mode ?? (notebookMode ? 'cv' : 'chat');
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

  async function refreshNotebook(): Promise<{ cv: { filename: string } | null; index: { status: string } | null } | null> {
    try {
      const status = (await aiCompanionClient.getNotebookStatus()).data;
      if (!mountedRef.current) return null;
      setNotebookStatus(status);
      if (status.index?.status !== 'failed') setNotebookError(null);
      return status;
    } catch {
      if (mountedRef.current) setNotebookError('Không kiểm tra được trạng thái tài liệu. Vui lòng thử lại.');
      return null;
    }
  }

  async function uploadNotebook(file: File): Promise<void> {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setNotebookError('Chỉ hỗ trợ tệp PDF.');
      return;
    }
    setNotebookFile(file);
    setNotebookStatus({ cv: { filename: file.name }, index: { status: 'pending' } });
    setNotebookBusy(true); setNotebookError(null);
    try { await aiRoadmapClient.saveCv(file); await refreshNotebook(); }
    catch { setNotebookError('Không lưu được PDF Notebook. Kiểm tra tệp PDF và thử lại.'); }
    finally { setNotebookBusy(false); }
  }

  function selectNotebookMode(nextNotebookMode: boolean): void {
    setNotebookMode(nextNotebookMode);
    if (!nextNotebookMode) {
      setNotebookSourcesOpen(false);
      return;
    }
    void refreshNotebook().then((status) => {
      if (!status?.cv) setNotebookSourcesOpen(true);
    });
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
      setMemoryError('Không lưu được ghi nhớ. Vui lòng thử lại.');
    } finally {
      setSavingMemory(false);
    }
  }

  async function removeMemory(memory: UserMemory): Promise<void> {
    if (!window.confirm('Xóa ghi nhớ này? Trợ lý sẽ không dùng nó nữa.')) return;
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
        setMemoryError('Ghi nhớ này không còn tồn tại, có thể đã bị xóa.');
        return;
      }
      setMemoryError('Không xóa được ghi nhớ. Vui lòng thử lại.');
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
            <p className={styles.loadingText}>Đang tải trợ lý AI...</p>
          </div>
        </div>
      </div>
    );
  }

  const composerDisabled = sending || creating || chatDisabled;
  const canSend = !composerDisabled && draft.trim().length > 0;
  const composerPlaceholder = chatDisabled
    ? 'Trò chuyện với AI chưa được bật.'
    : notebookMode ? 'Hỏi Notebook về tài liệu PDF của bạn' : 'Hỏi về bài học hoặc lộ trình';
  const showRetryAction = Boolean(failedSend && failedSend.conversationId === activeId);
  const notebookIndexStatus = notebookStatus?.index?.status;
  const notebookLoading = notebookBusy || notebookIndexStatus === 'pending';
  const notebookFailed = Boolean(notebookError) || notebookIndexStatus === 'failed';
  const notebookStateLabel = notebookLoading
    ? (notebookBusy ? 'Đang tải lên...' : 'Đang xử lý & lưu...')
    : notebookFailed ? 'Không thể lưu tài liệu'
      : 'Đã lưu / Sẵn sàng';
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
        {(sidebarOpen || memoryOpen) && (
          <div
            className={`${styles.overlay} ${sidebarOpen ? '' : styles.overlayMem}`}
            onClick={() => { setSidebarOpen(false); setMemoryOpen(false); }}
            aria-hidden="true"
          />
        )}

        <aside
          id="companion-sidebar"
          className={`${styles.list} ${sidebarOpen ? styles.listOpen : ''}`}
          aria-label="Cuộc trò chuyện"
        >
          <div className={styles.listHead}>
            <h2>Trợ lý AI</h2>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setSidebarOpen(false)}
              aria-label="Đóng danh sách cuộc trò chuyện"
            >
              <Icon size={16}><path d="M18 6 6 18M6 6l12 12" /></Icon>
            </button>
          </div>

          <button
            type="button"
            className={styles.btn}
            onClick={() => void createConversation()}
            disabled={creating}
          >
            <Icon size={16}><path d="M12 5v14M5 12h14" /></Icon>
            {creating ? 'Đang tạo...' : 'Cuộc trò chuyện mới'}
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
                  const title = conversation.title ?? 'Chưa đặt tên';
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
            <div className={styles.chatHeading}>
              <h1>{active ? (active.title ?? 'Chưa đặt tên') : 'Trợ lý AI'}</h1>
              <small>
                {active
                  ? `${messagesLabel(active.messages_count ?? messages.length)}, cập nhật ${formatRelativeTime(active.updated_at ?? active.created_at)}`
                  : 'Đặt câu hỏi để bắt đầu một cuộc trò chuyện mới'}
              </small>
            </div>
            <div className={styles.acts}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                ref={memoryToggleRef}
                onClick={toggleMemoryPanel}
                aria-pressed={memoryOpen}
                aria-controls="memory-panel"
              >
                <Icon size={15}>
                  <path d="M5 4h14v12l-4 4H5zM15 20v-4h4M9 9h6M9 13h3" />
                </Icon>
                Ghi nhớ
                {memories.length > 0 && <span className={styles.count}>{memories.length}</span>}
              </button>
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
                <div className={styles.sugg} role="group" aria-label="Gợi ý câu hỏi">
                  {STARTER_PROMPTS.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => fillComposer(suggestion)}>{suggestion}</button>
                  ))}
                  {!notebookMode && <>
                    <button type="button" className={styles.suggAction} onClick={openRoadmapForm}>Tạo lộ trình bằng AI</button>
                    <Link className={styles.suggAction} href="/learning/my-roadmaps">Lộ trình AI của tôi</Link>
                  </>}
                </div>
                <div className={styles.modeToggle} role="group" aria-label="Chế độ trò chuyện">
                  <button
                    type="button"
                    className={!notebookMode ? styles.modeToggleActive : undefined}
                    aria-pressed={!notebookMode}
                    onClick={() => selectNotebookMode(false)}
                  >
                    Trò chuyện
                  </button>
                  <button
                    type="button"
                    className={notebookMode ? styles.modeToggleActive : undefined}
                    aria-pressed={notebookMode}
                    onClick={() => selectNotebookMode(true)}
                  >
                    Notebook
                  </button>
                </div>
                {notebookMode && notebookStatus?.cv && (
                  <button type="button" className={styles.sourceChip} onClick={() => setNotebookSourcesOpen(true)} aria-haspopup="dialog">
                    <Icon size={15}><path d="M6 2h9l4 4v16H6zM15 2v5h4M9 13h6M9 17h6" /></Icon>
                    <span>{notebookStatus.cv.filename}</span>
                    {notebookLoading ? <i className={styles.spinnerSmall} aria-label={notebookStateLabel} /> : notebookFailed ? <b aria-label="Lỗi">!</b> : <b aria-label="Đã lưu">✓</b>}
                  </button>
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

              {notebookStatus?.cv && (
                <div className={styles.sourceItem} role="status">
                  <Icon size={18}><path d="M6 2h9l4 4v16H6zM15 2v5h4M9 13h6M9 17h6" /></Icon>
                  <span>{notebookStatus.cv.filename}</span>
                  {notebookLoading ? <><i className={styles.spinnerSmall} aria-hidden="true" /><small>{notebookStateLabel}</small></> : notebookFailed ? <><b className={styles.sourceWarn} aria-hidden="true">!</b><small>{notebookStateLabel}</small></> : <><b className={styles.sourceReady} aria-hidden="true">✓</b><small>{notebookStateLabel}</small></>}
                </div>
              )}

              {notebookError && <p className={styles.sourceError} role="alert">{notebookError}</p>}
              {notebookFailed && notebookFile && (
                <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => void uploadNotebook(notebookFile)} disabled={notebookBusy}>Thử lại</button>
              )}

              <label
                className={styles.sourceDropzone}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files[0];
                  if (file) void uploadNotebook(file);
                }}
              >
                <input
                  className={styles.srOnly}
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={notebookBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void uploadNotebook(file);
                  }}
                />
                <strong>+ Thêm nguồn / Tải tệp PDF lên</strong>
                <span>Kéo và thả tệp PDF vào đây hoặc bấm để chọn tệp.</span>
              </label>
              <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => void refreshNotebook()} disabled={notebookBusy}>Làm mới</button>
            </section>
          </div>
        )}

        <aside
          id="memory-panel"
          className={`${styles.mem} ${memoryOpen ? styles.memOpen : ''}`}
          aria-label="Ghi nhớ"
          aria-hidden={!memoryOpen}
        >
            <div className={styles.memHead}>
              <div><p>Nguồn ngữ cảnh</p><h2><Icon size={18}><path d="M5 4h14v12l-4 4H5zM15 20v-4h4M9 9h6M9 13h3" /></Icon>Ghi nhớ</h2></div>
              <button type="button" ref={memoryCloseRef} className={styles.iconButton} onClick={() => setMemoryOpen(false)} aria-label="Đóng bảng ghi nhớ">
                <Icon size={16}><path d="M18 6 6 18M6 6l12 12" /></Icon>
              </button>
            </div>
            <p className={styles.memIntro}>Những điều trợ lý nhớ về bạn để trả lời sát hơn. Chỉ các ghi nhớ bạn tự thêm mới được lưu, bạn xóa được bất cứ lúc nào.</p>

            {memoryError && (
              <div className={styles.memError} role="alert">
                <span>{memoryError}</span>
                {memoryLoadFailed && (
                  <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => void loadMemories()} disabled={memoryLoading}>
                    Thử lại
                  </button>
                )}
              </div>
            )}

            {memoryLoading ? (
              <div className={styles.memLoading} role="status">
                <span className={styles.spinner} aria-hidden="true" />
                <span>Đang tải ghi nhớ...</span>
              </div>
            ) : memories.length === 0 ? (
              <div className={styles.memEmpty}>
                <strong>Chưa có ghi nhớ</strong>
                <p>Thêm một sở thích, thông tin hoặc mục tiêu bên dưới.</p>
              </div>
            ) : (
              <ul className={styles.memList}>
                {memories.map((memory) => (
                  <li key={memory.id} className={styles.memItem}>
                    <div className={styles.memItemBody}>
                      <small className={styles.memType}>{memoryTypeLabels[memory.memory_type]}</small>
                      <p>{memory.content}</p>
                      {memory.expires_at && <small className={styles.memExpiry}>Hết hạn {formatExpiryDate(memory.expires_at)}</small>}
                    </div>
                    <button type="button" className={styles.memDel} onClick={() => void removeMemory(memory)} aria-label={`Xóa ghi nhớ: ${memory.content.slice(0, 60)}`}>
                      <Icon size={15}><path d="M18 6 6 18M6 6l12 12" /></Icon>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form className={styles.memForm} onSubmit={(event) => void addMemory(event)}>
              <strong>Thêm ghi nhớ</strong>
              <label className={styles.srOnly} htmlFor="memory-content">Thêm điều cần nhớ</label>
              <textarea
                id="memory-content"
                required
                maxLength={1000}
                rows={1}
                value={memoryContent}
                onChange={(event) => setMemoryContent(event.target.value)}
                placeholder="Thêm điều cần nhớ"
              />
              <div className={styles.memRow}>
                <div className={styles.memField}>
                  Loại
                  <Select className={styles.memSelect} compact ariaLabel="Loại ghi nhớ" value={memoryType} onChange={(value) => setMemoryType(value as MemoryType)} options={(Object.keys(memoryTypeLabels) as MemoryType[]).map((type) => ({ value: type, label: memoryTypeLabels[type] }))} />
                </div>
                <div className={styles.memField}>
                  Hết hạn (tùy chọn)
                  <div className={styles.memDate}><DatePicker ariaLabel="Ngày hết hạn" value={memoryExpires} onChange={setMemoryExpires} /></div>
                </div>
              </div>
              <button type="submit" className={`${styles.btn} ${styles.btnSm}`} disabled={savingMemory || !memoryContent.trim()}>
                {savingMemory ? 'Đang lưu...' : 'Thêm ghi nhớ'}
              </button>
            </form>
        </aside>
      </div>
    </div>
  );
}
