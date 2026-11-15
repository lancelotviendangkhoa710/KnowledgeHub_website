import Link from 'next/link';
import HeroMotion from '@/components/landing/HeroMotion';
import HomeLatestCourses from '@/components/landing/HomeLatestCourses';
import s from '@/components/landing/home.module.css';
import { roadmapTemplates } from '@/data/roadmapTemplates';

/** Mô tả ngắn tiếng Việt cho từng nghề trong danh sách lộ trình mẫu. */
const ROLE_SUMMARY: Record<string, string> = {
  'Data Engineer': 'Từ SQL và pipeline đầu tiên đến hệ thống dữ liệu chạy ổn định.',
  'Frontend Developer': 'Từ HTML, CSS và JavaScript đến ứng dụng web có kiểm thử.',
  'AI Engineer': 'Từ nền tảng toán và Python đến đưa mô hình vào sản phẩm.',
};

/** Gom các lộ trình mẫu theo nghề, giữ thứ tự xuất hiện. */
const roles = Array.from(new Set(roadmapTemplates.map((t) => t.role))).map((role) => ({
  role,
  levels: roadmapTemplates.filter((t) => t.role === role),
}));

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);

export default function HomePage() {
  return (
    <>
      <HeroMotion className={s.hero}>
        <div className={s.ghost} aria-hidden="true" data-motion="ghost">KNOWLEDGE</div>
        <div className={s.disc} aria-hidden="true" data-motion="disc" />
        <div className={s.heroInner}>
          <div>
            <h1 data-motion="item">KnowledgeHub</h1>
            <p className={s.lead} data-motion="item">
              Khóa học có chọn lọc, xếp thành lộ trình có khóa học cần học trước. Trợ lý AI nhớ mục tiêu của bạn và gợi ý bước tiếp theo.
            </p>
            <div className={s.cta} data-motion="item">
              <Link className={`${s.btn} ${s.btnLight}`} href="/courses">Xem khóa học</Link>
              <Link className={`${s.btn} ${s.btnLine}`} href="/ai/companion">Tạo lộ trình bằng AI</Link>
            </div>
          </div>
          <div className={s.prev} aria-label="Ví dụ một lộ trình" data-motion="item">
            <h3>Data Engineer, trình độ Intermediate</h3>
            <p className={s.prevNote}>Ví dụ minh họa, 3 trên 5 khóa đã xong</p>
            <div className={s.bar} aria-hidden="true"><b style={{ width: '60%' }} /></div>
            <ol className={s.steps}>
              <li><span className={`${s.dot} ${s.done}`}><CheckIcon /></span><span className={s.nm}>Database, giao dịch và đồng thời</span></li>
              <li><span className={`${s.dot} ${s.done}`}><CheckIcon /></span><span className={s.nm}>Thiết kế pipeline ETL và ELT</span></li>
              <li><span className={`${s.dot} ${s.now}`} /><span className={s.nm}>Kiểm thử và quan sát pipeline<small>Đang học</small></span></li>
              <li className={s.lock}><span className={s.dot}><LockIcon /></span><span className={s.nm}>Hệ thống phân tán và độ tin cậy<small>Cần học xong khóa ở trên</small></span></li>
            </ol>
          </div>
        </div>
      </HeroMotion>

      <div className={s.wrap}>
        <HomeLatestCourses />

        <section className={s.sec}>
          <div className={s.secHead}>
            <h2>Lộ trình theo nghề</h2>
            <Link href="/learning/roadmaps">Xem tất cả lộ trình mẫu</Link>
          </div>
          <div>
            {roles.map(({ role, levels }) => (
              <div className={s.pathRow} key={role}>
                <h3>{role}</h3>
                <p>{ROLE_SUMMARY[role] ?? 'Lộ trình mẫu theo từng trình độ.'}</p>
                <div className={s.levels}>
                  {levels.map((t, i) => (
                    <Link key={t.id} href="/learning/roadmaps">
                      {t.level}{i === 0 ? `, ${t.duration.replace('–', ' đến ').replace('weeks', 'tuần')}` : ''}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={s.ai}>
          <div>
            <h2>Hỏi trợ lý khi chưa biết học gì tiếp</h2>
            <p>Trợ lý đọc lộ trình và tiến độ của bạn, rồi gợi ý khóa học tiếp theo hoặc giải thích chỗ bạn chưa hiểu.</p>
            <Link className={s.btn} href="/ai/companion">Mở trợ lý AI</Link>
          </div>
          <div className={s.chat} aria-label="Ví dụ hội thoại">
            <div className={s.me}>Mình học xong ETL và ELT rồi, nên học gì tiếp?</div>
            <div className={s.bot}>
              <span className={s.botAv} aria-hidden="true" />
              <div className={s.botTxt}>
                <p>
                  Bạn nên học <strong>Kiểm thử và quan sát pipeline</strong>. Khóa này dùng đúng phần ETL bạn vừa xong, và là điều kiện để mở khóa Hệ thống phân tán và độ tin cậy.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
