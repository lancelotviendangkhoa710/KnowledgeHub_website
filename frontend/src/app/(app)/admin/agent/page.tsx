'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AccountUser, adminUserClient, errorMessage } from '@/lib/accountClient';
import { agentWorkflowClient, AdminAgentProposal } from '@/lib/agentWorkflowClient';
import { useAgentAccess } from '@/lib/useAgentAccess';
import styles from '@/components/agent/agentTools.module.css';

export default function AdminAgentPage() {
  const { user, checking } = useAgentAccess();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [usersOwnerId, setUsersOwnerId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [instruction, setInstruction] = useState('');
  const [proposal, setProposal] = useState<AdminAgentProposal | null>(null);
  const [proposalActorId, setProposalActorId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'search' | 'plan' | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Only the newest account listing may write results: the initial page load
  // must never overwrite a search that finished later.
  const listRequest = useRef(0);

  const allowed = user?.roles?.includes('admin') ?? false;
  const visibleUsers = usersOwnerId === user?.id ? users : [];
  const visibleProposal = proposalActorId === user?.id ? proposal : null;

  useEffect(() => {
    const actorId = user?.id;
    if (!allowed || !actorId) return;
    const requestId = ++listRequest.current;
    let active = true;
    void adminUserClient.list({ page: 1 }).then((response) => {
      if (!active || requestId !== listRequest.current) return;
      setUsers(response.data);
      setUsersOwnerId(actorId);
    }).catch(() => { /* The search form can retry with a visible error. */ });
    return () => { active = false; };
  }, [allowed, user?.id]);

  async function findUsers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || busy) return;
    setBusy('search');
    setError(null);
    const requestId = ++listRequest.current;
    try {
      const response = await adminUserClient.list({ search: search.trim() || undefined, page: 1 });
      if (requestId !== listRequest.current) return;
      setUsers(response.data);
      setUsersOwnerId(user!.id);
      setTargetUserId('');
      setProposal(null);
    } catch (caught) {
      if (requestId === listRequest.current) setError(errorMessage(caught, 'Không tìm được tài khoản.'));
    } finally {
      if (requestId === listRequest.current) setBusy(null);
    }
  }

  async function plan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || !targetUserId || !visibleUsers.some((target) => target.id === targetUserId) || busy) return;
    setBusy('plan');
    setError(null);
    setNotice(null);
    setProposal(null);
    setPassword('');
    try {
      const response = await agentWorkflowClient.planAdminAction(instruction.trim(), targetUserId);
      setProposal(response.data);
      setProposalActorId(user!.id);
    } catch (caught) {
      setError(errorMessage(caught, 'Không lập được đề xuất. Hãy nêu rõ thao tác và giá trị cần đổi.'));
    } finally {
      setBusy(null);
    }
  }

  async function confirm() {
    if (!allowed || !visibleProposal || busy) return;
    setBusy('confirm');
    setError(null);
    try {
      await agentWorkflowClient.confirmAdminAction(visibleProposal.approval_id, password || undefined);
      setNotice(`Đã thực hiện: ${visibleProposal.summary}`);
      setProposal(null);
      setPassword('');
      setInstruction('');
    } catch (caught) {
      setError(errorMessage(caught, 'Không thực hiện được. Hãy tạo đề xuất mới nếu thông tin đã thay đổi hoặc hết hạn.'));
      // An invalid password can be retried against the same approval; only a
      // consumed, expired or stale approval has to be thrown away.
      if ((caught as { status?: number }).status !== 422) {
        setProposal(null);
        setPassword('');
      }
    } finally {
      setBusy(null);
    }
  }

  return <main className={styles.page}>
    <p className={styles.eyebrow}>Admin</p>
    <h1>Trợ lý quản trị</h1>
    <p className={styles.lead}>Trợ lý chỉ đề xuất thay đổi vai trò hoặc trạng thái của một tài khoản. Mọi thao tác phải được bạn xem và chấp nhận trước khi thực hiện.</p>
    {checking ? <p role="status">Đang kiểm tra quyền truy cập...</p> : !user ? <div className={styles.card}><p>Hãy đăng nhập bằng tài khoản Admin.</p><Link className="btn btn-primary" href="/login?redirect=/admin/agent">Đăng nhập</Link></div> : !allowed ? <div className={styles.card} role="alert">Chỉ Admin mới có thể dùng trợ lý quản trị.</div> : <>
      <form className={`${styles.card} ${styles.form}`} onSubmit={(event) => void findUsers(event)}>
        <label className={styles.field}>Tìm tài khoản theo tên hoặc email
          <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} disabled={busy !== null} />
        </label>
        <button className="btn btn-secondary" type="submit" disabled={busy !== null}>{busy === 'search' ? 'Đang tìm...' : 'Tìm tài khoản'}</button>
      </form>
      <form className={`${styles.card} ${styles.form}`} onSubmit={(event) => void plan(event)}>
        <label className={styles.field}>Tài khoản đích
          <select required value={targetUserId} disabled={busy !== null} onChange={(event) => { setTargetUserId(event.target.value); setProposal(null); }}>
            <option value="">Chọn tài khoản</option>
            {visibleUsers.filter((target) => target.id !== user.id).map((target) => <option key={target.id} value={target.id}>{target.name} ({target.email}) — {target.roles.join(', ')} / {target.status}</option>)}
          </select>
        </label>
        <label className={styles.field}>Yêu cầu quản trị
          <textarea required rows={3} minLength={5} maxLength={500} value={instruction} disabled={busy !== null} onChange={(event) => { setInstruction(event.target.value); setProposal(null); }} placeholder="Ví dụ: chuyển tài khoản này thành Contributor" />
        </label>
        <p className={styles.hint}>Chỉ hỗ trợ đổi vai trò giữa User, Contributor, Admin hoặc đổi trạng thái hợp lệ. Hệ thống sẽ kiểm tra quyền và trạng thái tài khoản lần nữa khi bạn chấp nhận.</p>
        <button className="btn btn-primary" type="submit" disabled={busy !== null || !targetUserId || instruction.trim().length < 5}>{busy === 'plan' ? 'Đang lập đề xuất...' : 'Xem đề xuất'}</button>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.success} role="status">{notice}</p>}
      {visibleProposal && <section className={styles.card} aria-label="Đề xuất cần chấp nhận">
        <h2>Kiểm tra trước khi thực hiện</h2>
        <p><strong>Tài khoản:</strong> {visibleProposal.target_name}</p>
        <p><strong>Thao tác:</strong> {visibleProposal.action}</p>
        <p><strong>Giá trị mới:</strong> {visibleProposal.value}</p>
        <p><strong>Tóm tắt:</strong> {visibleProposal.summary}</p>
        <p className={styles.hint}>Đề xuất hết hạn: {new Date(visibleProposal.expires_at).toLocaleString('vi-VN')}.</p>
        {visibleProposal.action.includes('role') && <label className={styles.field}>Mật khẩu Admin hiện tại (bắt buộc khi cấp hoặc thu hồi quyền Admin)
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy !== null} />
        </label>}
        <div className={styles.actions}>
          <button className="btn btn-primary" type="button" onClick={() => void confirm()} disabled={busy !== null}>{busy === 'confirm' ? 'Đang thực hiện...' : 'Tôi chấp nhận và thực hiện'}</button>
          <button className="btn btn-secondary" type="button" disabled={busy !== null} onClick={() => { setProposal(null); setPassword(''); }}>Hủy đề xuất</button>
        </div>
      </section>}
    </>}
  </main>;
}
