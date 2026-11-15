'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { aiRoadmapClient } from '@/lib/aiRoadmapClient';
import type { CompanionPreviewResult, StoredCvMetadata } from '@/lib/aiRoadmapClient';
import Select from '@/components/ui/Select';
import CompanionRoadmapPreview from './CompanionRoadmapPreview';
import styles from './roadmapForm.module.css';

type ReadyPreview = Extract<CompanionPreviewResult, { state: 'ready' }>;
type CvAction = 'download' | 'delete' | 'save';
const MAX_PDF_BYTES = 2 * 1024 * 1024;
const CUSTOM_CHOICE = '__custom__';
const CAREER_GROUPS = [
  { label: 'Phát triển phần mềm', roles: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer', 'Desktop Application Developer'] },
  { label: 'Đám mây và nền tảng', roles: ['DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer', 'Platform Engineer', 'Infrastructure Engineer'] },
  { label: 'Dữ liệu', roles: ['Data Engineer', 'Data Analyst', 'Business Intelligence Analyst', 'Data Scientist', 'Machine Learning Engineer'] },
  { label: 'Trí tuệ nhân tạo', roles: ['AI Engineer', 'NLP Engineer', 'Computer Vision Engineer', 'MLOps Engineer', 'AI Research Engineer'] },
  { label: 'An ninh mạng', roles: ['Cybersecurity Analyst', 'Security Engineer', 'Application Security Engineer', 'Cloud Security Engineer', 'Penetration Tester'] },
  { label: 'Kiểm thử và chất lượng', roles: ['QA Engineer', 'Test Automation Engineer', 'Performance Test Engineer', 'Software Development Engineer in Test', 'Test Architect'] },
  { label: 'Sản phẩm và thiết kế', roles: ['Technical Product Manager', 'Technical Product Owner', 'UX Designer', 'UI Designer', 'UX Researcher'] },
  { label: 'Kiến trúc', roles: ['Software Architect', 'Solutions Architect', 'Enterprise Architect', 'Data Architect', 'Cloud Architect'] },
  { label: 'Vận hành CNTT', roles: ['IT Support Specialist', 'System Administrator', 'Network Engineer', 'Database Administrator', 'IT Operations Engineer'] },
  { label: 'Kỹ thuật chuyên biệt', roles: ['Game Developer', 'Embedded Systems Engineer', 'Blockchain Developer', 'AR/VR Developer', 'IoT Engineer'] },
] as const;

function savedCvTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'gần đây' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

type Props = { onBack: () => void };

function apiStatus(caught: unknown): number | undefined {
  return typeof caught === 'object' && caught !== null && typeof (caught as { status?: unknown }).status === 'number'
    ? (caught as { status: number }).status : undefined;
}

export default function RoadmapForm({ onBack }: Props) {
  const [careerChoice, setCareerChoice] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [levelChoice, setLevelChoice] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [jobRequirements, setJobRequirements] = useState('');
  const [weeks, setWeeks] = useState('12');
  const [hoursPerWeek, setHoursPerWeek] = useState('8');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [saveCvConsent, setSaveCvConsent] = useState(false);
  const [storedCv, setStoredCv] = useState<StoredCvMetadata | null>(null);
  const [cvLoading, setCvLoading] = useState(true);
  const [cvAction, setCvAction] = useState<CvAction | null>(null);
  const [cvSaveFailed, setCvSaveFailed] = useState(false);
  const [preview, setPreview] = useState<ReadyPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const cvActionRef = useRef<CvAction | null>(null);
  const cvMutationVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const viewRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function beginCvAction(action: CvAction): boolean {
    if (cvActionRef.current !== null) return false;
    cvActionRef.current = action;
    setCvAction(action);
    return true;
  }

  function endCvAction(): void {
    cvActionRef.current = null;
    setCvAction(null);
  }

  useEffect(() => {
    viewRef.current?.parentElement?.scrollTo({ top: 0 });
  }, [preview, savedId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const requestVersion = cvMutationVersionRef.current;
    aiRoadmapClient.getCv().then((response) => {
      if (active && requestVersion === cvMutationVersionRef.current) setStoredCv(response.data);
    }).catch((caught) => {
      if (active && requestVersion === cvMutationVersionRef.current) setError(apiStatus(caught) === 401
        ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để quản lý CV đã lưu.'
        : 'Không kiểm tra được CV đã lưu. Bạn vẫn có thể tạo bản xem trước.');
    }).finally(() => {
      if (active) setCvLoading(false);
    });
    return () => { active = false; };
  }, []);

  function selectPdf(file: File | null): void {
    setError(null);
    setPreview(null);
    if (!file) { setCvFile(null); return; }
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setCvFile(null);
      setError('Hãy chọn tệp PDF cho CV của bạn.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setCvFile(null);
      setError('CV dạng PDF phải nhỏ hơn hoặc bằng 2 MB.');
      return;
    }
    setCvFile(file);
  }

  async function downloadCv(): Promise<void> {
    if (!beginCvAction('download')) return;
    setError(null);
    try {
      const blob = await aiRoadmapClient.downloadCv();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = storedCv?.filename || 'saved-cv.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(apiStatus(caught) === 401
        ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tải CV đã lưu.'
        : 'Không tải được CV đã lưu. Vui lòng thử lại.');
    } finally {
      endCvAction();
    }
  }

  async function deleteCv(): Promise<void> {
    if (!beginCvAction('delete')) return;
    setError(null);
    try {
      await aiRoadmapClient.deleteCv();
      cvMutationVersionRef.current += 1;
      setStoredCv(null);
    } catch (caught) {
      setError(apiStatus(caught) === 401
        ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để xóa CV đã lưu.'
        : 'Không xóa được CV đã lưu. Vui lòng thử lại.');
    } finally {
      endCvAction();
    }
  }

  async function saveSelectedCv(): Promise<void> {
    if (!cvFile || !saveCvConsent || !beginCvAction('save')) return;
    setError(null);
    try {
      const response = await aiRoadmapClient.saveCv(cvFile);
      cvMutationVersionRef.current += 1;
      setStoredCv(response.data);
      setSaveCvConsent(false);
      setCvSaveFailed(false);
    } catch (caught) {
      setError(apiStatus(caught) === 401
        ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để lưu CV.'
        : 'Không lưu được CV. Vui lòng thử lại.');
    } finally {
      endCvAction();
    }
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (inFlightRef.current || saveInFlightRef.current || cvActionRef.current !== null) return;
    if (!careerGoal.trim() || !currentLevel.trim()) {
      setError('Hãy chọn mục tiêu nghề nghiệp và trình độ hiện tại.');
      return;
    }
    if (cvFile && (cvFile.type !== 'application/pdf' || cvFile.size > MAX_PDF_BYTES)) {
      setError('Hãy chọn CV dạng PDF từ 2 MB trở xuống.');
      return;
    }
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    setPreview(null);
    setSavedId(null);
    setCvSaveFailed(false);
    try {
      const form = new FormData();
      form.append('career_goal', careerGoal.trim());
      form.append('current_level', currentLevel.trim());
      if (jobRequirements.trim()) form.append('target_job_requirements', jobRequirements.trim());
      form.append('weeks', weeks);
      form.append('hours_per_week', hoursPerWeek);
      if (cvFile) form.append('cv_file', cvFile);
      const response = await aiRoadmapClient.previewForm(form);
      if (mountedRef.current) setPreview(response.data);
    } catch (caught) {
      if (!mountedRef.current) return;
      const status = apiStatus(caught);
      setError(status === 401
        ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tạo lộ trình.'
        : status === 422
          ? (caught as { message?: string }).message ?? 'Hãy kiểm tra lại thông tin và CV PDF rồi thử lại.'
          : status === 429
            ? 'Bạn xem trước quá nhiều lần. Hãy đợi một phút rồi thử lại.'
            : 'Tạo lộ trình đang tạm thời không khả dụng. Biểu mẫu của bạn vẫn còn đây, hãy thử lại sau.');
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }

  async function save(): Promise<void> {
    if (!preview || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const response = await aiRoadmapClient.confirmForm(preview.preview_token);
      if (!mountedRef.current) return;
      setSavedId(response.data.id);
      setPreview(null);
      if (saveCvConsent && cvFile) {
        if (!beginCvAction('save')) {
          setCvSaveFailed(true);
          setError('Lộ trình đã được lưu, nhưng chưa lưu được CV. Hãy kiểm tra lại đồng ý lưu CV và thử lại bên dưới.');
          return;
        }
        try {
          const cvResponse = await aiRoadmapClient.saveCv(cvFile);
          if (!mountedRef.current) return;
          cvMutationVersionRef.current += 1;
          setStoredCv(cvResponse.data);
          setSaveCvConsent(false);
        } catch {
          if (mountedRef.current) {
            setCvSaveFailed(true);
            setError('Lộ trình đã được lưu, nhưng không lưu được CV. Bạn có thể thử lưu lại CV bên dưới.');
          }
        } finally {
          endCvAction();
        }
      }
    } catch (caught) {
      if (!mountedRef.current) return;
      const status = apiStatus(caught);
      setError(status === 401
        ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để lưu lộ trình này.'
        : status === 409 || status === 422
          ? 'Bản xem trước đã hết hạn hoặc các khóa học đã thay đổi. Hãy chỉnh thông tin và tạo bản xem trước mới.'
          : 'Chưa xác nhận được việc lưu. Bạn có thể thử lại an toàn, sẽ không tạo bản trùng.');
    } finally {
      saveInFlightRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }

  if (savedId) {
    return <div ref={viewRef} className={styles.saved} role="status">
      <span className={styles.savedIcon} aria-hidden="true">✓</span>
      <h2>Đã lưu lộ trình</h2>
      <p>Lộ trình dành riêng cho bạn đã sẵn sàng để xem lại và theo dõi tiến độ.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {cvSaveFailed && cvFile && <button className="btn btn-secondary" type="button" onClick={() => void saveSelectedCv()} disabled={!saveCvConsent || cvAction !== null}>{cvAction === 'save' ? 'Đang lưu CV...' : 'Lưu lại CV'}</button>}
      <div className={styles.actions}><Link className="btn btn-primary" href={`/learning/my-roadmaps#${encodeURIComponent(savedId)}`}>Xem lộ trình AI của tôi</Link><button className="btn btn-secondary" type="button" onClick={() => { setSavedId(null); setPreview(null); setError(null); setCvSaveFailed(false); setSaveCvConsent(false); }}>Tạo lộ trình khác</button><button className="btn btn-secondary" type="button" onClick={onBack}>Quay lại trò chuyện</button></div>
    </div>;
  }

  if (preview) {
    return <div ref={viewRef} className={styles.result}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.resultToolbar}><span>Xem lại kế hoạch trước khi lưu</span><button className="btn btn-secondary" type="button" disabled={saving} onClick={() => { setPreview(null); setError(null); }}>Sửa thông tin</button></div>
      <CompanionRoadmapPreview draft={preview.draft} saving={saving} onSave={() => void save()} onClose={onBack} closeLabel="Quay lại trò chuyện" />
    </div>;
  }

  return <div ref={viewRef} className={styles.formShell}>
    <div className={styles.intro}><h2>Tạo lộ trình bằng AI</h2><p>Cho chúng tôi biết bạn muốn đi đến đâu và hiện đã làm được gì. Chúng tôi sẽ tìm tài nguyên học tập cho mục tiêu của bạn.</p></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <form className={styles.form} onSubmit={(event) => void submit(event)}>
      <div className={styles.field}>Mục tiêu nghề nghiệp <span>*</span><Select className={styles.select} ariaLabel="Mục tiêu nghề nghiệp" value={careerChoice} placeholder="Chọn một nghề CNTT" disabled={loading} onChange={(choice) => { setCareerChoice(choice); setCareerGoal(choice === CUSTOM_CHOICE ? '' : choice); }} options={[...CAREER_GROUPS.flatMap((group) => group.roles.map((role) => ({ value: role, label: role, group: group.label }))), { value: CUSTOM_CHOICE, label: 'Mục tiêu nghề nghiệp khác' }]} /></div>
      {careerChoice === CUSTOM_CHOICE && <label className={styles.field}>Mô tả mục tiêu nghề nghiệp <span>*</span><input required maxLength={500} value={careerGoal} onChange={(event) => setCareerGoal(event.target.value)} placeholder="Ví dụ: trở thành technical writer" disabled={loading} /></label>}
      <div className={styles.field}>Trình độ hiện tại <span>*</span><Select className={styles.select} ariaLabel="Trình độ hiện tại" value={levelChoice} placeholder="Chọn trình độ của bạn" disabled={loading} onChange={(choice) => { setLevelChoice(choice); setCurrentLevel(choice === CUSTOM_CHOICE ? '' : choice); }} options={[{ value: 'Beginner', label: 'Mới bắt đầu' }, { value: 'Intermediate', label: 'Trung cấp' }, { value: 'Advanced', label: 'Nâng cao' }, { value: CUSTOM_CHOICE, label: 'Khác, tôi tự mô tả trình độ' }]} /></div>
      {levelChoice === CUSTOM_CHOICE && <label className={styles.field}>Mô tả trình độ hiện tại <span>*</span><input required maxLength={200} value={currentLevel} onChange={(event) => setCurrentLevel(event.target.value)} placeholder="Ví dụ: dùng Python thoải mái, mới học SQL" disabled={loading} /></label>}
      <label className={styles.field}>Yêu cầu của công việc mục tiêu (tùy chọn)<textarea maxLength={5000} rows={5} value={jobRequirements} onChange={(event) => setJobRequirements(event.target.value)} placeholder="Dán mô tả công việc hoặc mô tả các kỹ năng vị trí đó cần" disabled={loading} /></label>
      <div className={styles.numberRow}>
        <label className={styles.field}>Thời gian học (tuần) <span>*</span><input required type="number" min={1} max={104} value={weeks} onChange={(event) => setWeeks(event.target.value)} disabled={loading} /></label>
        <label className={styles.field}>Số giờ mỗi tuần <span>*</span><input required type="number" min={1} max={80} value={hoursPerWeek} onChange={(event) => setHoursPerWeek(event.target.value)} disabled={loading} /></label>
      </div>
      <div className={styles.field}>CV (tùy chọn, PDF tối đa 2 MB)<input ref={fileRef} id="cv-file" className={styles.fileInput} type="file" accept=".pdf,application/pdf" onChange={(event) => selectPdf(event.target.files?.[0] ?? null)} disabled={loading} /><div className={styles.fileRow}><label htmlFor="cv-file" className={styles.fileBtn}>Chọn tệp</label><span className={styles.fileName}>{cvFile ? cvFile.name : 'Chưa chọn tệp'}</span>{cvFile && <button type="button" className={styles.fileClear} disabled={loading} onClick={() => { if (fileRef.current) fileRef.current.value = ''; selectPdf(null); }}>Bỏ chọn</button>}</div><small>CV chỉ được dùng cho bản xem trước này, trừ khi bạn chọn lưu.</small></div>
      <label className={styles.consent}>
        <input type="checkbox" checked={saveCvConsent} onChange={(event) => setSaveCvConsent(event.target.checked)} disabled={loading || !cvFile} />
        <span>Đây là CV tốt nhất hiện tại của tôi. Hãy lưu để cá nhân hóa các trải nghiệm AI sau này.</span>
      </label>
      <section className={styles.cvManager} aria-label="CV đã lưu">
        <div><strong>CV đã lưu</strong>{cvLoading ? <small>Đang kiểm tra CV đã lưu...</small> : storedCv ? <small>CV gần nhất của bạn được lưu lúc {savedCvTime(storedCv.created_at)}. Bạn đã cập nhật CV? Hãy tải bản PDF mới nhất ở trên rồi chọn Thay CV đã lưu. Để xem trước lộ trình, hãy chọn tệp PDF muốn dùng ở trên.</small> : <small>Tài khoản chưa lưu CV nào.</small>}</div>
        {storedCv && <div className={styles.cvActions}>
          <button className="btn btn-secondary" type="button" onClick={() => void downloadCv()} disabled={cvAction !== null}>{cvAction === 'download' ? 'Đang tải...' : 'Tải xuống'}</button>
          <button className="btn btn-secondary" type="button" onClick={() => void deleteCv()} disabled={cvAction !== null}>{cvAction === 'delete' ? 'Đang xóa...' : 'Xóa'}</button>
        </div>}
      </section>
      <div className={styles.cvSaveRow}>
        <button className="btn btn-secondary" type="button" onClick={() => void saveSelectedCv()} disabled={!cvFile || !saveCvConsent || cvAction !== null || loading}>
          {cvAction === 'save' ? 'Đang lưu CV...' : storedCv ? 'Thay CV đã lưu' : 'Lưu CV'}
        </button>
        {storedCv && cvFile && <small>Lưu tệp PDF này sẽ thay thế CV đã lưu hiện tại.</small>}
      </div>
      {loading && <p className={styles.loading} role="status"><span className={styles.spinner} aria-hidden="true" /> Đang phân tích mục tiêu, ghép khóa học và kiểm tra tài nguyên học tập...</p>}
      <div className={styles.actions}><button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Đang tạo lộ trình...' : 'Xem trước lộ trình'}</button><button className="btn btn-secondary" type="button" onClick={onBack}>Quay lại trò chuyện</button></div>
    </form>
  </div>;
}
