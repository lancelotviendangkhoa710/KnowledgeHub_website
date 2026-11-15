'use client';

import Link from 'next/link';
import type { CompanionRoadmapDraft } from '@/lib/aiRoadmapClient';
import styles from './companionRoadmapPreview.module.css';

type Props = {
  draft: CompanionRoadmapDraft;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  closeLabel?: string;
};

function percent(value: number): string {
  return `${Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)).toFixed(0)}%`;
}

function duration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Chưa có ước tính thời gian';
  return minutes >= 60 ? `${Math.round(minutes / 60 * 10) / 10} giờ` : `${Math.round(minutes)} phút`;
}

export default function CompanionRoadmapPreview({ draft, saving, onSave, onClose, closeLabel = 'Tiếp tục trò chuyện' }: Props) {
  const coverage = draft.coverage;

  return (
    <section className={styles.preview} aria-label="Xem trước lộ trình AI">
      <div className={styles.heading}>
        <div>
          <h2>{draft.title}</h2>
          <p>{draft.summary}</p>
        </div>
        <button className={styles.close} type="button" onClick={onClose} disabled={saving} aria-label="Đóng bản xem trước lộ trình">×</button>
      </div>

      <div className={styles.scoreGrid} aria-label="Độ phủ tài nguyên học tập">
        <div className={styles.primaryScore}>
          <span className={styles.scoreValue}>{percent(coverage.overall_percent)}</span>
          <span className={styles.scoreLabel}>Độ phủ tài nguyên học tập</span>
        </div>
        <div><strong>{percent(coverage.internal_percent)}</strong><span>Độ phủ khóa học trong hệ thống</span></div>
        <div><strong>{percent(coverage.external_percent)}</strong><span>Tài nguyên bên ngoài hỗ trợ</span></div>
      </div>
      <p className={styles.scoreNote}>Con số này cho biết chúng tôi tìm được bao nhiêu tài liệu cho các kỹ năng trong mục tiêu của bạn. Số thấp nghĩa là tài nguyên hiện có còn thiếu, không phải bạn hay mục tiêu của bạn bị đánh giá thấp.</p>
      <details className={styles.scoreExplanation}>
        <summary>Con số này được tính thế nào?</summary>
        <p>AI đề xuất các kỹ năng mục tiêu. Với mỗi kỹ năng, KnowledgeHub kiểm tra các khóa học đã xuất bản phù hợp và tài nguyên bên ngoài đã được xác minh. Tỷ lệ là trung bình độ phủ của các kỹ năng đó; tài nguyên bên ngoài có thể lấp chỗ trống mà khóa học của chúng tôi còn thiếu. Xem danh sách độ phủ theo kỹ năng bên dưới để biết chi tiết. Đây không phải thước đo năng lực của bạn hay bảo đảm bạn sẽ thành thạo.</p>
      </details>
      {coverage.resource_status === 'unavailable' && <p className={styles.gaps} role="status">Tìm tài nguyên bên ngoài đang tạm thời không khả dụng. Chúng tôi không thêm liên kết chưa xác minh; các kỹ năng còn ít tài nguyên được liệt kê bên dưới.</p>}

      {draft.cv_analysis && (
        <section className={styles.cvBlock} aria-label="Phân tích CV">
          <h3>Phân tích CV</h3>
          {draft.cv_analysis.encouragement && <p className={styles.encouragement}>{draft.cv_analysis.encouragement}</p>}
          {draft.cv_analysis.strengths.length > 0 ? <p><strong>CV có bằng chứng cho {draft.cv_analysis.strengths.length} trên {coverage.skills.length} kỹ năng mục tiêu.</strong> Chỉ các kỹ năng có trích dẫn trực tiếp từ PDF của bạn được tính ở đây; thiếu bằng chứng không có nghĩa là bạn thiếu kỹ năng đó.</p> : <p>CV của bạn là điểm khởi đầu. Chúng tôi chưa ghép được nội dung CV với các kỹ năng mục tiêu; điều này không đo năng lực của bạn.</p>}
          {draft.cv_analysis.strengths.length > 0 && <p><strong>Điểm mạnh hiện có:</strong> {draft.cv_analysis.strengths.map((entry) => `${entry.skill} (${entry.evidence})`).join('; ')}</p>}
          {draft.cv_analysis.gaps.length > 0 && <p><strong>Kỹ năng chưa có bằng chứng trong CV:</strong> {draft.cv_analysis.gaps.join(', ')}</p>}
          {draft.cv_analysis.recommendations.length > 0 && <p><strong>Gợi ý:</strong> {draft.cv_analysis.recommendations.join('; ')}</p>}
        </section>
      )}

      <div className={styles.skillBlock}>
        <h3>Độ phủ theo kỹ năng</h3>
        <div className={styles.skillList}>
          {coverage.skills.map((entry) => (
            <div className={styles.skill} key={entry.skill}>
              <span>{entry.skill}</span>
              <span>Khóa học {percent(entry.internal)} · Bên ngoài {percent(entry.external)}</span>
            </div>
          ))}
        </div>
        {coverage.gaps.length > 0 && <p className={styles.gaps}><strong>Kỹ năng còn ít tài nguyên học tập:</strong> {coverage.gaps.join(', ')}</p>}
      </div>

      <ol className={styles.steps}>
        {draft.items.map((item) => (
          <li key={item.position} className={styles.step}>
            <span className={styles.stepIndex}>{String(item.position).padStart(2, '0')}</span>
            <div>
              <div className={styles.stepMeta}>
                {item.week_start !== undefined && item.week_end !== undefined && <span>Tuần {item.week_start}{item.week_end > item.week_start ? `–${item.week_end}` : ''}</span>}
                <span>{item.stage_title}</span><span>{duration(item.estimated_minutes)}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.skills.length > 0 && <div className={styles.tags}>{item.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>}
              {item.course && (
                <div className={styles.courseBlock}>
                  <Link className={styles.courseLink} href={`/courses/${encodeURIComponent(item.course.id)}`}>
                    Khóa học trong hệ thống: {item.course.title} ↗
                  </Link>
                  {item.course.reason && <p>Vì sao chọn khóa này: {item.course.reason}</p>}
                </div>
              )}
              {item.external_resources.length > 0 && (
                <div className={styles.externalBlock}>
                  <strong>Tài nguyên bên ngoài</strong>
                  {item.external_resources.filter((resource) => resource.url.startsWith('https://')).map((resource) => (
                    <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer">
                      {resource.title} <span>↗</span><small>{resource.topic} · {resource.reason}</small>
                    </a>
                  ))}
                </div>
              )}
              {!item.course && item.external_resources.length === 0 && <p className={styles.gapNotice}>Chưa tìm được tài nguyên học tập đã xác minh cho bước này.</p>}
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        <button className="btn btn-primary" type="button" onClick={onSave} disabled={saving}>{saving ? 'Đang lưu lộ trình...' : 'Xác nhận và lưu lộ trình'}</button>
        <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>{closeLabel}</button>
      </div>
    </section>
  );
}
