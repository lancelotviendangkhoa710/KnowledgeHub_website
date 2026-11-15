'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { aiRoadmapClient } from '@/lib/aiRoadmapClient';
import type { CompanionPreviewResult, StoredCvMetadata } from '@/lib/aiRoadmapClient';
import CompanionRoadmapPreview from './CompanionRoadmapPreview';
import styles from './roadmapForm.module.css';

type ReadyPreview = Extract<CompanionPreviewResult, { state: 'ready' }>;
type CvAction = 'download' | 'delete' | 'save';
const MAX_PDF_BYTES = 2 * 1024 * 1024;
const CUSTOM_CHOICE = '__custom__';
const CAREER_GROUPS = [
  { label: 'Software development', roles: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer', 'Desktop Application Developer'] },
  { label: 'Cloud and platform', roles: ['DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer', 'Platform Engineer', 'Infrastructure Engineer'] },
  { label: 'Data', roles: ['Data Engineer', 'Data Analyst', 'Business Intelligence Analyst', 'Data Scientist', 'Machine Learning Engineer'] },
  { label: 'Artificial intelligence', roles: ['AI Engineer', 'NLP Engineer', 'Computer Vision Engineer', 'MLOps Engineer', 'AI Research Engineer'] },
  { label: 'Cybersecurity', roles: ['Cybersecurity Analyst', 'Security Engineer', 'Application Security Engineer', 'Cloud Security Engineer', 'Penetration Tester'] },
  { label: 'Quality assurance', roles: ['QA Engineer', 'Test Automation Engineer', 'Performance Test Engineer', 'Software Development Engineer in Test', 'Test Architect'] },
  { label: 'Product and design', roles: ['Technical Product Manager', 'Technical Product Owner', 'UX Designer', 'UI Designer', 'UX Researcher'] },
  { label: 'Architecture', roles: ['Software Architect', 'Solutions Architect', 'Enterprise Architect', 'Data Architect', 'Cloud Architect'] },
  { label: 'IT operations', roles: ['IT Support Specialist', 'System Administrator', 'Network Engineer', 'Database Administrator', 'IT Operations Engineer'] },
  { label: 'Specialized engineering', roles: ['Game Developer', 'Embedded Systems Engineer', 'Blockchain Developer', 'AR/VR Developer', 'IoT Engineer'] },
] as const;

function savedCvTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'recently' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
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
        ? 'Your session expired. Sign in again to manage your saved CV.'
        : 'We could not check your saved CV. You can still create a preview.');
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
      setError('Choose a PDF file for your CV.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setCvFile(null);
      setError('Your PDF CV must be 2 MB or smaller.');
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
        ? 'Your session expired. Sign in again to download your saved CV.'
        : 'We could not download your saved CV. Please retry.');
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
        ? 'Your session expired. Sign in again to delete your saved CV.'
        : 'We could not delete your saved CV. Please retry.');
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
        ? 'Your session expired. Sign in again to save your CV.'
        : 'We could not save your CV. Please retry.');
    } finally {
      endCvAction();
    }
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (inFlightRef.current || saveInFlightRef.current || cvActionRef.current !== null) return;
    if (!careerGoal.trim() || !currentLevel.trim()) {
      setError('Choose your career goal and current level.');
      return;
    }
    if (cvFile && (cvFile.type !== 'application/pdf' || cvFile.size > MAX_PDF_BYTES)) {
      setError('Choose a PDF CV of 2 MB or less.');
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
        ? 'Your session expired. Sign in again to create a roadmap.'
        : status === 422
          ? (caught as { message?: string }).message ?? 'Please check your inputs and PDF CV, then retry.'
          : status === 429
            ? 'Too many previews. Please wait a minute and retry.'
            : 'Roadmap generation is unavailable right now. Your form is still here; please retry.');
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
          setError('Your roadmap was saved, but the CV save could not start. Recheck consent and retry below.');
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
            setError('Your roadmap was saved, but we could not save your CV. You can retry the CV save below.');
          }
        } finally {
          endCvAction();
        }
      }
    } catch (caught) {
      if (!mountedRef.current) return;
      const status = apiStatus(caught);
      setError(status === 401
        ? 'Your session expired. Sign in again to save this roadmap.'
        : status === 409 || status === 422
          ? 'This preview has expired or its courses changed. Edit your details and generate a fresh preview.'
          : 'We could not confirm the save. Retrying this preview is safe and will not create a duplicate.');
    } finally {
      saveInFlightRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }

  if (savedId) {
    return <div ref={viewRef} className={styles.saved} role="status">
      <span className={styles.savedIcon} aria-hidden="true">✓</span>
      <h2>Roadmap saved</h2>
      <p>Your personalized roadmap is ready to revisit and track.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {cvSaveFailed && cvFile && <button className="btn btn-secondary" type="button" onClick={() => void saveSelectedCv()} disabled={!saveCvConsent || cvAction !== null}>{cvAction === 'save' ? 'Saving CV…' : 'Retry CV save'}</button>}
      <div className={styles.actions}><Link className="btn btn-primary" href={`/learning/my-roadmaps#${encodeURIComponent(savedId)}`}>View My AI Roadmaps</Link><button className="btn btn-secondary" type="button" onClick={() => { setSavedId(null); setPreview(null); setError(null); setCvSaveFailed(false); setSaveCvConsent(false); }}>Create another roadmap</button><button className="btn btn-secondary" type="button" onClick={onBack}>Back to Chat</button></div>
    </div>;
  }

  if (preview) {
    return <div ref={viewRef} className={styles.result}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.resultToolbar}><span>Review your plan before saving</span><button className="btn btn-secondary" type="button" disabled={saving} onClick={() => { setPreview(null); setError(null); }}>Edit details</button></div>
      <CompanionRoadmapPreview draft={preview.draft} saving={saving} onSave={() => void save()} onClose={onBack} closeLabel="Back to Chat" />
    </div>;
  }

  return <div ref={viewRef} className={styles.formShell}>
    <div className={styles.intro}><span className={styles.eyebrow}>Personalized learning plan</span><h2>Create Roadmap with AI</h2><p>Tell us where you want to go and what you can already do. We will find learning resources for your goal.</p></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <form className={styles.form} onSubmit={(event) => void submit(event)}>
      <label className={styles.field}>Career goal <span>*</span><select required value={careerChoice} onChange={(event) => { const choice = event.target.value; setCareerChoice(choice); setCareerGoal(choice === CUSTOM_CHOICE ? '' : choice); }} disabled={loading}>
        <option value="">Select an IT career</option>
        {CAREER_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.roles.map((role) => <option key={role} value={role}>{role}</option>)}</optgroup>)}
        <option value={CUSTOM_CHOICE}>Other career goal</option>
      </select></label>
      {careerChoice === CUSTOM_CHOICE && <label className={styles.field}>Describe your career goal <span>*</span><input required maxLength={500} value={careerGoal} onChange={(event) => setCareerGoal(event.target.value)} placeholder="e.g. Become a technical writer" disabled={loading} /></label>}
      <label className={styles.field}>Current level <span>*</span><select required value={levelChoice} onChange={(event) => { const choice = event.target.value; setLevelChoice(choice); setCurrentLevel(choice === CUSTOM_CHOICE ? '' : choice); }} disabled={loading}>
        <option value="">Select your level</option>
        <option value="Beginner">Beginner</option>
        <option value="Intermediate">Intermediate</option>
        <option value="Advanced">Advanced</option>
        <option value={CUSTOM_CHOICE}>Other / describe my level</option>
      </select></label>
      {levelChoice === CUSTOM_CHOICE && <label className={styles.field}>Describe your current level <span>*</span><input required maxLength={200} value={currentLevel} onChange={(event) => setCurrentLevel(event.target.value)} placeholder="e.g. Comfortable with Python, new to SQL" disabled={loading} /></label>}
      <label className={styles.field}>Target job requirements (optional)<textarea maxLength={5000} rows={5} value={jobRequirements} onChange={(event) => setJobRequirements(event.target.value)} placeholder="Paste a job description or describe the skills the role needs" disabled={loading} /></label>
      <div className={styles.numberRow}>
        <label className={styles.field}>Learning period (weeks) <span>*</span><input required type="number" min={1} max={104} value={weeks} onChange={(event) => setWeeks(event.target.value)} disabled={loading} /></label>
        <label className={styles.field}>Hours per week <span>*</span><input required type="number" min={1} max={80} value={hoursPerWeek} onChange={(event) => setHoursPerWeek(event.target.value)} disabled={loading} /></label>
      </div>
      <label className={styles.field}>CV (optional PDF, up to 2 MB)<input type="file" accept=".pdf,application/pdf" onChange={(event) => selectPdf(event.target.files?.[0] ?? null)} disabled={loading} /><small>{cvFile ? `${cvFile.name} — used only for this preview unless you choose to save it.` : 'Your CV is used only for this preview unless you choose to save it.'}</small></label>
      <label className={styles.consent}>
        <input type="checkbox" checked={saveCvConsent} onChange={(event) => setSaveCvConsent(event.target.checked)} disabled={loading || !cvFile} />
        <span>This is my best current CV. Save it to personalize future AI experiences.</span>
      </label>
      <section className={styles.cvManager} aria-label="Saved CV">
        <div><strong>Saved CV</strong>{cvLoading ? <small>Checking your saved CV…</small> : storedCv ? <small>Your latest saved CV was saved on {savedCvTime(storedCv.created_at)}. Have you updated your CV? Upload the latest PDF above and select Replace saved CV. For a roadmap preview, select the PDF you want to use above.</small> : <small>No CV saved to your account.</small>}</div>
        {storedCv && <div className={styles.cvActions}>
          <button className="btn btn-secondary" type="button" onClick={() => void downloadCv()} disabled={cvAction !== null}>{cvAction === 'download' ? 'Downloading…' : 'Download'}</button>
          <button className="btn btn-secondary" type="button" onClick={() => void deleteCv()} disabled={cvAction !== null}>{cvAction === 'delete' ? 'Deleting…' : 'Delete'}</button>
        </div>}
      </section>
      <div className={styles.cvSaveRow}>
        <button className="btn btn-secondary" type="button" onClick={() => void saveSelectedCv()} disabled={!cvFile || !saveCvConsent || cvAction !== null || loading}>
          {cvAction === 'save' ? 'Saving CV…' : storedCv ? 'Replace saved CV' : 'Save CV'}
        </button>
        {storedCv && cvFile && <small>Saving this PDF replaces your current saved CV.</small>}
      </div>
      {loading && <p className={styles.loading} role="status"><span className={styles.spinner} aria-hidden="true" /> Analyzing your goals, matching courses and checking learning resources…</p>}
      <div className={styles.actions}><button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Building roadmap…' : 'Preview my roadmap'}</button><button className="btn btn-secondary" type="button" onClick={onBack}>Back to Chat</button></div>
    </form>
  </div>;
}
