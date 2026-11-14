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
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Time estimate unavailable';
  return minutes >= 60 ? `${Math.round(minutes / 60 * 10) / 10} hours` : `${Math.round(minutes)} minutes`;
}

export default function CompanionRoadmapPreview({ draft, saving, onSave, onClose, closeLabel = 'Keep chatting' }: Props) {
  const coverage = draft.coverage;

  return (
    <section className={styles.preview} aria-label="AI roadmap preview">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Personal roadmap preview</span>
          <h2>{draft.title}</h2>
          <p>{draft.summary}</p>
        </div>
        <button className={styles.close} type="button" onClick={onClose} disabled={saving} aria-label="Close roadmap preview">×</button>
      </div>

      <div className={styles.scoreGrid} aria-label="Roadmap matching score">
        <div className={styles.primaryScore}>
          <span className={styles.scoreValue}>{percent(coverage.overall_percent)}</span>
          <span className={styles.scoreLabel}>Roadmap Match Score</span>
        </div>
        <div><strong>{percent(coverage.internal_percent)}</strong><span>Internal course coverage</span></div>
        <div><strong>{percent(coverage.external_percent)}</strong><span>External resource support</span></div>
      </div>
      <p className={styles.scoreNote}>Coverage describes how well the available resources match these skills. It does not measure or guarantee mastery.</p>
      {coverage.resource_status === 'unavailable' && <p className={styles.gaps} role="status">External resource search is temporarily unavailable. No unverified links were added; remaining skills are shown as gaps.</p>}

      {draft.cv_analysis && (
        <section className={styles.cvBlock} aria-label="CV analysis">
          <h3>CV analysis</h3>
          {draft.cv_analysis.cv_match_percent !== null && <p><strong>{percent(draft.cv_analysis.cv_match_percent)} CV match</strong> with the target position based on provided evidence.</p>}
          {draft.cv_analysis.strengths.length > 0 && <p><strong>Existing strengths:</strong> {draft.cv_analysis.strengths.map((entry) => `${entry.skill} (${entry.evidence})`).join('; ')}</p>}
          {draft.cv_analysis.gaps.length > 0 && <p><strong>Skills to develop:</strong> {draft.cv_analysis.gaps.join(', ')}</p>}
          {draft.cv_analysis.recommendations.length > 0 && <p><strong>Suggestions:</strong> {draft.cv_analysis.recommendations.join('; ')}</p>}
        </section>
      )}

      <div className={styles.skillBlock}>
        <h3>Skill coverage</h3>
        <div className={styles.skillList}>
          {coverage.skills.map((entry) => (
            <div className={styles.skill} key={entry.skill}>
              <span>{entry.skill}</span>
              <span>Courses {percent(entry.internal)} · External {percent(entry.external)}</span>
            </div>
          ))}
        </div>
        {coverage.gaps.length > 0 && <p className={styles.gaps}><strong>Remaining skill gaps:</strong> {coverage.gaps.join(', ')}</p>}
      </div>

      <ol className={styles.steps}>
        {draft.items.map((item) => (
          <li key={item.position} className={styles.step}>
            <span className={styles.stepIndex}>{String(item.position).padStart(2, '0')}</span>
            <div>
              <div className={styles.stepMeta}>
                {item.week_start !== undefined && item.week_end !== undefined && <span>Week {item.week_start}{item.week_end > item.week_start ? `–${item.week_end}` : ''}</span>}
                <span>{item.stage_title}</span><span>{duration(item.estimated_minutes)}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.skills.length > 0 && <div className={styles.tags}>{item.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>}
              {item.course && (
                <div className={styles.courseBlock}>
                  <Link className={styles.courseLink} href={`/courses/${encodeURIComponent(item.course.id)}`}>
                    Internal course: {item.course.title} ↗
                  </Link>
                  {item.course.reason && <p>Why this course: {item.course.reason}</p>}
                </div>
              )}
              {item.external_resources.length > 0 && (
                <div className={styles.externalBlock}>
                  <strong>External resources</strong>
                  {item.external_resources.filter((resource) => resource.url.startsWith('https://')).map((resource) => (
                    <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer">
                      {resource.title} <span>↗</span><small>{resource.topic} · {resource.reason}</small>
                    </a>
                  ))}
                </div>
              )}
              {!item.course && item.external_resources.length === 0 && <p className={styles.gapNotice}>No verified learning resource found for this step.</p>}
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        <button className="btn btn-primary" type="button" onClick={onSave} disabled={saving}>{saving ? 'Saving roadmap…' : 'Confirm and save roadmap'}</button>
        <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>{closeLabel}</button>
      </div>
    </section>
  );
}
