import React, { useState, useEffect } from 'react';
import { apiPost } from '../../api/http.js';
import { calculateGrade, calculateFinalExamResult } from '../../utils/gradeCalculator.js';

export default function RepeatMarksModal({
  isOpen,
  onClose,
  studentRow,
  resultTitle,
  resultId,
  onSaveSuccess,
}) {
  const [repeatMarks, setRepeatMarks] = useState('');
  const [repeatDate, setRepeatDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (studentRow) {
      setRepeatMarks(
        studentRow.repeatMarks !== null && studentRow.repeatMarks !== undefined
          ? String(studentRow.repeatMarks)
          : ''
      );
      setRepeatDate(
        studentRow.repeatDate
          ? new Date(studentRow.repeatDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setError('');
    }
  }, [studentRow]);

  if (!isOpen || !studentRow) return null;

  // Live calculation of repeat grade
  const numRepeatMarks = repeatMarks !== '' ? Number(repeatMarks) : null;
  let calculatedRepeatGrade = '—';
  let projectedFinalResult = '—';

  if (numRepeatMarks !== null && Number.isFinite(numRepeatMarks) && numRepeatMarks >= 0 && numRepeatMarks <= 100) {
    calculatedRepeatGrade = calculateGrade(numRepeatMarks);
    projectedFinalResult = calculateFinalExamResult(studentRow.marks, numRepeatMarks, studentRow.status);
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (repeatMarks === '' || repeatMarks === null || repeatMarks === undefined) {
      setError('Please enter repeat examination marks.');
      return;
    }

    const marksVal = Number(repeatMarks);
    if (!Number.isFinite(marksVal) || marksVal < 0 || marksVal > 100) {
      setError('Repeat marks must be a valid number between 0 and 100.');
      return;
    }

    setLoading(true);
    try {
      if (resultId) {
        // Save permanently to MongoDB
        const res = await apiPost(`/api/results/${resultId}/repeat-marks`, {
          studentId: studentRow.student || studentRow.studentId,
          repeatMarks: marksVal,
          repeatDate,
        });

        if (onSaveSuccess) {
          onSaveSuccess(res.student || {
            ...studentRow,
            repeatMarks: marksVal,
            repeatGrade: calculatedRepeatGrade,
            repeatDate,
            isResit: true,
            finalResult: projectedFinalResult,
            status: marksVal >= 60 ? 'PASS' : 'FAIL',
          });
        }
      } else {
        // In draft / unsaved sheet, update in-memory state
        if (onSaveSuccess) {
          onSaveSuccess({
            ...studentRow,
            repeatMarks: marksVal,
            repeatGrade: calculatedRepeatGrade,
            repeatDate,
            isResit: true,
            finalResult: projectedFinalResult,
            status: marksVal >= 60 ? 'PASS' : 'FAIL',
          });
        }
      }

      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save repeat examination marks.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-amber-200 bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white font-bold">
              ↻
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Repeat Examination Marks
              </h3>
              <p className="text-xs text-amber-100">
                Record separate repeat marks for failed students without modifying original scores.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Student Info Box (Read-only) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-bold text-slate-500 block">Student ID:</span>
                <span className="font-mono font-bold text-slate-900">{studentRow.studentId}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Student Name:</span>
                <span className="font-medium text-slate-800">{studentRow.studentName}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-bold text-slate-500 block">Examination:</span>
                <span className="font-semibold text-slate-800">{resultTitle || 'Module Examination'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Original Marks & Grade:</span>
                <span className="font-bold text-rose-600">
                  {studentRow.marks ?? '—'} marks (Grade {studentRow.grade || 'F'}) —{' '}
                  <span className="font-semibold text-rose-700">Failed</span>
                </span>
              </div>
            </div>
          </div>

          {/* Repeat Examination Marks Input */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Repeat Examination Marks (0 – 100):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                required
                autoFocus
                placeholder="e.g. 75"
                value={repeatMarks}
                onChange={(e) => setRepeatMarks(e.target.value)}
                className="w-32 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-900 shadow-2xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />

              {numRepeatMarks !== null && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-500">Repeat Grade:</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      numRepeatMarks >= 60
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {calculatedRepeatGrade}
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="font-bold text-slate-500">Status:</span>
                  <span
                    className={`font-bold ${
                      numRepeatMarks >= 60 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {projectedFinalResult}
                  </span>
                </div>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Minimum passing score is 60. Score 60 or higher will award <strong>Passed (Repeat)</strong>.
            </p>
          </div>

          {/* Repeat Examination Date */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Repeat Examination Date:
            </label>
            <input
              type="date"
              required
              value={repeatDate}
              onChange={(e) => setRepeatDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </div>

          {/* Modal Actions */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || repeatMarks === ''}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving Repeat Marks...' : 'Save Repeat Marks'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
