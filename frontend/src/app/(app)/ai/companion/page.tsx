'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { aiCompanionClient } from '@/lib/aiCompanionClient';
import { getAccessToken } from '@/lib/authToken';
import type { AIConversation, AIMessage, MemoryType, UserMemory } from '@/types/ai';

const LOGIN_REDIRECT = '/login?redirect=%2Fai%2Fcompanion';

type ApiError = { status?: number; message?: string; code?: string };

const memoryTypeLabels: Record<MemoryType, string> = {
  preference: 'Preference',
  fact: 'Fact',
  goal: 'Goal',
};

function createClientMessageId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function AICompanionPage() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [active, setActive] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBeforeId, setNextBeforeId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryType, setMemoryType] = useState<MemoryType>('preference');
  const [memoryContent, setMemoryContent] = useState('');
  const [memoryExpires, setMemoryExpires] = useState('');
  const [savingMemory, setSavingMemory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  function handleApiError(caught: unknown, fallback: string): void {
    const apiError = caught as ApiError;
    if (apiError.status === 401) {
      router.replace(LOGIN_REDIRECT);
      return;
    }
    if (apiError.code === 'chat_disabled') {
      setChatDisabled(true);
      // The persistent chat-disabled banner is already rendered above; avoid a duplicate alert.
      setError(null);
      return;
    }
    setError(apiError.message && apiError.message.trim() ? apiError.message : fallback);
  }

  async function loadConversations(): Promise<void> {
    setBooting(true);
    try {
      const response = await aiCompanionClient.listConversations();
      setConversations(response.data);
      setActive((current) => current ?? response.data[0] ?? null);
    } catch (caught) {
      handleApiError(caught, 'Unable to load your conversations. Please retry.');
    } finally {
      setBooting(false);
    }
  }

  async function loadMessages(conversationId: string, beforeId?: string | null): Promise<void> {
    setLoadingMessages(true);
    setError(null);
    try {
      const response = await aiCompanionClient.listMessages(conversationId, { beforeId: beforeId ?? null });
      setMessages((current) => (beforeId ? [...response.data, ...current] : response.data));
      setHasMore(Boolean(response.meta?.has_more));
      setNextBeforeId(response.meta?.next_before_id ?? null);
    } catch (caught) {
      handleApiError(caught, 'Unable to load this conversation. Please retry.');
    } finally {
      setLoadingMessages(false);
    }
  }

  async function loadMemories(): Promise<void> {
    setMemoryLoading(true);
    setMemoryError(null);
    try {
      const response = await aiCompanionClient.listMemories();
      setMemories(response.data);
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError.status === 401) {
        router.replace(LOGIN_REDIRECT);
        return;
      }
      setMemoryError('Unable to load your memories. Please retry.');
    } finally {
      setMemoryLoading(false);
    }
  }

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace(LOGIN_REDIRECT);
      return;
    }
    void loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active) {
      void loadMessages(active.id);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  async function createConversation(): Promise<void> {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const response = await aiCompanionClient.createConversation();
      setConversations((current) => [response.data, ...current]);
      setActive(response.data);
      setMessages([]);
      setSidebarOpen(false);
    } catch (caught) {
      handleApiError(caught, 'Unable to create a conversation. Please retry.');
    } finally {
      setCreating(false);
    }
  }

  function startRename(conversation: AIConversation): void {
    setRenamingId(conversation.id);
    setRenameValue(conversation.title ?? '');
  }

  async function saveRename(event: FormEvent, conversationId: string): Promise<void> {
    event.preventDefault();
    const title = renameValue.trim();
    if (!title) return;
    try {
      const response = await aiCompanionClient.updateConversation(conversationId, title);
      setConversations((current) => current.map((entry) => (entry.id === conversationId ? { ...entry, title: response.data.title } : entry)));
      setActive((current) => (current && current.id === conversationId ? { ...current, title: response.data.title } : current));
      setRenamingId(null);
    } catch (caught) {
      handleApiError(caught, 'Unable to rename this conversation. Please retry.');
    }
  }

  async function deleteConversation(conversation: AIConversation): Promise<void> {
    if (!window.confirm(`Delete conversation "${conversation.title ?? 'Untitled'}" and its messages?`)) return;
    setError(null);
    try {
      await aiCompanionClient.deleteConversation(conversation.id);
      const remaining = conversations.filter((entry) => entry.id !== conversation.id);
      setConversations(remaining);
      if (active?.id === conversation.id) {
        setActive(remaining[0] ?? null);
        setMessages([]);
      }
    } catch (caught) {
      handleApiError(caught, 'Unable to delete this conversation. Please retry.');
    }
  }

  async function sendMessage(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!active || sending || !draft.trim() || chatDisabled) return;
    const content = draft.trim();
    const clientMessageId = createClientMessageId();
    const optimisticMessage: AIMessage = {
      id: `pending-${clientMessageId}`,
      conversation_id: active.id,
      role: 'user',
      content,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setDraft('');
    setError(null);
    setSending(true);
    setMessages((current) => [...current, optimisticMessage]);
    try {
      const response = await aiCompanionClient.sendMessage(active.id, content, clientMessageId);
      setMessages((current) => [
        ...current.filter((message) => message.id !== optimisticMessage.id),
        response.data.user_message,
        response.data.assistant_message,
      ]);
      const nextTitle = active.title ?? content.slice(0, 120);
      setConversations((current) => current.map((entry) => (entry.id === active.id
        ? { ...entry, title: nextTitle, messages_count: (entry.messages_count ?? 0) + 2 }
        : entry)));
      setActive((current) => (current && current.id === active.id
        ? { ...current, title: nextTitle, messages_count: (current.messages_count ?? 0) + 2 }
        : current));
    } catch (caught) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setDraft(content);
      handleApiError(caught, 'Unable to send your message. Nothing was saved; please retry.');
    } finally {
      setSending(false);
    }
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
      setMemoryContent('');
      setMemoryExpires('');
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError.status === 401) {
        router.replace(LOGIN_REDIRECT);
        return;
      }
      setMemoryError(apiError.message && apiError.message.trim() ? apiError.message : 'Unable to save this memory.');
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
      const apiError = caught as ApiError;
      setMemoryError(apiError.message && apiError.message.trim() ? apiError.message : 'Unable to delete this memory.');
    }
  }

  function toggleMemoryPanel(): void {
    const nextOpen = !memoryOpen;
    setMemoryOpen(nextOpen);
    if (nextOpen && !memories.length && !memoryLoading) {
      void loadMemories();
    }
  }

  if (booting) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', maxWidth: 1100 }}>
        <p style={{ color: 'var(--color-gray)' }}>Loading your AI companion…</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2.5rem', maxWidth: 1100 }}>
      <style>{`
        .ai-companion-layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 1.25rem; align-items: start; }
        .ai-companion-sidebar { display: block; }
        .ai-companion-sidebar-toggle { display: none; }
        @media (max-width: 900px) {
          .ai-companion-layout { grid-template-columns: minmax(0, 1fr); }
          .ai-companion-sidebar { display: none; }
          .ai-companion-sidebar--open { display: block; }
          .ai-companion-sidebar-toggle { display: inline-flex; }
        }
      `}</style>

      <header style={{ marginBottom: '2rem' }}>
        <span
          className="badge"
          style={{
            backgroundColor: 'var(--color-primary-pale)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-border)',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.2rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            marginBottom: '0.75rem',
            display: 'inline-flex',
          }}
        >
          AI Companion
        </span>
        <h1 style={{ color: 'var(--color-charcoal)', fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          AI Companion
        </h1>
        <p style={{ color: 'var(--color-gray)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          Ask questions, keep a conversation history, and control the memories the companion may use.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => void createConversation()} disabled={creating}>
            {creating ? 'Creating…' : 'New conversation'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={toggleMemoryPanel} aria-expanded={memoryOpen}>
            {memoryOpen ? 'Hide memory' : `Memory (${memories.length})`}
          </button>
          <button
            type="button"
            className="btn btn-secondary ai-companion-sidebar-toggle"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? 'Hide conversations' : 'Conversations'}
          </button>
        </div>
      </header>

      {chatDisabled && (
        <div role="status" style={{ marginBottom: '1.25rem', padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-primary-faint)', color: 'var(--color-charcoal)' }}>
          AI chat is not enabled yet on this platform. You can still create conversations, review history, and manage memories.
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginBottom: '1.25rem', padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-pale)', background: 'var(--color-primary-faint)', color: 'var(--color-primary-light)', display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={() => setError(null)} style={{ padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>
            Dismiss
          </button>
        </div>
      )}

      <div className="ai-companion-layout">
        <aside className={sidebarOpen ? 'ai-companion-sidebar ai-companion-sidebar--open' : 'ai-companion-sidebar'}>
          <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', padding: '1rem' }}>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-charcoal)' }}>Conversations</h2>
            {conversations.length === 0 ? (
              <p style={{ color: 'var(--color-gray)', fontSize: '0.9rem', margin: 0 }}>
                No conversations yet. Select “New conversation” to begin.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.35rem' }}>
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    {renamingId === conversation.id ? (
                      <form onSubmit={(event) => void saveRename(event, conversation.id)} style={{ display: 'grid', gap: '0.4rem' }}>
                        <input
                          aria-label="Conversation title"
                          required
                          maxLength={120}
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          style={{ width: '100%', padding: '0.45rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                        />
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Save</button>
                          <button type="button" className="btn btn-secondary" onClick={() => setRenamingId(null)} style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'stretch' }}>
                        <button
                          type="button"
                          onClick={() => { setActive(conversation); setSidebarOpen(false); }}
                          aria-pressed={active?.id === conversation.id}
                          style={{
                            flex: 1,
                            textAlign: 'left',
                            padding: '0.55rem 0.65rem',
                            borderRadius: 'var(--radius-md)',
                            border: active?.id === conversation.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                            background: active?.id === conversation.id ? 'var(--color-primary-faint)' : 'var(--color-white)',
                            color: 'var(--color-charcoal)',
                            cursor: 'pointer',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem' }}>{conversation.title ?? 'Untitled conversation'}</span>
                          <span style={{ display: 'block', color: 'var(--color-gray)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                            {conversation.messages_count ?? 0} messages · {formatTime(conversation.updated_at ?? conversation.created_at)}
                          </span>
                        </button>
                        <div style={{ display: 'grid', gap: '0.25rem' }}>
                          <button type="button" className="btn btn-secondary" aria-label={`Rename ${conversation.title ?? 'conversation'}`} onClick={() => startRename(conversation)} style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}>Rename</button>
                          <button type="button" className="btn btn-secondary" aria-label={`Delete ${conversation.title ?? 'conversation'}`} onClick={() => void deleteConversation(conversation)} style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', color: 'var(--color-primary)' }}>Delete</button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', padding: '1.25rem', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
          {!active ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-gray)', padding: '2rem' }}>
              <h2 style={{ color: 'var(--color-charcoal)', marginBottom: '0.5rem' }}>Start a conversation</h2>
              <p style={{ margin: 0 }}>Create a conversation, then ask the AI companion a question.</p>
            </div>
          ) : (
            <>
              <header style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-charcoal)' }}>{active.title ?? 'New conversation'}</h2>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--color-gray)', fontSize: '0.8rem' }}>
                  {active.messages_count ?? messages.length} messages · Owned by you
                </p>
              </header>

              {hasMore && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void loadMessages(active.id, nextBeforeId)}
                  disabled={loadingMessages}
                  style={{ alignSelf: 'center', marginBottom: '0.75rem', padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                >
                  {loadingMessages ? 'Loading…' : 'Load earlier messages'}
                </button>
              )}

              <div aria-live="polite" style={{ flex: 1, overflowY: 'auto', maxHeight: '55vh', display: 'grid', gap: '0.75rem', paddingRight: '0.25rem' }}>
                {loadingMessages && messages.length === 0 ? (
                  <p style={{ color: 'var(--color-gray)' }}>Loading conversation…</p>
                ) : messages.length === 0 ? (
                  <p style={{ color: 'var(--color-gray)' }}>No messages yet. Ask the first question below.</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        justifySelf: message.role === 'user' ? 'end' : 'start',
                        maxWidth: '85%',
                        background: message.role === 'user' ? 'var(--color-primary-faint)' : 'var(--color-off-white)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.65rem 0.85rem',
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-gray)', marginBottom: '0.25rem' }}>
                        {message.role === 'user' ? 'You' : 'AI companion'}
                      </strong>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55, overflowWrap: 'anywhere' }}>{message.content}</p>
                      <small style={{ display: 'block', marginTop: '0.3rem', color: 'var(--color-gray-light)', fontSize: '0.7rem' }}>{formatTime(message.created_at)}</small>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={(event) => void sendMessage(event)} style={{ marginTop: '0.9rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.9rem' }}>
                <label htmlFor="ai-companion-message" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  Your message
                </label>
                <textarea
                  id="ai-companion-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  maxLength={8000}
                  disabled={sending || chatDisabled}
                  placeholder={chatDisabled ? 'AI chat is not enabled yet.' : 'Ask a question about your learning journey…'}
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <small style={{ color: 'var(--color-gray-light)' }}>{draft.length}/8000</small>
                  <button type="submit" className="btn btn-primary" disabled={sending || chatDisabled || !draft.trim()}>
                    {sending ? 'Sending…' : 'Send message'}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      {memoryOpen && (
        <section style={{ marginTop: '1.5rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', padding: '1.25rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: 'var(--color-charcoal)' }}>Memory</h2>
          <p style={{ color: 'var(--color-gray)', marginTop: 0 }}>
            Only memories you explicitly add are stored. The companion is not allowed to extract memories automatically.
          </p>

          {memoryError && <p role="alert" style={{ color: 'var(--color-primary-light)' }}>{memoryError}</p>}

          <form onSubmit={(event) => void addMemory(event)} style={{ display: 'grid', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.9rem' }}>
                Memory type
                <select
                  aria-label="Memory type"
                  value={memoryType}
                  onChange={(event) => setMemoryType(event.target.value as MemoryType)}
                  style={{ padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                >
                  {(Object.keys(memoryTypeLabels) as MemoryType[]).map((type) => (
                    <option key={type} value={type}>{memoryTypeLabels[type]}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.9rem' }}>
                Expires on (optional)
                <input
                  type="date"
                  aria-label="Memory expiry date"
                  value={memoryExpires}
                  onChange={(event) => setMemoryExpires(event.target.value)}
                  style={{ padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </label>
            </div>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.9rem' }}>
              Memory content
              <textarea
                aria-label="Memory content"
                required
                maxLength={1000}
                rows={2}
                value={memoryContent}
                onChange={(event) => setMemoryContent(event.target.value)}
                placeholder="e.g. I prefer hands-on projects before theory."
                style={{ padding: '0.55rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', resize: 'vertical' }}
              />
            </label>
            <div>
              <button type="submit" className="btn btn-primary" disabled={savingMemory || !memoryContent.trim()}>
                {savingMemory ? 'Saving…' : 'Add memory'}
              </button>
            </div>
          </form>

          {memoryLoading ? (
            <p style={{ color: 'var(--color-gray)' }}>Loading memories…</p>
          ) : memories.length === 0 ? (
            <p style={{ color: 'var(--color-gray)' }}>No memories yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.6rem' }}>
              {memories.map((memory) => (
                <li key={memory.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.8rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <span className="badge" style={{ backgroundColor: 'var(--color-primary-pale)', color: 'var(--color-primary)', fontSize: '0.7rem' }}>
                      {memoryTypeLabels[memory.memory_type]}
                    </span>
                    <p style={{ margin: '0.35rem 0 0', overflowWrap: 'anywhere' }}>{memory.content}</p>
                    {memory.expires_at && <small style={{ color: 'var(--color-gray-light)' }}>Expires {formatTime(memory.expires_at)}</small>}
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => void removeMemory(memory)} style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
