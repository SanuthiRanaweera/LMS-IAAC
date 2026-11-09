import { useEffect, useState } from 'react';
import {
  MessageSquareText,
  CalendarDays,
  Star,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Eye,
  X,
  BookOpen,
  Award,
  ShieldCheck,
} from 'lucide-react';
import { apiGet } from '../../api/http.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function LecturerFeedbackReportsPage() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Performance Summary Modal
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Queries strictly approved summaries sent to this logged-in lecturer
    apiGet('/api/feedback/lecturer/my-feedback')
      .then((d) => setSummaries(Array.isArray(d?.summaries) ? d.summaries : []))
      .catch((e) => setError(e?.message || 'Failed to load feedback summaries'))
      .finally(() => setLoading(false));
  }, []);

  const openSummaryModal = (summary) => {
    setSelectedSummary(summary);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-slate-500">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#003580] mb-3" aria-hidden="true" />
        <p className="font-bold text-slate-700">Loading teaching feedback summaries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Title & Subtitle (Section 18 Requirements) */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#003580]">
            <MessageSquareText className="h-6 w-6" aria-hidden="true" />
          </div>
          <span>My Teaching Feedback</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          View feedback summaries shared by IAAC academic administration.
        </p>
      </div>

      {summaries.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          <MessageSquareText className="mx-auto h-12 w-12 text-slate-300 mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-800">No Teaching Feedback Shared Yet</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            Once weekly student evaluations are reviewed, approved, and released by IAAC academic administration, your teaching performance summaries will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {summaries.map((summary) => (
            <div
              key={summary.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{summary.feedbackPeriod}</span>
                    <span className="rounded-full bg-blue-50 border border-blue-200 text-[#003580] px-2.5 py-0.5 text-[10px] font-bold">
                      Official Summary
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    <span>{formatDate(summary.dateShared)}</span>
                  </div>
                </div>

                {/* Module & Batch */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <BookOpen className="h-4 w-4 text-[#003580]" />
                    <span>{summary.module}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Batch: <strong className="text-slate-700">{summary.batch}</strong></span>
                    <span>Branch: <strong className="text-slate-700">{summary.branch}</strong></span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Responses</span>
                    <span className="text-base font-extrabold text-slate-900">{summary.responsesCount}</span>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Average Rating</span>
                    <div className="flex items-center gap-1 text-base font-extrabold text-amber-900">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                      <span>{summary.averageRating}</span>
                      <span className="text-xs text-amber-600 font-normal">/ 5.0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Verified by Academic Office
                </span>

                <button
                  type="button"
                  onClick={() => openSummaryModal(summary)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#003580] hover:bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View Feedback Summary</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================
          MY PERFORMANCE SUMMARY MODAL (Section 18 Requirements)
      ========================================================= */}
      {modalOpen && selectedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Award className="h-5 w-5 text-amber-300" />
                <div>
                  <h2 className="text-base font-bold">My Performance Summary</h2>
                  <p className="text-[11px] text-sky-200">
                    {selectedSummary.module} • {selectedSummary.batch} ({selectedSummary.feedbackPeriod})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Category Ratings Breakdown */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2.5 text-sm">Teaching Quality Evaluation Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <span className="text-[10px] text-slate-500 font-semibold block">Teaching Clarity</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {selectedSummary.averageRatings?.teachingClarity || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/ 5.0</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <span className="text-[10px] text-slate-500 font-semibold block">Subject Knowledge</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {selectedSummary.averageRatings?.subjectKnowledge || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/ 5.0</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <span className="text-[10px] text-slate-500 font-semibold block">Communication</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {selectedSummary.averageRatings?.communication || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/ 5.0</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <span className="text-[10px] text-slate-500 font-semibold block">Engagement</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {selectedSummary.averageRatings?.studentEngagement || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/ 5.0</span>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[#003580] font-bold block">Overall Rating</span>
                    <span className="text-base font-extrabold text-[#003580]">
                      {selectedSummary.averageRating}
                    </span>
                    <span className="text-[10px] text-blue-400 block">/ 5.0</span>
                  </div>
                </div>
              </div>

              {/* Teaching Strengths */}
              <div>
                <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Identified Teaching Strengths</span>
                </h4>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1.5 text-slate-700">
                  {selectedSummary.strengths && selectedSummary.strengths.length > 0 ? (
                    selectedSummary.strengths.map((str, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{str}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">Commendable teaching delivery across the evaluated week.</p>
                  )}
                </div>
              </div>

              {/* Areas for Improvement */}
              <div>
                <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>Areas for Pedagogical Improvement</span>
                </h4>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-1.5 text-slate-700">
                  {selectedSummary.improvements && selectedSummary.improvements.length > 0 ? (
                    selectedSummary.improvements.map((imp, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{imp}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">No major areas of concern noted by students during this session.</p>
                  )}
                </div>
              </div>

              {/* Administrator Recommendations */}
              {selectedSummary.recommendations && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#003580]" />
                    <span>Academic Administration Guidance</span>
                  </h4>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-slate-800 leading-relaxed">
                    {selectedSummary.recommendations}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Released on {formatDate(selectedSummary.dateShared)}
                </span>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl bg-[#003580] px-5 py-2 font-bold text-white shadow-sm hover:bg-blue-900 transition cursor-pointer"
                >
                  Close Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
