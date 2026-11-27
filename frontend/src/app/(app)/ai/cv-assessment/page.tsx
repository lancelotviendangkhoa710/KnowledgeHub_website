'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { agentWorkflowClient, CvAssessment, CvAssessmentPreview, StoredCvAssessment } from '@/lib/agentWorkflowClient';
import { aiRoadmapClient } from '@/lib/aiRoadmapClient';
import { errorMessage } from '@/lib/accountClient';
import { useAgentAccess } from '@/lib/useAgentAccess';
import styles from '@/components/agent/agentTools.module.css';
import s from './cvAssessment.module.css';

const MAX_PDF_BYTES = 2 * 1024 * 1024;

const ICONS = {
  summary: <path d="M4 5h16M4 10h16M4 15h10" />,
  ok: <path d="m5 12 5 5 9-10" />,
  warn: <><path d="M12 4 2.5 20h19L12 4z" /><path d="M12 10v4M12 17h.01" /></>,
  tip: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>,
};

function Icon({ name, className }: { name: keyof typeof ICONS; className?: string }) {
  return <svg className={`${s.icon} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;
}

/** Nhận xét bên phải: tổng quan, điểm mạnh kèm trích dẫn từ CV, khoảng trống, gợi ý đánh số. */
function Assessment({ data }: { data: CvAssessment }) {
  return <>
    <section className={s.block} aria-labelledby="cv-summary">
      <h3 id="cv-summary"><Icon name="summary" />Tổng quan</h3>
      <p className={s.summary}>{data.summary}</p>
    </section>
    <section className={s.block} aria-labelledby="cv-strengths">
      <h3 id="cv-strengths"><Icon name="ok" className={s.iconOk} />Điểm mạnh có bằng chứng<span className={s.count}>{data.strengths.length}</span></h3>
      {data.strengths.length === 0 ? <p className={s.empty}>Chưa tìm thấy điểm mạnh có bằng chứng rõ trong CV.</p> : (
        <ul className={s.items}>{data.strengths.map((item, index) => (
          <li key={`${item.skill}-${index}`}><strong className={s.skill}>{item.skill}</strong><p className={s.evidence}>{item.evidence}</p></li>
        ))}</ul>
      )}
    </section>
    <section className={s.block} aria-labelledby="cv-gaps">
      <h3 id="cv-gaps"><Icon name="warn" className={s.iconWarn} />Khoảng trống cần xem xét<span className={s.count}>{data.gaps.length}</span></h3>
      {data.gaps.length === 0 ? <p className={s.empty}>Không có khoảng trống đáng chú ý.</p> : (
        <ul className={s.items}>{data.gaps.map((item, index) => <li key={index} className={s.gap}>{item}</li>)}</ul>
      )}
    </section>
    <section className={s.block} aria-labelledby="cv-tips">
      <h3 id="cv-tips"><Icon name="tip" className={s.iconTip} />Gợi ý cải thiện<span className={s.count}>{data.recommendations.length}</span></h3>
      {data.recommendations.length === 0 ? <p className={s.empty}>Chưa có gợi ý.</p> : (
        <ol className={s.steps}>{data.recommendations.map((item, index) => <li key={index}>{item}</li>)}</ol>
      )}
    </section>
  </>;
}

/** Trình xem PDF bên trái (dùng trình xem PDF có sẵn của trình duyệt). */
function PdfViewer({ url, name, failed = false, onRetry }: { url: string | null; name: string; failed?: boolean; onRetry?: () => void }) {
  return <div className={s.viewer}>
    <div className={s.viewerBar}>
      <span className={s.fileName} title={name}>{name}</span>
      {url && <a className={s.openLink} href={url} target="_blank" rel="noopener noreferrer">Mở tab mới ↗</a>}
    </div>
    {url ? <iframe className={s.frame} src={url} title={`Xem CV ${name}`} />
      : failed ? <div className={s.viewerEmpty} role="alert">
        <p>Không tải được tệp PDF.</p>
        {onRetry && <button className="btn btn-secondary" type="button" onClick={onRetry}>Thử lại</button>}
      </div>
      : <div className={s.viewerEmpty} role="status">Đang tải tệp PDF…</div>}
  </div>;
}

/** Tạo URL tạm cho một Blob/File để xem trong iframe, và thu hồi khi không dùng nữa. */
function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return; }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export default function CvAssessmentPage() {
  const { user, checking } = useAgentAccess();
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [preview, setPreview] = useState<CvAssessmentPreview | null>(null);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState<StoredCvAssessment | null>(null);
  const [savedUserId, setSavedUserId] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [busy, setBusy] = useState<'preview' | 'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const visiblePreview = previewUserId === user?.id ? preview : null;
  const visibleSaved = savedUserId === user?.id ? saved : null;
  // PDF hiển thị bên trái: tệp vừa chọn cho bản xem trước, hoặc CV đã lưu tải về từ server.
  const [savedBlob, setSavedBlob] = useState<Blob | null>(null);
  const [savedPdfFailed, setSavedPdfFailed] = useState(false);
  const [savedPdfAttempt, setSavedPdfAttempt] = useState(0);
  const previewUrl = useObjectUrl(visiblePreview ? file : null);
  const savedUrl = useObjectUrl(visibleSaved && !visiblePreview ? savedBlob : null);
  const savedCvKey = visibleSaved && !visiblePreview ? `${savedUserId}:${visibleSaved.cv.filename}` : null;
  useEffect(() => {
    setSavedBlob(null);
    setSavedPdfFailed(false);
    if (!savedCvKey) return;
    let active = true;
    aiRoadmapClient.downloadCv().then((blob) => { if (active) setSavedBlob(blob); }).catch(() => { if (active) setSavedPdfFailed(true); });
    return () => { active = false; };
  }, [savedCvKey, savedPdfAttempt]);
  const hasResult = Boolean(visiblePreview || visibleSaved);
  // Any save or delete supersedes an older listing request, so a slow initial
  // load can never bring back a CV the user just replaced or removed.
  const loadRequest = useRef(0);

  useEffect(() => {
    if (!user || checking) return;
    const requestId = ++loadRequest.current;
    let active = true;
    setLoadFailed(false);
    void Promise.all([agentWorkflowClient.getCvAssessment(), aiRoadmapClient.getCv()]).then(([assessment, cv]) => {
      if (!active || requestId !== loadRequest.current) return;
      if (assessment.data && cv.data) {
        setSaved({ assessment: assessment.data, cv: cv.data });
        setSavedUserId(user.id);
      }
    }).catch(() => {
      if (active && requestId === loadRequest.current) setLoadFailed(true);
    });
    return () => { active = false; };
  }, [user, checking, loadAttempt]);

  function selectFile(selected: File | null) {
    setPreview(null);
    setConsent(false);
    setNotice(null);
    setError(null);
    if (!selected) { setFile(null); return; }
    if (!selected.name.toLowerCase().endsWith('.pdf') || (selected.type && selected.type !== 'application/pdf') || selected.size > MAX_PDF_BYTES || selected.size === 0) {
      setFile(null);
      setError('Chọn CV dạng PDF không rỗng, tối đa 2 MB.');
      return;
    }
    setFile(selected);
  }

  async function assess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !file || busy) return;
    setBusy('preview');
    setError(null);
    setNotice(null);
    setPreview(null);
    setConsent(false);
    try {
      const response = await agentWorkflowClient.previewCv(file, targetRole.trim() || undefined);
      setPreview(response.data);
      setPreviewUserId(user.id);
    } catch (caught) {
      setError(errorMessage(caught, 'Không đánh giá được CV. Kiểm tra tệp PDF rồi thử lại.'));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!user || !file || !visiblePreview || !consent || busy) return;
    setBusy('save');
    setError(null);
    try {
      const response = await agentWorkflowClient.confirmCv(file, visiblePreview.preview_token);
      loadRequest.current += 1;
      setSaved(response.data);
      setSavedUserId(user.id);
      setPreview(null);
      setConsent(false);
      setNotice('Đã lưu CV và bản đánh giá theo xác nhận của bạn.');
    } catch (caught) {
      setError(errorMessage(caught, 'Không lưu được CV và bản đánh giá. Có thể bản xem trước đã hết hạn; hãy đánh giá lại.'));
      setPreview(null);
      setConsent(false);
    } finally {
      setBusy(null);
    }
  }

  async function deleteSaved() {
    if (!deleteRequested || !visibleSaved || busy) return;
    setBusy('delete');
    setError(null);
    try {
      await agentWorkflowClient.deleteCv();
      loadRequest.current += 1;
      setSaved(null);
      setDeleteRequested(false);
      setNotice('Đã yêu cầu xóa CV và bản đánh giá đã lưu.');
    } catch (caught) {
      setError(errorMessage(caught, 'Không xóa được CV đã lưu. Vui lòng thử lại.'));
    } finally {
      setBusy(null);
    }
  }

  return <main className={`${styles.page} ${hasResult ? s.wide : ''}`}>
    <div className={s.narrow}>
    <p className={styles.eyebrow}>AI Companion</p>
    <h1>Đánh giá CV</h1>
    <p className={styles.lead}>Tải CV PDF lên để xem bản đánh giá. Bản xem trước và tệp PDF không được lưu vào tài khoản. Chúng chỉ được lưu sau khi bạn xác nhận riêng.</p>
    </div>
    {checking ? <p role="status" className={s.narrow}>Đang kiểm tra phiên đăng nhập...</p> : !user ? <div className={`${styles.card} ${s.narrow}`}><p>Hãy đăng nhập để đánh giá CV.</p><Link className="btn btn-primary" href="/login?redirect=/ai/cv-assessment">Đăng nhập</Link></div> : <>
      <div className={s.narrow}>
      <form className={`${styles.card} ${styles.form}`} onSubmit={(event) => void assess(event)}>
        <label className={styles.field}>CV PDF (tối đa 2 MB)
          <input type="file" required accept=".pdf,application/pdf" disabled={busy !== null} onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className={styles.field}>Vị trí mục tiêu (tùy chọn)
          <input maxLength={120} value={targetRole} disabled={busy !== null} onChange={(event) => { setTargetRole(event.target.value); setPreview(null); setConsent(false); }} placeholder="Ví dụ: Backend Developer" />
        </label>
        <button className="btn btn-primary" type="submit" disabled={!file || busy !== null}>{busy === 'preview' ? 'Đang đánh giá...' : 'Xem đánh giá, chưa lưu'}</button>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.success} role="status">{notice}</p>}
      {loadFailed && <div className={styles.card} role="alert">
        <p>Không tải được CV và bản đánh giá đã lưu.</p>
        <button className="btn btn-secondary" type="button" disabled={busy !== null} onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Thử lại</button>
      </div>}
      </div>
      {visiblePreview && <div className={s.split}>
        <PdfViewer url={previewUrl} name={file?.name ?? 'CV.pdf'} />
        <section className={s.report} aria-label="Bản đánh giá chưa lưu">
        <div className={s.reportHead}>
          <h2>Đánh giá CV</h2>
          <span className={s.pill}>Bản xem trước · chưa lưu</span>
        </div>
        <p className={s.expires}>Hết hạn lúc {new Date(visiblePreview.expires_at).toLocaleString('vi-VN')}. Bạn có thể lưu CV và nhận xét ở cuối trang.</p>
        <Assessment data={visiblePreview.assessment} />
        <div className={`${s.block} ${s.confirm}`}>
        <label className={styles.check}><input type="checkbox" checked={consent} disabled={busy !== null} onChange={(event) => setConsent(event.target.checked)} /><span>Tôi đồng ý lưu CV này và bản đánh giá vào tài khoản của tôi. Tôi có thể xóa chúng sau.</span></label>
        <div className={styles.actions}>
          <button className="btn btn-primary" type="button" disabled={!consent || busy !== null} onClick={() => void save()}>{busy === 'save' ? 'Đang lưu...' : 'Xác nhận lưu CV và đánh giá'}</button>
          <button className="btn btn-secondary" type="button" disabled={busy !== null} onClick={() => { setPreview(null); setConsent(false); }}>Bỏ bản xem trước</button>
        </div>
        </div>
      </section>
      </div>}
      {visibleSaved && !visiblePreview && <div className={s.split}>
        <PdfViewer url={savedUrl} name={visibleSaved.cv.filename} failed={savedPdfFailed} onRetry={() => setSavedPdfAttempt((attempt) => attempt + 1)} />
        <section className={s.report} aria-label="CV và bản đánh giá đã lưu">
        <div className={s.reportHead}>
          <h2>CV và đánh giá đã lưu</h2>
          <span className={`${s.pill} ${s.pillSaved}`}>Đã lưu</span>
        </div>
        <Assessment data={visibleSaved.assessment} />
        <div className={s.block}>
        {deleteRequested ? <div className={styles.actions}>
          <p className={styles.danger}>Xóa CV và bản đánh giá đã lưu của bạn?</p>
          <button className="btn btn-secondary" type="button" disabled={busy !== null} onClick={() => void deleteSaved()}>{busy === 'delete' ? 'Đang xóa...' : 'Xác nhận xóa'}</button>
          <button className="btn btn-secondary" type="button" disabled={busy !== null} onClick={() => setDeleteRequested(false)}>Hủy</button>
        </div> : <button className="btn btn-secondary" type="button" disabled={busy !== null} onClick={() => setDeleteRequested(true)}>Xóa CV và đánh giá đã lưu</button>}
        </div>
      </section>
      </div>}
    </>}
  </main>;
}
