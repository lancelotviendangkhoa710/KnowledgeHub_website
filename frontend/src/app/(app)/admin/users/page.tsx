'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountUser, AdminUserFilters, adminUserClient, AssignableRole, errorMessage, UserStatus } from '@/lib/accountClient';
import { getCurrentUser, subscribeCurrentUser } from '@/lib/auth';
import AdminTabs from '@/components/content/admin/AdminTabs';
import styles from '@/components/content/admin/admin.module.css';
import RoleConfirmForm from './RoleConfirmForm';
import UsersFilters from './UsersFilters';
import UsersPager from './UsersPager';
import { UsersEmpty, UsersLoadError, UsersLoading, UsersSignIn } from './UsersStates';
import UsersTable from './UsersTable';

export default function AdminUsersPage() {
  const [me, setMe] = useState(getCurrentUser);
  // After a reload the header restores the user from the session cookie; follow that change.
  useEffect(() => subscribeCurrentUser(() => setMe(getCurrentUser())), []);
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [filters, setFilters] = useState<AdminUserFilters>({ page: 1, sort: 'newest' }); // newest first: admins review new sign-ups
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // list failed to load: replaces the table
  const [actionError, setActionError] = useState<string | null>(null); // a status or role change failed: shown above the table
  // One request at a time: while busy, role selects, Confirm and Cancel are all disabled, so a stale
  // response can never close another account's confirmation or race a second change.
  const [busyId, setBusyId] = useState<string | null>(null);
  // A role change that touches `admin` waits here for the acting admin's password.
  const [roleChange, setRoleChange] = useState<{ user: AccountUser; role: AssignableRole } | null>(null);
  const [password, setPassword] = useState('');
  // Rows stay read-only while a request runs or an admin confirmation is open, so one action cannot clobber another.
  const locked = busyId !== null || roleChange !== null;

  const [refreshVersion, setRefreshVersion] = useState(0);
  const latestRequest = useRef(0);
  // Cancel returns focus to the role select that opened the confirmation (it is disabled until the form closes).
  const focusRoleOf = useRef<string | null>(null);
  useEffect(() => {
    if (roleChange || !focusRoleOf.current) return;
    document.querySelector<HTMLElement>(`[data-role-for="${CSS.escape(focusRoleOf.current)}"]`)?.focus();
    focusRoleOf.current = null;
  }, [roleChange]);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await adminUserClient.list(filters);
      if (requestId !== latestRequest.current) return; // a newer request superseded this one
      // The current page vanished (e.g. its last user left the filter): go back to the last page.
      if (response.data.length === 0 && response.meta.last_page < (filters.page ?? 1)) {
        setFilters({ ...filters, page: Math.max(1, response.meta.last_page) });
        return;
      }
      setUsers(response.data);
      setMeta(response.meta);
    } catch (e) {
      // Show API detail only when the server answered; a network failure has no Vietnamese text of its own.
      if (requestId === latestRequest.current) setLoadError((e as { status?: number }).status ? errorMessage(e, '') : '');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (me) void load();
  }, [me, load, refreshVersion]);

  if (!me) {
    return (
      <div className={styles.wrap}>
        <AdminTabs />
        <UsersSignIn />
      </div>
    );
  }

  async function changeStatus(user: AccountUser, status: Exclude<UserStatus, 'pending'>) {
    setBusyId(user.id);
    setActionError(null);
    try {
      await adminUserClient.setStatus(user.id, status);
      // Reload with the current filters so the row, total and pages stay correct.
      setRefreshVersion((version) => version + 1);
    } catch (e) {
      setActionError(errorMessage(e, 'Không đổi được trạng thái của tài khoản này.'));
    } finally {
      setBusyId(null);
    }
  }

  async function submitRole(user: AccountUser, role: AssignableRole, currentPassword?: string) {
    setBusyId(user.id);
    setActionError(null);
    try {
      await adminUserClient.setRole(user.id, role, currentPassword);
      setRoleChange(null);
      setPassword('');
      setRefreshVersion((version) => version + 1);
    } catch (e) {
      setActionError(errorMessage(e, 'Không đổi được vai trò của tài khoản này.'));
    } finally {
      setBusyId(null);
    }
  }

  function chooseRole(user: AccountUser, role: AssignableRole) {
    if (user.roles.length === 1 && user.roles[0] === role) return;
    setActionError(null);
    setPassword('');
    // Granting or revoking admin needs the acting admin's password (the API enforces it too).
    if (role === 'admin' || user.roles.includes('admin')) setRoleChange({ user, role });
    else void submitRole(user, role);
  }

  function cancelRoleChange() {
    focusRoleOf.current = roleChange?.user.id ?? null;
    setRoleChange(null);
    setPassword('');
  }

  return (
    <div className={styles.wrap}>
      <AdminTabs />
      <p className={styles.lead}>{meta.total} tài khoản. Mỗi tài khoản có một vai trò; đổi vai trò sẽ đăng xuất người đó.</p>

      {roleChange && (
        <RoleConfirmForm
          change={roleChange}
          password={password}
          busy={busyId !== null}
          onPassword={setPassword}
          onConfirm={() => void submitRole(roleChange.user, roleChange.role, password)}
          onCancel={cancelRoleChange}
        />
      )}

      <UsersFilters filters={filters} onChange={setFilters} />

      {actionError && <p className={styles.notice} role="alert">{actionError}</p>}

      {loading ? (
        <UsersLoading />
      ) : loadError !== null ? (
        <UsersLoadError detail={loadError} onRetry={() => setRefreshVersion((version) => version + 1)} />
      ) : users.length === 0 ? (
        <UsersEmpty />
      ) : (
        <UsersTable users={users} meId={me.id} locked={locked} onRole={chooseRole} onStatus={(user, status) => void changeStatus(user, status)} />
      )}

      <UsersPager page={meta.current_page} lastPage={meta.last_page} onPage={(page) => setFilters({ ...filters, page })} />
    </div>
  );
}
