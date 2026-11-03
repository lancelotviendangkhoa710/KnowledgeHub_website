'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountUser, AdminUserFilters, adminUserClient, AssignableRole, ASSIGNABLE_ROLES, errorMessage, UserStatus } from '@/lib/accountClient';
import { getCurrentUser } from '@/lib/auth';

const STATUSES: UserStatus[] = ['active', 'pending', 'inactive', 'banned'];

export default function AdminUsersPage() {
  const me = getCurrentUser();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [filters, setFilters] = useState<AdminUserFilters>({ page: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // A role change that touches `admin` waits here for the acting admin's password.
  const [roleChange, setRoleChange] = useState<{ user: AccountUser; role: AssignableRole } | null>(null);
  const [password, setPassword] = useState('');

  const [refreshVersion, setRefreshVersion] = useState(0);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);
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
      if (requestId === latestRequest.current) setError(errorMessage(e, 'Unable to load users.'));
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (me) void load();
  }, [me, load, refreshVersion]);

  if (!me) {
    return (
      <section className="auth-page content-container">
        <div className="auth-card">
          <p className="eyebrow">Admin</p>
          <h1>Sign in required</h1>
          <p className="auth-lead">Sign in with an administrator account to manage users.</p>
          <Link className="button button--primary auth-submit" href="/login">Sign in</Link>
        </div>
      </section>
    );
  }

  async function changeStatus(user: AccountUser, status: Exclude<UserStatus, 'pending'>) {
    setBusyId(user.id);
    setError(null);
    try {
      await adminUserClient.setStatus(user.id, status);
      // Reload with the current filters so the row, total and pages stay correct.
      setRefreshVersion((version) => version + 1);
    } catch (e) {
      setError(errorMessage(e, 'Unable to update this user.'));
    } finally {
      setBusyId(null);
    }
  }

  async function submitRole(user: AccountUser, role: AssignableRole, currentPassword?: string) {
    setBusyId(user.id);
    setError(null);
    try {
      await adminUserClient.setRole(user.id, role, currentPassword);
      setRoleChange(null);
      setPassword('');
      setRefreshVersion((version) => version + 1);
    } catch (e) {
      setError(errorMessage(e, 'Unable to change this role.'));
    } finally {
      setBusyId(null);
    }
  }

  function chooseRole(user: AccountUser, role: AssignableRole) {
    if (user.roles.length === 1 && user.roles[0] === role) return;
    setError(null);
    setPassword('');
    // Granting or revoking admin needs the acting admin's password (the API enforces it too).
    if (role === 'admin' || user.roles.includes('admin')) setRoleChange({ user, role });
    else void submitRole(user, role);
  }

  return (
    <section className="account-page account-page--wide content-container">
      <p className="eyebrow">Admin</p>
      <h1>Users</h1>
      <p className="auth-lead">{meta.total} account{meta.total === 1 ? '' : 's'}. Each account has one role; changing it signs that user out.</p>

      {roleChange && (
        <form
          className="users-filters"
          onSubmit={(event) => { event.preventDefault(); void submitRole(roleChange.user, roleChange.role, password); }}
        >
          <p className="auth-lead">Change {roleChange.user.name} to <strong>{roleChange.role}</strong>? Enter your password to confirm.</p>
          <input type="password" aria-label="Your password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="button button--primary" type="submit" disabled={busyId === roleChange.user.id}>Confirm</button>
          <button className="button button--secondary" type="button" onClick={() => { setRoleChange(null); setPassword(''); }}>Cancel</button>
        </form>
      )}

      <form
        className="users-filters"
        onSubmit={(event) => { event.preventDefault(); setFilters({ ...filters, search: search.trim() || undefined, page: 1 }); }}
      >
        <input aria-label="Search name or email" placeholder="Search name or email" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} />
        <select aria-label="Filter by status" value={filters.status ?? ''} onChange={(event) => setFilters({ ...filters, status: event.target.value || undefined, page: 1 })}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by role" value={filters.role ?? ''} onChange={(event) => setFilters({ ...filters, role: event.target.value || undefined, page: 1 })}>
          <option value="">All roles</option>
          <option value="user">user</option>
          <option value="contributor">contributor</option>
          <option value="admin">admin</option>
        </select>
        <button className="button button--secondary" type="submit">Search</button>
      </form>

      {error && <p className="auth-error" role="alert">{error}</p>}

      {loading ? (
        <p className="auth-lead">Loading users...</p>
      ) : users.length === 0 ? (
        <div className="empty-state"><h3>No users found</h3><p>Try a different search or filter.</p></div>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Roles</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const self = user.id === me.id;
                return (
                  <tr key={user.id}>
                    <td data-label="Name">{user.name}</td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Roles">
                      {self || user.status === 'pending' || user.status === 'banned' ? (
                        user.roles.join(', ')
                      ) : (
                        <select
                          aria-label={`Change role of ${user.name}`}
                          value={user.roles.length === 1 ? user.roles[0] : ''}
                          disabled={busyId === user.id}
                          onChange={(event) => chooseRole(user, event.target.value as AssignableRole)}
                        >
                          {user.roles.length !== 1 && <option value="" disabled>{user.roles.join(', ') || 'no role'}</option>}
                          {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                    <td data-label="Status"><span className={`users-status users-status--${user.status}`}>{user.status}</span></td>
                    <td data-label="Action">
                      {self ? (
                        <small className="account-hint">You</small>
                      ) : user.status === 'pending' ? (
                        <button className="button button--primary users-action" disabled={busyId === user.id} onClick={() => void changeStatus(user, 'active')}>Activate</button>
                      ) : (
                        <select
                          aria-label={`Change status of ${user.name}`}
                          value={user.status}
                          disabled={busyId === user.id}
                          onChange={(event) => void changeStatus(user, event.target.value as Exclude<UserStatus, 'pending'>)}
                        >
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                          <option value="banned">banned</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta.last_page > 1 && (
        <div className="account-actions users-pager">
          <button className="button button--secondary" disabled={meta.current_page <= 1} onClick={() => setFilters({ ...filters, page: meta.current_page - 1 })}>Previous</button>
          <span>Page {meta.current_page} of {meta.last_page}</span>
          <button className="button button--secondary" disabled={meta.current_page >= meta.last_page} onClick={() => setFilters({ ...filters, page: meta.current_page + 1 })}>Next</button>
        </div>
      )}
    </section>
  );
}
