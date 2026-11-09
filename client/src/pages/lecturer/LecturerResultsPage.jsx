import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  GraduationCap,
  Save,
  RefreshCcw,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
} from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../../api/http.js';
import { calculateGrade, calculateFinalExamResult } from '../../utils/gradeCalculator.js';
import RepeatMarksModal from '../../components/results/RepeatMarksModal.jsx';

const COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

export default function LecturerResultsPage() {
  const { lecturer } = useOutletContext() || {};

  // Saved Results list
  const [resultsList, setResultsList] = useState([]);
  const [selectedResultId, setSelectedResultId] = useState('');
  const [currentResult, setCurrentResult] = useState(null);

  // Form selections
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const [selectedBatch, setSelectedBatch] = useState(lecturer?.batchId || '');
  const [rows, setRows] = useState([]);

  // Repeat modal
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [selectedStudentRow, setSelectedStudentRow] = useState(null);

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search within table
  const [search, setSearch] = useState('');

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/api/results');
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setResultsList(list);

      if (list.length > 0 && !selectedResultId) {
        setSelectedResultId(list[0]._id || list[0].id);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load examination sheets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  // When selected examination changes, load its details and students
  useEffect(() => {
    if (!selectedResultId) {
      setCurrentResult(null);
      setRows([]);
      return;
    }

    const found = resultsList.find((r) => (r._id || r.id) === selectedResultId);
    if (found) {
      setCurrentResult(found);
      setSelectedCourse(found.course || COURSES[0]);
      setSelectedBatch(found.batchId || '');

      const initialRows = (found.results || []).map((item) => ({
        student: item.student?._id || item.student || '',
        studentId: item.studentId || item.student?.studentId || '',
        studentName: item.studentName || item.student?.fullName || 'Student',
        marks: item.marks !== null && item.marks !== undefined ? item.marks : '',
        grade: item.grade || (item.marks !== null && item.marks !== undefined ? calculateGrade(item.marks) : '—'),
        status: item.status || 'PENDING',
        repeatMarks: item.repeatMarks !== null && item.repeatMarks !== undefined ? item.repeatMarks : null,
        repeatGrade: item.repeatGrade || null,
        repeatDate: item.repeatDate || null,
        isResit: Boolean(item.isResit),
        finalResult:
          item.finalResult ||
          calculateFinalExamResult(item.marks, item.repeatMarks, item.status),
      }));
      setRows(initialRows);
    }
  }, [selectedResultId, resultsList]);

  // Handle Mark Change
  const handleMarkChange = (index, value) => {
    const nextRows = [...rows];
    const target = { ...nextRows[index] };

    if (value === '') {
      target.marks = '';
      target.grade = '—';
      target.status = 'PENDING';
      target.finalResult = target.repeatMarks !== null
        ? calculateFinalExamResult(null, target.repeatMarks, 'PENDING')
        : 'Pending';
    } else {
      const num = Number(value);
      if (Number.isFinite(num) && num >= 0 && num <= 100) {
        target.marks = num;
        target.grade = calculateGrade(num);
        target.status = num >= 60 ? 'PASS' : 'FAIL';
        target.finalResult = calculateFinalExamResult(num, target.repeatMarks, target.status);
      }
    }

    nextRows[index] = target;
    setRows(nextRows);
  };

  // Save Examination Marks
  const handleSaveMarks = async () => {
    if (!currentResult) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        resultTitle: currentResult.resultTitle,
        resultDate: currentResult.resultDate || new Date().toISOString().slice(0, 10),
        course: currentResult.course,
        branchId: currentResult.branchId,
        intakeId: currentResult.intakeId || '',
        batchId: currentResult.batchId,
        isPublished: currentResult.isPublished || false,
        results: rows.map((r) => ({
          student: r.student,
          studentId: r.studentId,
          studentName: r.studentName,
          marks: r.marks !== '' ? Number(r.marks) : null,
          grade: r.grade !== '—' ? r.grade : '',
          status: r.status,
          repeatMarks: r.repeatMarks,
          repeatGrade: r.repeatGrade,
          repeatDate: r.repeatDate,
          isResit: r.isResit,
          finalResult: r.finalResult,
        })),
      };

      await apiPut(`/api/results/${currentResult._id || currentResult.id}`, payload);
      setSuccess('Examination marks saved successfully to the college database.');
      loadResults();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err?.message || 'Failed to save examination marks.');
    } finally {
      setSaving(false);
    }
  };

  // Open Repeat Marks Modal
  const handleOpenRepeatModal = (row) => {
    setSelectedStudentRow(row);
    setRepeatModalOpen(true);
  };

  // Repeat modal save success
  const handleRepeatSuccess = (updatedData) => {
    setSuccess('Repeat examination marks recorded successfully!');
    setRepeatModalOpen(false);
    loadResults();
    setTimeout(() => setSuccess(''), 5000);
  };

  // Search filter
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.studentName?.toLowerCase().includes(q) ||
        r.studentId?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span>Student Examination Results</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter marks, recalculate grades, and record repeat examination results for your classes.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveMarks}
          disabled={saving || !currentResult}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#003580] hover:bg-blue-900 px-6 py-3 text-sm font-bold text-white shadow-md transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          <span>{saving ? 'Saving Marks...' : 'Save Examination Results'}</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess('')} className="text-emerald-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step-by-Step Guidance Banner */}
      <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-sky-50/40 to-white p-5 shadow-2xs">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 mb-2">
          Easy 5-Step Process
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003580] text-white font-bold text-xs shrink-0">
              1
            </span>
            <span>Select Examination</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003580] text-white font-bold text-xs shrink-0">
              2
            </span>
            <span>Review Class List</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003580] text-white font-bold text-xs shrink-0">
              3
            </span>
            <span>Enter Scores (0–100)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003580] text-white font-bold text-xs shrink-0">
              4
            </span>
            <span>Repeat Marks (&lt; 60)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0">
              5
            </span>
            <span>Click Save Results</span>
          </div>
        </div>
      </div>

      {/* Selection & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row items-stretch sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        {/* Examination Selector */}
        <div className="flex-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Choose Examination Sheet
          </label>
          <select
            value={selectedResultId}
            onChange={(e) => setSelectedResultId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none"
          >
            {resultsList.length === 0 ? (
              <option value="">No examination records found</option>
            ) : (
              resultsList.map((res) => (
                <option key={res._id || res.id} value={res._id || res.id}>
                  {res.resultTitle} ({res.course || 'Diploma'} • Batch {res.batchId || '—'})
                </option>
              ))
            )}
          </select>
        </div>

        {/* In-table search */}
        <div className="sm:w-72">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Search Student
          </label>
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#003580] mb-3" aria-hidden="true" />
            <p className="font-bold text-slate-700">Loading student examination records...</p>
          </div>
        ) : !currentResult ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-800">No examination selected</p>
            <p className="mt-1 text-slate-400">Please choose an examination from the dropdown above.</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <p className="text-base font-bold text-slate-800">No student records in this examination</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50/90 font-bold text-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Student ID</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4 text-center w-28">Original Marks</th>
                  <th className="py-3.5 px-4 text-center w-24">Original Grade</th>
                  <th className="py-3.5 px-4 text-center w-28">Repeat Marks</th>
                  <th className="py-3.5 px-4 text-center w-24">Repeat Grade</th>
                  <th className="py-3.5 px-4 text-center">Final Result</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => {
                  const hasRepeat = row.repeatMarks !== null && row.repeatMarks !== undefined;
                  const isEligibleForRepeat =
                    row.marks !== '' &&
                    row.marks !== null &&
                    Number(row.marks) < 60;

                  return (
                    <tr
                      key={row.studentId || idx}
                      className={`transition ${
                        hasRepeat
                          ? 'bg-amber-50/80 hover:bg-amber-100/70 border-l-4 border-amber-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Student ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {row.studentId}
                        </span>
                      </td>

                      {/* Student Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {row.studentName}
                        {hasRepeat && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                            <RefreshCcw className="h-3 w-3" aria-hidden="true" />
                            REPEAT EXAM
                          </span>
                        )}
                      </td>

                      {/* Original Marks Input */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={row.marks}
                          onChange={(e) => handleMarkChange(idx, e.target.value)}
                          placeholder="—"
                          className="w-20 rounded-xl border border-slate-300 py-1 px-2 text-center text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                        />
                      </td>

                      {/* Original Grade */}
                      <td className="py-3.5 px-4 text-center font-bold text-sm">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md ${
                            row.grade === 'F'
                              ? 'bg-rose-100 text-rose-800'
                              : row.grade !== '—'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {row.grade}
                        </span>
                      </td>

                      {/* Repeat Marks */}
                      <td className="py-3.5 px-4 text-center font-bold text-sm">
                        {hasRepeat ? (
                          <span className="font-mono text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-lg">
                            {row.repeatMarks}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Repeat Grade */}
                      <td className="py-3.5 px-4 text-center font-bold text-sm">
                        {hasRepeat ? (
                          <span className="text-amber-900">{row.repeatGrade || '—'}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Final Result Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {row.finalResult === 'Passed' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            Passed
                          </span>
                        )}
                        {row.finalResult === 'Passed (Repeat)' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                            Passed (Repeat)
                          </span>
                        )}
                        {row.finalResult === 'Failed' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                            Failed
                          </span>
                        )}
                        {row.finalResult === 'Failed (Repeat)' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-200 border border-rose-300 px-2.5 py-0.5 text-[10px] font-bold text-rose-900">
                            Failed (Repeat)
                          </span>
                        )}
                        {!['Passed', 'Passed (Repeat)', 'Failed', 'Failed (Repeat)'].includes(row.finalResult) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action: Enter Repeat Marks */}
                      <td className="py-3.5 px-4 text-right">
                        {isEligibleForRepeat ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRepeatModal(row)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition cursor-pointer"
                          >
                            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{hasRepeat ? 'Edit Repeat Marks' : 'Enter Repeat Marks'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not eligible</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Repeat Marks Modal */}
      {repeatModalOpen && selectedStudentRow && (
        <RepeatMarksModal
          isOpen={repeatModalOpen}
          onClose={() => setRepeatModalOpen(false)}
          studentRow={selectedStudentRow}
          resultTitle={currentResult?.resultTitle || 'Examination'}
          resultId={currentResult?._id || currentResult?.id}
          onSaveSuccess={handleRepeatSuccess}
        />
      )}
    </div>
  );
}
