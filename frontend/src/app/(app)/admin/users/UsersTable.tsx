import type { AccountUser, AssignableRole, UserStatus } from '@/lib/accountClient';
import { ASSIGNABLE_ROLES } from '@/lib/accountClient';
import styles from '@/components/content/admin/admin.module.css';
import { formatJoined, ROLE_LABEL, roleText, STATUS_LABEL, STATUS_TONE } from './usersText';

type Props = {
  users: AccountUser[];
  meId: string;
  locked: boolean;
  onRole: (user: AccountUser, role: AssignableRole) => void;
  onStatus: (user: AccountUser, status: Exclude<UserStatus, 'pending'>) => void;
};

const EDITABLE_STATUSES: Exclude<UserStatus, 'pending'>[] = ['active', 'inactive', 'banned'];

/** Bảng người dùng, mới tham gia nhất ở trên. Cuộn ngang trong khung khi màn hẹp. */
export default function UsersTable({ users, meId, locked, onRole, onStatus }: Props) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>Người dùng, mới tham gia nhất ở trên</caption>
        <thead>
          <tr>
            <th scope="col">Người dùng</th>
            <th scope="col">Vai trò</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Tham gia</th>
            <th scope="col"><span className={styles.srOnly}>Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const self = user.id === meId;
            const readOnlyRole = self || user.status === 'pending' || user.status === 'banned';
            return (
              <tr key={user.id}>
                <td className={styles.who}><b>{user.name}</b><small>{user.email}</small></td>
                <td>
                  {readOnlyRole ? (
                    roleText(user.roles)
                  ) : (
                    <select
                      className={styles.sel}
                      data-role-for={user.id}
                      aria-label={`Đổi vai trò của ${user.name}`}
                      value={user.roles.length === 1 ? user.roles[0] : ''}
                      disabled={locked}
                      onChange={(event) => onRole(user, event.target.value as AssignableRole)}
                    >
                      {user.roles.length !== 1 && <option value="" disabled>{roleText(user.roles) || 'Chưa có vai trò'}</option>}
                      {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  )}
                </td>
                <td><span className={`${styles.st} ${styles[STATUS_TONE[user.status]]}`}>{STATUS_LABEL[user.status]}</span></td>
                <td>{formatJoined(user.created_at)}</td>
                <td>
                  <div className={styles.acts}>
                    {self ? (
                      <small className={styles.mu}>Bạn</small>
                    ) : user.status === 'pending' ? (
                      <button type="button" className={`${styles.btn} ${styles.sm}`} disabled={locked} onClick={() => onStatus(user, 'active')}>Kích hoạt</button>
                    ) : (
                      <select
                        className={styles.sel}
                        aria-label={`Đổi trạng thái của ${user.name}`}
                        value={user.status}
                        disabled={locked}
                        onChange={(event) => onStatus(user, event.target.value as Exclude<UserStatus, 'pending'>)}
                      >
                        {EDITABLE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
