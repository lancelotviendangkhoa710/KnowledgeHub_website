import Link from 'next/link';
import HeroMotion from '@/components/landing/HeroMotion';
import HomeLatestCourses from '@/components/landing/HomeLatestCourses';
import { LogoMark } from '@/components/layout/Logo';
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
              <span className={s.botAv} aria-hidden="true"><LogoMark size={22} /></span>
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
