import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGet, apiPost } from '../../api/http.js';
import { exportResultsReportToPdf } from '../../utils/exportResultsReport.js';

export default function ResultsReportModal({
  isOpen,
  onClose,
  initialFilters = {},
}) {
  // -------------------------------------------------------------
  // Filter Options & Loading State
  // -------------------------------------------------------------
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filterData, setFilterData] = useState({
    branches: [],
    diplomas: [],
    examinations: [],
  });

  // Active Selections
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedIntakeId, setSelectedIntakeId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedDiploma, setSelectedDiploma] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [customExamInput, setCustomExamInput] = useState('');

  // Report Type & Result Status
  const [reportType, setReportType] = useState('COMPLETE_BATCH');
  const [resultStatus, setResultStatus] = useState('ALL');

  // Student Selection Filter
  const [studentSelectionMode, setStudentSelectionMode] = useState('ALL'); // 'ALL' | 'ONE' | 'MULTIPLE'
  const [batchStudents, setBatchStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [individualStudentId, setIndividualStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Preview State
  const [reportData, setReportData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewSearch, setPreviewSearch] = useState('');

  // PDF Export State
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState('portrait');

  // -------------------------------------------------------------
  // 1. Fetch Filter Metadata from Server
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadFilters() {
      setFiltersLoading(true);
      try {
        const res = await apiGet('/api/results/reports/filters');
        if (!isMounted) return;

        setFilterData({
          branches: Array.isArray(res?.branches) ? res.branches : [],
          diplomas: Array.isArray(res?.diplomas) ? res.diplomas : [],
          examinations: Array.isArray(res?.examinations) ? res.examinations : [],
        });

        // Initialize with initialFilters if supplied
        if (initialFilters.branchId) {
          setSelectedBranchId(String(initialFilters.branchId));
        } else if (res?.branches?.length > 0) {
          setSelectedBranchId(String(res.branches[0].id));
        }

        if (initialFilters.intakeId) {
          setSelectedIntakeId(String(initialFilters.intakeId));
        }

        if (initialFilters.batchId) {
          setSelectedBatchId(String(initialFilters.batchId));
        }

        if (initialFilters.course) {
          setSelectedDiploma(String(initialFilters.course));
        } else if (res?.diplomas?.length > 0) {
          setSelectedDiploma(res.diplomas[0].name);
        }

        if (initialFilters.resultTitle) {
          setSelectedExam(String(initialFilters.resultTitle));
        }
      } catch (err) {
        if (isMounted) {
          setPreviewError(err?.message || 'Failed to load report filters');
        }
      } finally {
        if (isMounted) setFiltersLoading(false);
      }
    }

    loadFilters();
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialFilters]);

  // -------------------------------------------------------------
  // Cascading Academic Filter Calculations
  // -------------------------------------------------------------
  const currentBranch = useMemo(() => {
    return filterData.branches.find(
      (b) => String(b.id) === String(selectedBranchId)
    );
  }, [filterData.branches, selectedBranchId]);

  const availableIntakes = useMemo(() => {
    return currentBranch?.intakes || [];
  }, [currentBranch]);

  const currentIntake = useMemo(() => {
    return availableIntakes.find(
      (i) =>
        String(i.id) === String(selectedIntakeId) ||
        String(i.name) === String(selectedIntakeId)
    );
  }, [availableIntakes, selectedIntakeId]);

  const availableBatches = useMemo(() => {
    return currentIntake?.batches || [];
  }, [currentIntake]);

  // Handle cascading reset on branch change
  const handleBranchChange = (e) => {
    const newBranchId = e.target.value;
    setSelectedBranchId(newBranchId);
    setSelectedIntakeId('');
    setSelectedBatchId('');
    setSelectedStudentIds([]);
    setIndividualStudentId('');
  };

  // Handle cascading reset on intake change
  const handleIntakeChange = (e) => {
    const newIntakeId = e.target.value;
    setSelectedIntakeId(newIntakeId);
    setSelectedBatchId('');
    setSelectedStudentIds([]);
    setIndividualStudentId('');
  };

  // Handle batch change
  const handleBatchChange = (e) => {
    const newBatchId = e.target.value;
    setSelectedBatchId(newBatchId);
    setSelectedStudentIds([]);
    setIndividualStudentId('');
  };

  // Available examinations list
  const currentDiplomaObj = useMemo(() => {
    return filterData.diplomas.find((d) => d.name === selectedDiploma);
  }, [filterData.diplomas, selectedDiploma]);

  const availableExaminations = useMemo(() => {
    const set = new Set();
    if (currentDiplomaObj?.modules) {
      currentDiplomaObj.modules.forEach((m) => set.add(m));
    }
    filterData.examinations.forEach((e) => set.add(e));
    return Array.from(set).filter(Boolean);
  }, [currentDiplomaObj, filterData.examinations]);

  // -------------------------------------------------------------
  // 2. Fetch Available Students for Batch Roster Selection
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadBatchRoster() {
      try {
        // Query base batch students
        const res = await apiPost('/api/results/reports/data', {
          branchId: selectedBranchId,
          intakeId: selectedIntakeId,
          batchId: selectedBatchId,
          diploma: selectedDiploma,
          reportType: 'COMPLETE_BATCH',
          resultStatus: 'ALL',
        });

        if (isMounted && res?.students) {
          setBatchStudents(res.students);
        }
      } catch {
        // Fallback or ignore if batch is not fully selected yet
      }
    }

    if (selectedBranchId || selectedBatchId) {
      loadBatchRoster();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedBranchId, selectedIntakeId, selectedBatchId, selectedDiploma]);

  // -------------------------------------------------------------
  // 3. Fetch Report Preview Data
  // -------------------------------------------------------------
  const fetchReportData = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError('');

    try {
      const activeExamName = customExamInput.trim() || selectedExam;

      const payload = {
        branchId: selectedBranchId,
        intakeId: selectedIntakeId,
        batchId: selectedBatchId,
        diploma: selectedDiploma,
        examName: activeExamName,
        reportType,
        resultStatus,
        selectedStudentIds:
          studentSelectionMode === 'MULTIPLE' ? selectedStudentIds : [],
        individualStudentId:
          studentSelectionMode === 'ONE' ? individualStudentId : '',
      };

      const data = await apiPost('/api/results/reports/data', payload);
      setReportData(data);
    } catch (err) {
      setPreviewError(err?.message || 'Failed to generate report preview.');
    } finally {
      setPreviewLoading(false);
    }
  }, [
    selectedBranchId,
    selectedIntakeId,
    selectedBatchId,
    selectedDiploma,
    selectedExam,
    customExamInput,
    reportType,
    resultStatus,
    studentSelectionMode,
    selectedStudentIds,
    individualStudentId,
  ]);

  // Trigger preview fetch when key criteria change
  useEffect(() => {
    if (isOpen) {
      fetchReportData();
    }
  }, [fetchReportData, isOpen]);

  // -------------------------------------------------------------
  // Filtered Students in Preview Table
  // -------------------------------------------------------------
  const previewStudents = useMemo(() => {
    if (!reportData?.students) return [];
    if (!previewSearch.trim()) return reportData.students;

    const q = previewSearch.toLowerCase().trim();
    return reportData.students.filter(
      (s) =>
        s.studentName?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.grade?.toLowerCase().includes(q) ||
        s.resultStatus?.toLowerCase().includes(q)
    );
  }, [reportData?.students, previewSearch]);

  // -------------------------------------------------------------
  // Filtered Students in Checkbox Roster
  // -------------------------------------------------------------
  const filteredRosterStudents = useMemo(() => {
    if (!batchStudents) return [];
    if (!studentSearchQuery.trim()) return batchStudents;

    const q = studentSearchQuery.toLowerCase().trim();
    return batchStudents.filter(
      (s) =>
        s.studentName?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q)
    );
  }, [batchStudents, studentSearchQuery]);

  const handleToggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = () => {
    const allIds = filteredRosterStudents.map((s) => s.id || s.studentId);
    setSelectedStudentIds(allIds);
  };

  const handleClearSelectedStudents = () => {
    setSelectedStudentIds([]);
  };

  // -------------------------------------------------------------
  // 4. Download PDF Action
  // -------------------------------------------------------------
  const handleDownloadPdf = async () => {
    if (!reportData) return;
    setPdfGenerating(true);
    try {
      await exportResultsReportToPdf({
        header: reportData.header,
        summary: reportData.summary,
        students: reportData.students,
        orientation: pdfOrientation,
      });
    } catch (err) {
      alert(`PDF Generation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* =========================================================
            MODAL HEADER
        ========================================================= */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-4 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/30 text-blue-300 border border-blue-400/30">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Examination Results Report Generator
              </h2>
              <p className="text-xs text-blue-200">
                Generate and download official IAAC examination result sheets and performance summaries.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* =========================================================
            MODAL BODY (SCROLLABLE)
        ========================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Academic & Examination Filters */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Academic & Examination Filters
              </span>
              {filtersLoading && (
                <span className="text-xs text-blue-600 animate-pulse font-medium">
                  Loading filter options...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Filter 1: Branch */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Select Branch
                </label>
                <select
                  value={selectedBranchId}
                  onChange={handleBranchChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Branches</option>
                  {filterData.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Intake */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Select Intake
                </label>
                <select
                  value={selectedIntakeId}
                  onChange={handleIntakeChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Intakes</option>
                  {availableIntakes.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 3: Batch */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Select Batch
                </label>
                <select
                  value={selectedBatchId}
                  onChange={handleBatchChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Batches</option>
                  {availableBatches.map((ba) => (
                    <option key={ba.id} value={ba.id}>
                      {ba.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Diploma/Course */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Select Diploma
                </label>
                <select
                  value={selectedDiploma}
                  onChange={(e) => setSelectedDiploma(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Diplomas</option>
                  {filterData.diplomas.map((d) => (
                    <option key={d.id || d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 5: Examination */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Select Examination
                </label>
                <select
                  value={selectedExam}
                  onChange={(e) => {
                    setSelectedExam(e.target.value);
                    setCustomExamInput('');
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Examinations</option>
                  {availableExaminations.map((exam) => (
                    <option key={exam} value={exam}>
                      {exam}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 6: Result Status */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Result Status
                </label>
                <select
                  value={resultStatus}
                  onChange={(e) => setResultStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Results</option>
                  <option value="PASSED">Passed (Marks &ge; 60)</option>
                  <option value="FAILED">Failed (Marks &lt; 60)</option>
                  <option value="RESIT">Resit Students Only</option>
                  <option value="PENDING">Pending Results Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Report Type & Student Selection */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Report Type Selection (5 cols) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-xs lg:col-span-5">
              <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Select Report Type
              </span>

              <div className="space-y-2">
                {[
                  {
                    id: 'COMPLETE_BATCH',
                    title: '1. Complete Batch Results Report',
                    desc: 'Full list of all students enrolled in the batch.',
                  },
                  {
                    id: 'PASSED_STUDENTS',
                    title: '2. Passed Students Report',
                    desc: 'Only students meeting or exceeding the 60% pass threshold.',
                  },
                  {
                    id: 'FAILED_STUDENTS',
                    title: '3. Failed Students Report',
                    desc: 'Students scoring below 60% requiring re-examination.',
                  },
                  {
                    id: 'RESIT_EXAMINATION',
                    title: '4. Resit Examination Report',
                    desc: 'Students who completed re-sit / repeat examinations.',
                  },
                  {
                    id: 'INDIVIDUAL_STUDENT',
                    title: '5. Individual Student Results Report',
                    desc: 'Single student detailed performance report.',
                  },
                  {
                    id: 'PENDING_RESULTS',
                    title: '6. Pending Results Report',
                    desc: 'Students whose examination marks are yet to be entered.',
                  },
                  {
                    id: 'COMPLETE_DIPLOMA',
                    title: '7. Complete Diploma Results Report',
                    desc: 'Overall diploma completion status across all modules.',
                  },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition ${
                      reportType === item.id
                        ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={item.id}
                      checked={reportType === item.id}
                      onChange={(e) => {
                        setReportType(e.target.value);
                        if (e.target.value === 'INDIVIDUAL_STUDENT') {
                          setStudentSelectionMode('ONE');
                        }
                      }}
                      className="mt-1 h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 text-left">
                      <div className="text-xs font-bold text-slate-800">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        {item.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Student Selection Controls (7 cols) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-xs lg:col-span-7 flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Student Selection
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {batchStudents.length} Students in Batch Roster
                </span>
              </div>

              {/* Selection Mode Toggle */}
              <div className="mb-3 flex rounded-lg border border-slate-200 bg-slate-200/50 p-1 text-xs font-semibold text-slate-700">
                <button
                  type="button"
                  disabled={reportType === 'INDIVIDUAL_STUDENT'}
                  onClick={() => setStudentSelectionMode('ALL')}
                  className={`flex-1 rounded-md py-1.5 transition ${
                    studentSelectionMode === 'ALL'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  All Students
                </button>
                <button
                  type="button"
                  onClick={() => setStudentSelectionMode('ONE')}
                  className={`flex-1 rounded-md py-1.5 transition ${
                    studentSelectionMode === 'ONE'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  One Student
                </button>
                <button
                  type="button"
                  disabled={reportType === 'INDIVIDUAL_STUDENT'}
                  onClick={() => setStudentSelectionMode('MULTIPLE')}
                  className={`flex-1 rounded-md py-1.5 transition ${
                    studentSelectionMode === 'MULTIPLE'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Multiple Selected
                </button>
              </div>

              {/* ONE STUDENT SELECTOR */}
              {studentSelectionMode === 'ONE' && (
                <div className="mt-2 space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Choose Specific Student:
                  </label>
                  <select
                    value={individualStudentId}
                    onChange={(e) => setIndividualStudentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose Student --</option>
                    {batchStudents.map((s) => (
                      <option key={s.id || s.studentId} value={s.id || s.studentId}>
                        {s.studentId} — {s.studentName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* MULTIPLE STUDENTS CHECKBOX LIST */}
              {studentSelectionMode === 'MULTIPLE' && (
                <div className="flex-1 flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search by ID or name..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSelectAllStudents}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedStudents}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="text-[11px] font-medium text-slate-500">
                    Selected: {selectedStudentIds.length} of {batchStudents.length} students
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 divide-y divide-slate-100">
                    {filteredRosterStudents.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        No students found matching search.
                      </div>
                    ) : (
                      filteredRosterStudents.map((s) => {
                        const sKey = s.id || s.studentId;
                        const isChecked = selectedStudentIds.includes(sKey);
                        return (
                          <label
                            key={sKey}
                            className="flex cursor-pointer items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded"
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleStudent(sKey)}
                                className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {s.studentId}
                              </span>
                              <span className="text-xs text-slate-700">
                                {s.studentName}
                              </span>
                            </div>
                            {s.marks !== null && s.marks !== undefined && (
                              <span
                                className={`text-[11px] font-bold ${
                                  s.marks >= 60 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {s.marks} marks ({s.grade || '-'})
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ALL STUDENTS NOTICE */}
              {studentSelectionMode === 'ALL' && (
                <div className="flex-1 flex flex-col justify-center items-center rounded-lg border border-dashed border-slate-200 bg-white/60 p-6 text-center text-xs text-slate-500">
                  <svg
                    className="mb-2 h-7 w-7 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="font-semibold text-slate-700">
                    All Enrolled Students
                  </span>
                  <span>
                    The generated report will include all matching students enrolled in the selected academic filters.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Performance Summary Cards */}
          {reportData?.summary && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Examination Performance Summary
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  Minimum Passing Score: 60%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    Total Students
                  </div>
                  <div className="mt-1 text-xl font-extrabold text-slate-900">
                    {reportData.summary.totalStudents}
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-center shadow-2xs">
                  <div className="text-[11px] font-bold uppercase text-blue-700">
                    In Report
                  </div>
                  <div className="mt-1 text-xl font-extrabold text-blue-900">
                    {reportData.summary.includedStudents}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center shadow-2xs">
                  <div className="text-[11px] font-bold uppercase text-emerald-700">
                    Passed (Score &ge; 60)
                  </div>
                  <div className="mt-1 text-xl font-extrabold text-emerald-700">
                    {reportData.summary.passed}
                  </div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-center shadow-2xs">
                  <div className="text-[11px] font-bold uppercase text-rose-700">
                    Failed (Score &lt; 60)
                  </div>
                  <div className="mt-1 text-xl font-extrabold text-rose-700">
                    {reportData.summary.failed}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-center shadow-2xs">
                  <div className="text-[11px] font-bold uppercase text-amber-700">
                    Resit Candidates
                  </div>
                  <div className="mt-1 text-xl font-extrabold text-amber-700">
                    {reportData.summary.resitStudents}
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-center shadow-2xs">
                  <div className="text-[11px] font-bold uppercase text-indigo-700">
                    Overall Pass Rate
                  </div>
                  <div className="mt-1 text-xl font-extrabold text-indigo-900">
                    {reportData.summary.passRate}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Live Results Preview Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Live Report Preview
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  {previewStudents.length} Students
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter preview..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={fetchReportData}
                  disabled={previewLoading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  title="Refresh Preview"
                >
                  <svg
                    className={`h-3.5 w-3.5 ${previewLoading ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {previewError ? (
              <div className="p-6 text-center text-sm font-semibold text-rose-600">
                {previewError}
              </div>
            ) : previewLoading ? (
              <div className="p-12 text-center text-sm text-slate-500">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2"></div>
                <div>Generating accurate examination preview from MongoDB...</div>
              </div>
            ) : previewStudents.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                No students or examination marks match the selected criteria.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-900 text-white">
                    <tr>
                      <th className="py-2.5 px-3 text-center font-bold">No.</th>
                      <th className="py-2.5 px-3 font-bold">Student ID</th>
                      <th className="py-2.5 px-3 font-bold">Student Name</th>
                      <th className="py-2.5 px-3 text-center font-bold">Marks</th>
                      <th className="py-2.5 px-3 text-center font-bold">Grade</th>
                      <th className="py-2.5 px-3 text-center font-bold">Result Status</th>
                      <th className="py-2.5 px-3 text-center font-bold">Exam Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewStudents.map((s, idx) => {
                      const numMarks = s.marks !== null && s.marks !== undefined ? Number(s.marks) : null;
                      const isPass = numMarks !== null && numMarks >= 60;
                      const isFail = numMarks !== null && numMarks < 60;
                      const isResit = Boolean(s.isResit);

                      return (
                        <tr
                          key={s.id || s.studentId || idx}
                          className="hover:bg-slate-50/80 transition"
                        >
                          <td className="py-2 px-3 text-center text-slate-500 font-mono">
                            {s.no || idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {s.studentId}
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium">
                            {s.studentName}
                          </td>
                          <td className="py-2 px-3 text-center font-bold">
                            {numMarks !== null ? (
                              <span
                                className={
                                  isResit
                                    ? 'text-amber-600 font-bold'
                                    : isPass
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }
                              >
                                {numMarks}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {s.grade && s.grade !== '—' ? (
                              <span
                                className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-bold ${
                                  isFail
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {s.grade}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                s.resultStatus === 'Passed'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : s.resultStatus === 'Failed'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {s.resultStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isResit ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                RESIT
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Regular</span>
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
        </div>

        {/* =========================================================
            MODAL FOOTER (ACTION BUTTONS)
        ========================================================= */}
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between rounded-b-2xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">Page Orientation:</span>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPdfOrientation('portrait')}
                className={`rounded-md px-3 py-1 transition ${
                  pdfOrientation === 'portrait'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setPdfOrientation('landscape')}
                className={`rounded-md px-3 py-1 transition ${
                  pdfOrientation === 'landscape'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Landscape
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
            >
              Close
            </button>

            <button
              type="button"
              disabled={pdfGenerating || previewLoading || !reportData || previewStudents.length === 0}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-blue-800 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfGenerating ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Generating Official PDF...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Download PDF Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

