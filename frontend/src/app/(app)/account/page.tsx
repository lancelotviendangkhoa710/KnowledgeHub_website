'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import authStyles from '@/components/auth/authForm.module.css';
import styles from '@/components/account/account.module.css';
import ProfileCard from '@/components/account/ProfileCard';
import { useAccountUser } from '@/components/account/useAccountUser';
import ActivityHeatmap from '@/components/profile/ActivityHeatmap';
import ActivityHistory from '@/components/profile/ActivityHistory';
import FeaturedRoadmaps from '@/components/profile/FeaturedRoadmaps';
import RoadmapsTab from '@/components/profile/RoadmapsTab';
import Tabs, { useTabParam } from '@/components/profile/Tabs';
import { useMyRoadmaps } from '@/components/profile/useMyRoadmaps';
import p from '@/components/profile/profile.module.css';

const TAB_IDS = ['overview', 'roadmaps'] as const;
type ProfileTab = (typeof TAB_IDS)[number];

/** PRF-02, RMR-04, RMR-05, PRF-08, PRF-09: trang hồ sơ hai cột. Đổi tên, mật khẩu, xóa tài khoản nằm ở /account/settings. */
export default function AccountPage() {
  const { user, loadError } = useAccountUser();
  const { roadmaps, loading, error, reload } = useMyRoadmaps(user?.id ?? null);
  // PRF-08, PRF-09: bảng hoạt động và lịch sử nằm trong tab Tổng quan.
  const [tab, setTab] = useTabParam<ProfileTab>(TAB_IDS, 'overview');
  const [activityDate, setActivityDate] = useState<string | null>(null); // ngày đang lọc ở Lịch sử hoạt động
  const userId = user?.id ?? null;

  // Bộ lọc ngày thuộc về tài khoản đang xem; đổi tài khoản thì bỏ.
  useEffect(() => { setActivityDate(null); }, [userId]);

  if (!user) {
    return (
      <div className={authStyles.acct}>
        <h1>Cần đăng nhập</h1>
        <section className={authStyles.panel}>
          <p>Đăng nhập để xem và quản lý tài khoản của bạn.</p>
          <Link className={authStyles.btn} href="/login?redirect=%2Faccount">Đăng nhập</Link>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.profile}>
        <ProfileCard user={user} />
        <div className={styles.main}>
          {loadError && <p className={styles.notice} role="alert">{loadError}</p>}
          <div>
            <Tabs<ProfileTab>
              label="Nội dung hồ sơ"
              idPrefix="profile"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'overview', label: 'Tổng quan' },
                { id: 'roadmaps', label: 'Lộ trình', count: loading || error ? undefined : roadmaps.length },
              ]}
            />
            <div role="tabpanel" id="profile-panel-overview" aria-labelledby="profile-tab-overview" tabIndex={0} hidden={tab !== 'overview'} className={p.panel}>
              <FeaturedRoadmaps roadmaps={roadmaps} loading={loading} error={error} onRetry={() => void reload()} onShowAll={() => setTab('roadmaps')} />
              <ActivityHeatmap userId={user.id} selected={activityDate} onSelect={setActivityDate} />
              <ActivityHistory userId={user.id} date={activityDate} onClearDate={() => setActivityDate(null)} />
            </div>
            <div role="tabpanel" id="profile-panel-roadmaps" aria-labelledby="profile-tab-roadmaps" tabIndex={0} hidden={tab !== 'roadmaps'} className={p.panel}>
              <RoadmapsTab roadmaps={roadmaps} loading={loading} error={error} onRetry={() => void reload()} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
