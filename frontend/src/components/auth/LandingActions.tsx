'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, restoreSession, subscribeCurrentUser } from '@/lib/auth';

/** Signed-in user for the landing page (it has no shared header that restores the session). */
function useLandingUser() {
  const [user, setUser] = useState(getCurrentUser);

  useEffect(() => {
    setUser(getCurrentUser());
    const unsubscribe = subscribeCurrentUser(() => setUser(getCurrentUser()));
    void restoreSession();
    return unsubscribe;
  }, []);

  return user;
}

/** Header actions: "Sign In / Explore Courses" for guests, account link and "Continue Learning" once signed in. */
export function LandingNavActions() {
  const user = useLandingUser();

  if (!user) {
    return (
      <div className="nav-actions">
        <Link href="/login" className="nav-link nav-link--signin">Sign In</Link>
        <Link href="/courses" className="btn btn--primary btn--sm">Explore Courses</Link>
      </div>
    );
  }

  return (
    <div className="nav-actions">
      <Link href="/account" className="nav-link nav-link--signin" aria-label={`Account of ${user.name}`}>{user.name}</Link>
      <Link href="/courses" className="btn btn--primary btn--sm">Continue Learning</Link>
    </div>
  );
}

/** A call-to-action link to /courses whose label changes once the visitor is signed in. */
export function LandingCourseLink({ className, guestLabel, memberLabel }: { className: string; guestLabel: string; memberLabel: string }) {
  const user = useLandingUser();

  return <Link href="/courses" className={className}>{user ? memberLabel : guestLabel}</Link>;
}
