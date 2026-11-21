'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminChecking, AdminGate } from '@/components/content/admin/AdminGate';
import styles from '@/components/content/admin/admin.module.css';
import { accountClient } from '@/lib/accountClient';
import { AuthUser, getCurrentUser, setCurrentUser, subscribeCurrentUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { TagError } from '@/lib/tagAdminClient';
import TagLibrary from './TagLibrary';

/** Login URL that brings the visitor back to this page after signing in. */
const LOGIN_PATH = '/login?redirect=/admin/tags';
/** Roles allowed to create tags; mirrors `CreateTagRequest::authorize` on the backend. */
const ALLOWED_ROLES = ['contributor', 'admin'];

/** True when the user holds a role the backend accepts for creating tags. */
function canManageTags(user: AuthUser | null): boolean {
  return !!user && (user.roles ?? []).some((role) => ALLOWED_ROLES.includes(role));
}

/**
 * `/admin/tags` route: resolves the signed-in user, then renders the tag library for
 * contributors/admins, a restricted card for other roles, or redirects guests to login.
 */
export default function TagLibraryPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [authChecked, setAuthChecked] = useState(false);
  // Set when the profile could not be loaded for a transient reason (network/5xx); the session is kept.
  const [profileError, setProfileError] = useState<string | null>(null);
  // Bumped by the Retry button to re-run the profile load.
  const [profileAttempt, setProfileAttempt] = useState(0);

  // Resolve the signed-in user (token is in memory; restore the profile if only the token is known).
  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeCurrentUser(() => {
      if (!cancelled) setUser(getCurrentUser());
    });
    const current = getCurrentUser();
    if (current) {
      setUser(current);
      setAuthChecked(true);
    } else if (!getAccessToken()) {
      router.replace(LOGIN_PATH);
    } else {
      setProfileError(null);
      accountClient
        .me()
        .then((response) => {
          if (cancelled) return;
          setCurrentUser(response.data.user);
          setUser(response.data.user);
          setAuthChecked(true);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const status = (error as TagError)?.status;
          // Only an invalid session goes back to login; transient failures keep the page and offer Retry.
          if (status === 401 || status === 403) router.replace(LOGIN_PATH);
          else setProfileError('Kiểm tra kết nối mạng rồi thử lại.');
        });
    }
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router, profileAttempt]);

  // Signing out while on the page sends the visitor to the login screen.
  useEffect(() => {
    if (authChecked && !user) router.replace(LOGIN_PATH);
  }, [authChecked, user, router]);

  if (profileError) {
    return (
      <AdminGate alert title="Không kiểm tra được quyền truy cập" text={profileError}>
        <button className={styles.btn} type="button" onClick={() => setProfileAttempt((attempt) => attempt + 1)}>Thử lại</button>
      </AdminGate>
    );
  }

  if (!authChecked || !user) return <AdminChecking />;

  if (!canManageTags(user)) {
    return (
      <AdminGate title="Không đủ quyền" text="Chỉ tài khoản người viết và quản trị viên mới tạo được thẻ. Cần tạo thẻ thì nhờ quản trị viên đổi vai trò cho bạn.">
        <Link className={styles.btn} href="/">Về trang chủ</Link>
      </AdminGate>
    );
  }

  return <TagLibrary loginUrl={LOGIN_PATH} />;
}
