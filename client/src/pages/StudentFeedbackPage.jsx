import { useEffect, useState } from 'react';
import {
  MessageSquareText,
  Star,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Clock,
  LoaderCircle,
  X,
  BookOpen,
  Send,
  History,
  ShieldCheck,
} from 'lucide-react';
import { apiGet, apiPost, ApiError } from '../api/http.js';

const RATING_CATEGORIES = [
  {
    key: 'teachingClarity',
    label: '1. Teaching Clarity',
    question: 'How clearly did the lecturer explain the lesson?',
  },
  {
    key: 'subjectKnowledge',
    label: '2. Subject Knowledge',
    question: 'How well did the lecturer demonstrate knowledge of the subject?',
  },
  {
    key: 'communication',
    label: '3. Communication',
    question: 'How effectively did the lecturer communicate with students?',
  },
  {
    key: 'studentEngagement',
    label: '4. Student Engagement',
    question: 'How well did the lecturer encourage student participation?',
  },
  {
    key: 'overallExperience',
    label: '5. Overall Experience',
    question: 'How would you rate your overall learning experience?',
  },
];

const RATING_LABELS = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

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

export default function StudentFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [requests, setRequests] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'

  // Submission Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [ratings, setRatings] = useState({
    teachingClarity: 5,
    subjectKnowledge: 5,
    communication: 5,
    studentEngagement: 5,
    overallExperience: 5,
  });
  const [positiveFeedback, setPositiveFeedback] = useState('');
  const [improvementFeedback, setImprovementFeedback] = useState('');
  const [learningDifficulties, setLearningDifficulties] = useState('');
  const [concerns, setConcerns] = useState('');
  const [suggestions, setSuggestions] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadData = () => {
    setLoading(true);
    setError('');
    Promise.all([
      apiGet('/api/feedback/student/available'),
      apiGet('/api/feedback/student/history'),
    ])
      .then(([availableData, historyData]) => {
        setRequests(Array.isArray(availableData?.requests) ? availableData.requests : []);
        setHistoryItems(Array.isArray(historyData?.feedback) ? historyData.feedback : []);
      })
      .catch((err) => {
        setError(err?.message || 'Unable to load feedback information.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openFeedbackModal = (requestItem) => {
    setSelectedRequest(requestItem);
    setRatings({
      teachingClarity: 5,
      subjectKnowledge: 5,
      communication: 5,
      studentEngagement: 5,
      overallExperience: 5,
    });
    setPositiveFeedback('');
    setImprovementFeedback('');
    setLearningDifficulties('');
    setConcerns('');
    setSuggestions('');
    setModalError('');
    setModalOpen(true);
  };

  const handleRatingChange = (categoryKey, value) => {
    setRatings((prev) => ({
      ...prev,
      [categoryKey]: value,
    }));
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setSubmitting(true);
    setModalError('');

    try {
      await apiPost('/api/feedback/student/submit-request', {
        feedbackRequestId: selectedRequest.id,
        ratings,
        positiveFeedback,
        improvementFeedback,
        learningDifficulties,
        concerns,
        suggestions,
      });

      setSuccessMessage('Thank you! Your feedback has been submitted successfully and recorded confidentially.');
      setModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setModalError('You have already submitted feedback for this session.');
      } else {
        setModalError(err?.message || 'Failed to submit feedback. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#003580] mb-3" />
        <p className="text-xs font-bold text-slate-600">Loading student feedback center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#003580] via-[#173B75] to-blue-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-300">
            <MessageSquareText className="h-4 w-4 text-sky-400" />
            <span>Academic Teaching Quality</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Lecturer Feedback
          </h1>
          <p className="mt-2 max-w-2xl text-xs sm:text-sm text-sky-100/90 leading-relaxed">
            Share your experience and help us improve the quality of teaching. Your candid feedback helps maintain academic excellence at IAAC.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeTab === 'active'
              ? 'bg-[#003580] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active Feedback Sessions ({requests.filter((r) => r.canSubmit).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#003580] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>My Submission History ({historyItems.length})</span>
        </button>
      </div>

      {/* Tab 1: Available Feedback Requests */}
      {activeTab === 'active' && (
        <div>
          {requests.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
              <MessageSquareText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Feedback Requests Available</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                There are currently no active feedback evaluations scheduled for your batch. Weekly evaluations will appear here when scheduled by administration.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {requests.map((reqItem) => (
                <div
                  key={reqItem.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Top Row: Week & Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-blue-50 border border-blue-200 text-[#003580] px-3 py-1 text-xs font-bold">
                        {reqItem.feedbackWeek}
                      </span>

                      {reqItem.feedbackStatus === 'Submitted' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-0.5 text-xs font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Submitted</span>
                        </span>
                      ) : reqItem.feedbackStatus === 'Closed' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-3 py-0.5 text-xs font-bold">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>Closed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-3 py-0.5 text-xs font-bold">
                          <span>Not Submitted</span>
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{reqItem.lecturerName}</h3>
                      {reqItem.lecturerId && (
                        <span className="font-mono text-[10px] font-bold text-[#003580] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {reqItem.lecturerId}
                        </span>
                      )}

                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{reqItem.moduleName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>Batch: <strong className="text-slate-800">{reqItem.batch}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>Deadline: <strong>{formatDate(reqItem.submissionDeadline)}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Confidential Evaluation
                    </span>

                    {reqItem.canSubmit ? (
                      <button
                        type="button"
                        onClick={() => openFeedbackModal(reqItem)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#003580] hover:bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                        <span>Give Feedback</span>
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">
                        {reqItem.hasSubmitted ? 'Feedback Completed' : 'Session Expired'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Feedback History */}
      {activeTab === 'history' && (
        <div>
          {historyItems.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
              <History className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Past Submissions</h3>
              <p className="mt-1 text-xs text-slate-400">
                You haven't submitted any feedback evaluations yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.lecturer?.name || 'Lecturer'}</h4>
                      {item.lecturer?.lecturerId && (
                        <span className="font-mono text-[10px] font-bold text-[#003580]">
                          {item.lecturer.lecturerId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        <span>{item.rating} / 5</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Submitted: {formatDate(item.submittedAt)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 rounded-xl p-3">
                    {item.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          GIVE FEEDBACK MODAL (Sections 8, 9, 10 Requirements)
      ========================================================= */}
      {modalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-4 text-white">
              <div>
                <h2 className="text-base font-bold">Lecturer Teaching Evaluation</h2>
                <p className="text-[11px] text-sky-200 mt-0.5">
                  {selectedRequest.lecturerName} • {selectedRequest.moduleName} ({selectedRequest.feedbackWeek})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitFeedback} className="p-6 overflow-y-auto space-y-6 text-xs">
              {modalError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Confidentiality Notice */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-blue-900 flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[#003580] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">100% Confidential Feedback</span>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Your personal identity will not be shared with the lecturer. Feedback is compiled into anonymized summary reports to uphold teaching standards.
                  </p>
                </div>
              </div>

              {/* Part 1: 5-Point Rating Scales (Section 8) */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                  Part 1: Teaching Quality Ratings (Required)
                </h3>

                {RATING_CATEGORIES.map((cat) => {
                  const currentValue = ratings[cat.key] || 5;
                  return (
                    <div key={cat.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <span className="font-bold text-slate-900 block">{cat.label}</span>
                          <span className="text-[11px] text-slate-500">{cat.question}</span>
                        </div>
                        <span className="font-bold text-xs text-[#003580]">
                          {RATING_LABELS[currentValue]} ({currentValue}/5)
                        </span>
                      </div>

                      {/* 5-Star Selection */}
                      <div className="flex items-center gap-2 pt-1">
                        {[1, 2, 3, 4, 5].map((starVal) => (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => handleRatingChange(cat.key, starVal)}
                            className="p-1 rounded-lg hover:bg-amber-100 transition cursor-pointer"
                            title={`${starVal} - ${RATING_LABELS[starVal]}`}
                          >
                            <Star
                              className={`h-7 w-7 transition ${
                                starVal <= currentValue
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Part 2: Qualitative Written Comments (Section 9) */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                  Part 2: Written Feedback & Suggestions (Optional)
                </h3>

                {/* Question 1: Positive Feedback */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    1. What did the lecturer do well?
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="e.g. Explained complex flight mechanics clearly, used engaging real-world examples..."
                    value={positiveFeedback}
                    onChange={(e) => setPositiveFeedback(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Question 2: Areas for Improvement */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    2. What could the lecturer improve?
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="e.g. Could allocate more time for student questions, pace of slide presentations..."
                    value={improvementFeedback}
                    onChange={(e) => setImprovementFeedback(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Question 3: Learning Difficulties */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    3. Did you experience any difficulties understanding the lessons?
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="e.g. Specific aviation formulas or technical jargon that needed more explanation..."
                    value={learningDifficulties}
                    onChange={(e) => setLearningDifficulties(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Question 4: Issues or Concerns */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    4. Do you have any concerns regarding the lecturer or teaching sessions?
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="e.g. Audio clarity, punctuality, study notes availability..."
                    value={concerns}
                    onChange={(e) => setConcerns(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Question 5: Additional Suggestions */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    5. Do you have any suggestions to improve future lectures?
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="e.g. Incorporate more case studies, group discussions, practical workshop tasks..."
                    value={suggestions}
                    onChange={(e) => setSuggestions(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#003580] hover:bg-blue-900 px-6 py-2.5 font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>Submit Evaluation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
