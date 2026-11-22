'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { importanceTier, LEVEL_LABELS } from '@/components/profile/roadmapMeta';
import { fetchArticlesPage } from '@/lib/contentClient';
import { roadmapClient, RoadmapItemWrite } from '@/lib/roadmapClient';
import { roadmapTemplates, TEMPLATE_LEVEL_TO_ROADMAP_LEVEL } from '@/data/roadmapTemplates';
import type { Article } from '@/types/content';
import type { LearningRoadmap, RoadmapLevel } from '@/types/learning';
import s from './roadmapEditor.module.css';

type Course = { id: string; slug: string; title: string; category: string };
type Step = {
  key: string;
  id?: string;
  articleId: string | null;
  title: string;
  description: string;
  hours: string;
  importance: number | null;
  note: string;
  show: { hours: boolean; importance: boolean; note: boolean };
};

let keySeed = 0;
const nextKey = () => `step-${++keySeed}`;

function toCourse(article: Article): Course {
  return {
    id: article.id,
    slug: article.slug,
    title: article.published_version?.title ?? article.latest_version?.title ?? article.slug,
    category: article.category?.name ?? 'Chưa phân loại',
  };
}

function blankStep(partial: Partial<Step> = {}): Step {
  return {
    key: nextKey(), articleId: null, title: '', description: '', hours: '', importance: null, note: '',
    // Giờ học và mức độ quan trọng luôn hiện trên một hàng; chỉ chú thích là bật/tắt.
    show: { hours: true, importance: true, note: false }, ...partial,
  };
}

function fromRoadmap(roadmap: LearningRoadmap): Step[] {
  return [...roadmap.items].sort((a, b) => a.position - b.position).map((item) => blankStep({
    id: item.id,
    articleId: item.article_id,
    title: item.title,
    description: item.description ?? '',
    hours: item.study_hours == null ? '' : String(item.study_hours),
    importance: item.importance ?? null,
    note: item.note ?? '',
    show: { hours: true, importance: true, note: Boolean(item.note) },
  }));
}

/** Kiểm tra phía trình duyệt, cùng giới hạn với backend (LRN-BE-01/02). */
function validate(title: string, goal: string, weeks: string, steps: Step[]): string | null {
  if (!title.trim()) return 'Nhập tên lộ trình.';
  if (!goal.trim()) return 'Nhập mục tiêu của lộ trình.';
  if (weeks && !(Number.isInteger(Number(weeks)) && Number(weeks) >= 1 && Number(weeks) <= 104)) return 'Thời lượng phải là số tuần từ 1 đến 104.';
  if (steps.length === 0) return 'Thêm ít nhất một bước.';
  for (const [index, step] of steps.entries()) {
    const at = `Bước ${index + 1}`;
    if (!step.title.trim()) return `${at}: nhập tên bước.`;
    if (step.show.hours && step.hours) {
      const hours = Number(step.hours);
      if (!(hours > 0 && hours <= 999) || !/^\d+(\.\d)?$/.test(step.hours)) return `${at}: thời gian học từ 0,5 đến 999 giờ, tối đa 1 chữ số thập phân.`;
    }
    if (step.show.importance && step.importance != null && !(step.importance >= 0 && step.importance <= 100)) return `${at}: mức độ quan trọng từ 0 đến 100.`;
    if (step.show.note && step.note.length > 1000) return `${at}: chú thích tối đa 1000 ký tự.`;
  }
  return null;
}

function itemPayload(step: Step, position: number): RoadmapItemWrite {
  return {
    position,
    title: step.title.trim(),
    description: step.description.trim() || null,
    article_id: step.articleId,
    study_hours: step.show.hours && step.hours ? Number(step.hours) : null,
    importance: step.show.importance ? step.importance : null,
    note: step.show.note && step.note.trim() ? step.note.trim() : null,
  };
}

/** LRN-FE-02: tạo hoặc sửa lộ trình. `roadmap` có giá trị nghĩa là đang sửa. */
export default function RoadmapEditor({ roadmap, templateId }: { roadmap?: LearningRoadmap; templateId?: string | null }) {
  const router = useRouter();
  const editing = Boolean(roadmap);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [courseError, setCourseError] = useState(false);
  const [template] = useState<string>(roadmap ? '' : (templateId ?? ''));
  const [title, setTitle] = useState(roadmap?.title ?? '');
  const [goal, setGoal] = useState(roadmap?.goal ?? '');
  const [level, setLevel] = useState<RoadmapLevel | ''>(roadmap?.level ?? '');
  const [weeks, setWeeks] = useState(roadmap?.duration_weeks ? String(roadmap.duration_weeks) : '');
  const [steps, setSteps] = useState<Step[]>(() => (roadmap ? fromRoadmap(roadmap) : []));
  const [picker, setPicker] = useState<{ open: boolean; forKey: string | null }>({ open: false, forKey: null });
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const appliedTemplate = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchArticlesPage({ page: 1, perPage: 100 })
      .then((page) => { if (active) setCourses(page.items.map(toCourse)); })
      .catch(() => { if (active) { setCourses([]); setCourseError(true); } });
    return () => { active = false; };
  }, []);

  const bySlug = useMemo(() => new Map((courses ?? []).map((course) => [course.slug, course])), [courses]);
  const byId = useMemo(() => new Map((courses ?? []).map((course) => [course.id, course])), [courses]);

  // Áp dụng mẫu khi đã có danh sách khóa học (cần id thật của bài viết theo slug).
  useEffect(() => {
    if (editing || courses === null || !template || appliedTemplate.current === template) return;
    const chosen = roadmapTemplates.find((entry) => entry.id === template);
    if (!chosen) return;
    appliedTemplate.current = template;
    setTitle(`${chosen.role} — ${chosen.level}`);
    setGoal(chosen.summary);
    setLevel(TEMPLATE_LEVEL_TO_ROADMAP_LEVEL[chosen.level]);
    setSteps(chosen.stages.map((stage) => blankStep({
      articleId: bySlug.get(stage.courseSlug)?.id ?? null,
      title: stage.title,
      description: stage.description,
    })));
  }, [editing, courses, template, bySlug]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (picker.open && !dialog.open) dialog.showModal();
    if (!picker.open && dialog.open) dialog.close();
  }, [picker.open]);

  function patch(key: string, change: Partial<Step>) {
    setSteps((current) => current.map((step) => (step.key === key ? { ...step, ...change } : step)));
  }
  /** Bật/tắt một khung chi tiết; đọc trạng thái mới nhất để hai lần bấm liền nhau không ghi đè nhau. */
  function toggleField(key: string, field: keyof Step['show'], on: boolean) {
    setSteps((current) => current.map((step) => (step.key !== key ? step : {
      ...step,
      show: { ...step.show, [field]: on },
    })));
  }
  function move(index: number, delta: number) {
    setSteps((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function choose(course: Course) {
    if (picker.forKey) {
      setSteps((current) => current.map((step) => (step.key === picker.forKey
        ? { ...step, articleId: course.id, title: step.title.trim() ? step.title : course.title } : step)));
    } else {
      setSteps((current) => [...current, blankStep({ articleId: course.id, title: course.title })]);
    }
    setPicker({ open: false, forKey: null });
  }

  const totalHours = steps.reduce((sum, step) => sum + (step.show.hours && Number(step.hours) > 0 ? Number(step.hours) : 0), 0);
  const required = steps.filter((step) => step.show.importance && (step.importance ?? 0) >= 80).length;
  const used = new Set(steps.map((step) => step.articleId).filter(Boolean));
  const visibleCourses = (courses ?? []).filter((course) => `${course.title} ${course.category}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function save(event: FormEvent) {
    event.preventDefault();
    const problem = validate(title, goal, weeks, steps);
    if (problem) { setError(problem); return; }
    setError(null);
    setSaving(true);
    const fields = {
      title: title.trim(),
      goal: goal.trim(),
      level: level || null,
      duration_weeks: weeks ? Number(weeks) : null,
    };
    let roadmapId = roadmap?.id ?? null;
    try {
      if (!roadmap) {
        const created = await roadmapClient.create({ ...fields, source_template: template || null });
        roadmapId = created.data.id;
        for (const [index, step] of steps.entries()) await roadmapClient.createItem(created.data.id, itemPayload(step, index + 1));
      } else {
        await roadmapClient.update(roadmap.id, fields);
        const kept = new Set(steps.map((step) => step.id).filter(Boolean));
        for (const item of roadmap.items) if (!kept.has(item.id)) await roadmapClient.removeItem(roadmap.id, item.id);
        // (roadmap_id, position) là duy nhất: đẩy các bước giữ lại ra vùng tạm trước khi xếp lại thứ tự.
        const existing = steps.filter((step) => step.id);
        for (const [index, step] of existing.entries()) await roadmapClient.updateItem(roadmap.id, step.id as string, { position: 1000 + index });
        for (const [index, step] of steps.entries()) {
          if (step.id) await roadmapClient.updateItem(roadmap.id, step.id, itemPayload(step, index + 1));
          else await roadmapClient.createItem(roadmap.id, itemPayload(step, index + 1));
        }
      }
      router.push(`/learning/my-roadmaps/${encodeURIComponent(roadmapId as string)}`);
    } catch (caught) {
      const status = (caught as { status?: number }).status;
      setSaving(false);
      if (status === 401) { setError('Phiên đăng nhập đã hết. Hãy đăng nhập lại rồi lưu.'); return; }
      setError(roadmapId && !roadmap
        ? 'Đã tạo lộ trình nhưng chưa lưu đủ các bước. Mở lộ trình để kiểm tra rồi sửa lại.'
        : 'Không lưu được lộ trình. Kiểm tra các trường rồi thử lại.');
      if (roadmapId && !roadmap) router.push(`/learning/my-roadmaps/${encodeURIComponent(roadmapId)}/edit`);
    }
  }

  return (
    <form className={s.wrap} onSubmit={save} noValidate>
      <nav className={s.crumbs} aria-label="Đường dẫn">
        <Link href="/learning/roadmaps">Lộ trình</Link><span aria-hidden="true">/</span>
        {roadmap
          ? <><Link href={`/learning/my-roadmaps/${encodeURIComponent(roadmap.id)}`}>{roadmap.title}</Link><span aria-hidden="true">/</span><span>Chỉnh sửa</span></>
          : <span>Tạo lộ trình mới</span>}
      </nav>
      <header className={s.head}>
        <h1>{editing ? 'Chỉnh sửa lộ trình' : 'Tạo lộ trình mới'}</h1>
        <p>Đặt tên, chọn mẫu khởi đầu nếu muốn, rồi thêm các khóa học theo thứ tự cần học.</p>
      </header>

      <div className={s.layout}>
        <div className={s.main}>
          <section className={s.card} aria-labelledby="rm-info">
            <h2 id="rm-info">Thông tin chung</h2>
            <div className={s.field}>
              <label htmlFor="rm-title">Tên lộ trình *</label>
              <input id="rm-title" value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} placeholder="vd: Backend Laravel trong 10 tuần" />
            </div>
            <div className={s.field}>
              <label htmlFor="rm-goal">Mục tiêu *</label>
              <textarea id="rm-goal" value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} placeholder="Bạn muốn đạt được gì sau lộ trình này?" />
            </div>
            <div className={s.row2}>
              <div className={s.field}>
                <label htmlFor="rm-level">Trình độ <span className={s.optional}>(không bắt buộc)</span></label>
                <select id="rm-level" value={level} onChange={(event) => setLevel(event.target.value as RoadmapLevel | '')}>
                  <option value="">Chưa chọn</option>
                  {(Object.keys(LEVEL_LABELS) as RoadmapLevel[]).map((key) => <option key={key} value={key}>{LEVEL_LABELS[key]}</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label htmlFor="rm-weeks">Thời lượng dự kiến (tuần)</label>
                <input id="rm-weeks" type="number" min={1} max={104} inputMode="numeric" value={weeks} onChange={(event) => setWeeks(event.target.value)} placeholder="vd: 10" />
              </div>
            </div>
          </section>

          <section className={s.card} aria-labelledby="rm-steps">
            <h2 id="rm-steps">Các bước trong lộ trình</h2>
            <p className={s.hint}>Mỗi bước gắn một khóa học (hoặc để tự do), đặt thời gian học, mức độ quan trọng (/100) và thêm chú thích nếu cần.</p>
            {courseError && <p className={s.warn} role="status">Không tải được danh sách khóa học. Bạn vẫn thêm được bước tự do.</p>}
            {steps.length === 0 && <p className={s.empty}>Chưa có bước nào. Thêm khóa học đầu tiên để bắt đầu.</p>}
            <ol className={s.steps}>
              {steps.map((step, index) => {
                const course = step.articleId ? byId.get(step.articleId) : undefined;
                const tier = importanceTier(step.importance ?? 0);
                return (
                  <li key={step.key} className={s.step}>
                    <div className={s.stepHead}>
                      <span className={s.num} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <input aria-label={`Tên bước ${index + 1}`} value={step.title} maxLength={255} onChange={(event) => patch(step.key, { title: event.target.value })} placeholder="Tên bước" />
                      <button type="button" className={s.icon} onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Đưa bước ${index + 1} lên`}>↑</button>
                      <button type="button" className={s.icon} onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label={`Đưa bước ${index + 1} xuống`}>↓</button>
                      <button type="button" className={`${s.icon} ${s.danger}`} onClick={() => setSteps((current) => current.filter((entry) => entry.key !== step.key))} aria-label={`Xóa bước ${index + 1}`}>×</button>
                    </div>
                    <div className={s.stepBody}>
                      <div className={`${s.course} ${step.articleId ? s.courseOn : ''}`}>
                        <span className={s.courseText}>
                          {step.articleId
                            ? <><b>{course?.title ?? 'Khóa học đã gắn'}</b><small>{course?.category ?? ''}</small></>
                            : <small>Chưa gắn khóa học.{step.description ? ` ${step.description}` : ''}</small>}
                        </span>
                        <button type="button" className={s.btnSm} onClick={() => setPicker({ open: true, forKey: step.key })} disabled={courses === null}>{step.articleId ? 'Đổi' : 'Gắn khóa học'}</button>
                        {step.articleId && <button type="button" className={s.btnSm} onClick={() => patch(step.key, { articleId: null })}>Gỡ</button>}
                      </div>
                      <div className={s.meta}>
                        <div className={s.metaItem}>
                          <label htmlFor={`${step.key}-hours`}>Thời gian học</label>
                          <span className={s.unit}>
                            <input id={`${step.key}-hours`} type="number" min={0.5} max={999} step={0.5} placeholder="–" value={step.hours} onChange={(event) => patch(step.key, { hours: event.target.value })} />
                            giờ
                          </span>
                        </div>
                        <div className={`${s.metaItem} ${s.metaGrow}`} data-empty={step.importance == null || undefined}>
                          <label htmlFor={`${step.key}-imp`}>Mức độ quan trọng</label>
                          <input type="range" min={0} max={100} step={5} value={step.importance ?? 0} onChange={(event) => patch(step.key, { importance: Number(event.target.value) })} aria-label={`Kéo để chỉnh mức độ quan trọng của bước ${index + 1}`} />
                          <span className={s.unit}>
                            <input id={`${step.key}-imp`} type="number" min={0} max={100} placeholder="–" value={step.importance ?? ''} onChange={(event) => patch(step.key, { importance: event.target.value === '' ? null : Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} />
                            /100
                          </span>
                          {step.importance != null && <span className={`${s.tier} ${s[`tier_${tier.tone}`]}`}>{tier.label}</span>}
                        </div>
                      </div>
                      {step.show.note ? (
                        <div className={s.noteBox}>
                          <label htmlFor={`${step.key}-note`} className={s.srOnly}>Chú thích của bước {index + 1}</label>
                          <textarea id={`${step.key}-note`} value={step.note} maxLength={1000} rows={2} onChange={(event) => patch(step.key, { note: event.target.value })} placeholder="Chú thích riêng cho bước này" />
                          <button type="button" className={s.x} onClick={() => toggleField(step.key, 'note', false)} aria-label={`Bỏ chú thích của bước ${index + 1}`}>×</button>
                        </div>
                      ) : (
                        <button type="button" className={s.linkBtn} onClick={() => toggleField(step.key, 'note', true)}>＋ Thêm chú thích</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className={s.addRow}>
              <button type="button" className={s.btnDashed} onClick={() => setPicker({ open: true, forKey: null })} disabled={courses === null}>＋ Thêm khóa học</button>
              <button type="button" className={s.btnDashed} onClick={() => setSteps((current) => [...current, blankStep({ title: 'Bước mới' })])}>＋ Thêm bước tự do</button>
            </div>
          </section>

          {error && <p className={s.error} role="alert">{error}</p>}
          <div className={s.foot}>
            <Link className={s.btnGhost} href={roadmap ? `/learning/my-roadmaps/${encodeURIComponent(roadmap.id)}` : '/learning/roadmaps'}>Hủy</Link>
            <button type="submit" className={s.btnPrimary} disabled={saving}>{saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo lộ trình'}</button>
          </div>
        </div>

        <aside className={s.side} aria-label="Tóm tắt">
          <div className={s.card}>
            <h2>Tóm tắt</h2>
            <dl className={s.stats}>
              <div><dt>Số bước</dt><dd>{steps.length}</dd></div>
              <div><dt>Khóa học đã gắn</dt><dd>{steps.filter((step) => step.articleId).length}</dd></div>
              <div><dt>Tổng thời gian học</dt><dd>{totalHours ? `${totalHours} giờ` : 'Chưa đặt'}</dd></div>
              <div><dt>Bước bắt buộc (≥ 80)</dt><dd>{required}</dd></div>
            </dl>
          </div>
        </aside>
      </div>

      <dialog ref={dialogRef} className={s.dialog} onClose={() => setPicker({ open: false, forKey: null })} aria-labelledby="rm-picker-title">
        <div className={s.dialogHead}>
          <h2 id="rm-picker-title">Chọn khóa học</h2>
          <button type="button" className={s.btnSm} onClick={() => setPicker({ open: false, forKey: null })}>Đóng</button>
        </div>
        <input className={s.search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm khóa học…" aria-label="Tìm khóa học" />
        <ul className={s.pickList}>
          {visibleCourses.map((course) => (
            <li key={course.id}>
              <button type="button" onClick={() => choose(course)}>
                <span><b>{course.title}</b><small>{course.category}</small></span>
                {used.has(course.id) && <span className={s.used}>Đã có</span>}
              </button>
            </li>
          ))}
          {visibleCourses.length === 0 && <li className={s.empty}>Không tìm thấy khóa học.</li>}
        </ul>
      </dialog>
    </form>
  );
}
