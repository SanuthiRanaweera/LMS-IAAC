import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileUp, Loader2, TriangleAlert, UploadCloud } from 'lucide-react';
import { submitAssignmentFile } from '../services/assignments.service.js';

function formatCountdown(deadline, now) {
  const due = new Date(deadline);
  if (Number.isNaN(due.getTime())) return { label: 'Invalid deadline', overdue: true };

  const diff = due.getTime() - now;
  if (diff <= 0) {
    return { label: 'Overdue', overdue: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return { label: `${days} Day${days === 1 ? '' : 's'}, ${hours} Hour${hours === 1 ? '' : 's'} remaining`, overdue: false };
  if (hours > 0) return { label: `${hours} Hour${hours === 1 ? '' : 's'}, ${minutes} Minute${minutes === 1 ? '' : 's'} remaining`, overdue: false };
  return { label: `${Math.max(minutes, 0)} Minute${minutes === 1 ? '' : 's'} remaining`, overdue: false };
}

function formatDeadline(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid deadline';
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AssignmentCard({ assignment, onSubmitted }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 1000);
    return () => globalThis.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = globalThis.setTimeout(() => setToast(''), 2600);
    return () => globalThis.clearTimeout(timer);
  }, [toast]);

  const countdown = useMemo(() => formatCountdown(assignment.deadline, now), [assignment.deadline, now]);

  function onDrop(event) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  }

  async function handleSubmit() {
    if (!selectedFile) {
      setError('Choose a file before uploading.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const response = await submitAssignmentFile({ assignmentId: assignment.id, file: selectedFile });
      setSelectedFile(null);
      setToast('Assignment submitted successfully.');
      onSubmitted?.(assignment.id, response?.submission || null);
    } catch (err) {
      setError(err.message || 'Failed to upload assignment.');
    } finally {
      setIsUploading(false);
    }
  }

  const statusLabel = assignment.submission?.status || assignment.status;

  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-100/60 blur-2xl" aria-hidden="true" />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <Clock3 className="h-3.5 w-3.5" />
              {assignment.course}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">{assignment.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{assignment.description}</p>
          </div>

          <div
            className={[
              'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold',
              countdown.overdue ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
            ].join(' ')}
          >
            {countdown.overdue ? <TriangleAlert className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
            {countdown.label}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>Due {formatDeadline(assignment.deadline)}</span>
          {statusLabel ? (
            <span
              className={[
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold',
                statusLabel === 'Late' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700',
              ].join(' ')}
            >
              {statusLabel === 'Late' ? <TriangleAlert className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {statusLabel}
            </span>
          ) : null}
          {assignment.submission?.submittedAt ? <span>Submitted {formatDeadline(assignment.submission.submittedAt)}</span> : null}
        </div>

        {assignment.referenceDocumentUrl ? (
          <a
            href={assignment.referenceDocumentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800"
          >
            <FileUp className="h-4 w-4" />
            Open reference document
          </a>
        ) : null}

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={onDrop}
          className={[
            'rounded-2xl border-2 border-dashed p-5 text-center transition',
            isDragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-slate-50',
          ].join(' ')}
        >
          <UploadCloud className="mx-auto h-10 w-10 text-sky-700" />
          <div className="mt-2 text-sm font-semibold text-slate-900">Drag and drop your submission here</div>
          <div className="mt-1 text-xs text-slate-500">Or browse and upload your completed assignment file.</div>
          <input
            type="file"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] || null);
              setError('');
            }}
            className="mt-4 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {selectedFile ? <div className="mt-3 text-xs text-slate-600">Selected: {selectedFile.name}</div> : null}
        </div>

        {error ? <div className="text-sm font-medium text-rose-600">{error}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {isUploading ? 'Uploading to OneDrive...' : assignment.submission?.fileName ? `Latest file: ${assignment.submission.fileName}` : 'No submission uploaded yet.'}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {isUploading ? 'Uploading to OneDrive...' : assignment.submission ? 'Replace Submission' : 'Submit Assignment'}
          </button>
        </div>
      </div>

      {toast ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      ) : null}
    </article>
  );
}