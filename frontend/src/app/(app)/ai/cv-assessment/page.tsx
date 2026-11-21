'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { agentWorkflowClient, CvAssessment, CvAssessmentPreview, StoredCvAssessment } from '@/lib/agentWorkflowClient';
import { aiRoadmapClient } from '@/lib/aiRoadmapClient';
import { errorMessage } from '@/lib/accountClient';
import { useAgentAccess } from '@/lib/useAgentAccess';
import styles from '@/components/agent/agentTools.module.css';

const MAX_PDF_BYTES = 2 * 1024 * 1024;

function Assessment({ data }: { data: CvAssessment }) {
  return <div>
    <h3>Đánh giá CV</h3>
    <p>{data.summary}</p>
    <h4>Điểm mạnh có bằng chứng trong CV</h4>
    <ul className={styles.list}>{data.strengths.map((item, index) => <li key={`${item.skill}-${index}`}><strong>{item.skill}:</strong> {item.evidence}</li>)}</ul>
    <h4>Khoảng trống cần xem xét</h4>
    <ul className={styles.list}>{data.gaps.map((item, index) => <li key={index}>{item}</li>)}</ul>
    <h4>Gợi ý cải thiện</h4>
    <ul className={styles.list}>{data.recommendations.map((item, index) => <li key={index}>{item}</li>)}</ul>
  </div>;
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

  return <main className={styles.page}>
    <p className={styles.eyebrow}>AI Companion</p>
    <h1>Đánh giá CV</h1>
    <p className={styles.lead}>Tải CV PDF lên để xem bản đánh giá. Bản xem trước và tệp PDF không được lưu vào tài khoản. Chúng chỉ được lưu sau khi bạn xác nhận riêng.</p>
    {checking ? <p role="status">Đang kiểm tra phiên đăng nhập...</p> : !user ? <div className={styles.card}><p>Hãy đăng nhập để đánh giá CV.</p><Link className="btn btn-primary" href="/login?redirect=/ai/cv-assessment">Đăng nhập</Link></div> : <>
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
      {visiblePreview && <section className={styles.card} aria-label="Bản đánh giá chưa lưu">
        <p className={styles.hint}>Bản xem trước chưa được lưu. Hết hạn: {new Date(visiblePreview.expires_at).toLocaleString('vi-VN')}.</p>
        <Assessment data={visiblePreview.assessment} />
        <label className={styles.check}><input type="checkbox" checked={consent} disabled={busy !== null} onChange={(event) => setConsent(event.target.checked)} /><span>Tôi đồng ý lưu CV này và bản đánh giá vào tài khoản của tôi. Tôi có thể xóa chúng sau.</span></label>
        <div className={styles.actions}>
          <button className="btn btn-primary" type="button" disabled={!consent || busy !== null} onClick={() => void save()}>{busy === 'save' ? 'Đang lưu...' : 'Xác nhận lưu CV và đánh giá'}</button>
          <button className="btn btn-secondary" type="button" disabled={busy !== null} onClick={() => { setPreview(null); setConsent(false); }}>Bỏ bản xem trước</button>
        </div>
      </section>}
      {visibleSaved && <section className={styles.card} aria-label="CV và bản đánh giá đã lưu">
        <h2>CV và đánh giá đã lưu</h2>
        <p className={styles.hint}>{visibleSaved.cv.filename}</p>
        <Assessment data={visibleSaved.assessment} />
        {deleteRequested ? <div className={styles.actions}>
          <p className={styles.danger}>Xóa CV và bản đánh giá đã lưu của bạn?</p>
          <button className="btn btn-secondary" type="button" disabled={busy !== null} onClick={() => void deleteSaved()}>{busy === 'delete' ? 'Đang xóa...' : 'Xác nhận xóa'}</button>
          <button className="btn btn-secondary" type="button" disabled={busy !== null} onClick={() => setDeleteRequested(false)}>Hủy</button>
        </div> : <button className="btn btn-secondary" type="button" disabled={busy !== null} onClick={() => setDeleteRequested(true)}>Xóa CV và đánh giá đã lưu</button>}
      </section>}
    </>}
  </main>;
}
