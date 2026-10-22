import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileDown, Eye, RotateCcw, Filter, Users, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { apiGet, apiPost } from '../../api/http.js';
import { exportResultsReportToPdf } from '../../utils/exportResultsReport.js';
import ResultsReportModal from './ResultsReportModal.jsx';

export default function ResultsReportGenerator({ initialFilters = {} }) {
  // -------------------------------------------------------------
  // Filter Metadata from Backend
  // -------------------------------------------------------------
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filterData, setFilterData] = useState({
    branches: [],
    diplomas: [],
    examinations: [],
  });

  // Section 1: Academic Filters
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedIntakeId, setSelectedIntakeId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedDiploma, setSelectedDiploma] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [customExamInput, setCustomExamInput] = useState('');

  // Section 2: Report Configuration
  const [reportType, setReportType] = useState('COMPLETE_BATCH');
  const [resultStatus, setResultStatus] = useState('ALL');
  const [studentSelectionMode, setStudentSelectionMode] = useState('ALL'); // 'ALL' | 'ONE' | 'MULTIPLE'
  const [batchStudents, setBatchStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [individualStudentId, setIndividualStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Section 3: Results Preview State
  const [reportData, setReportData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewSearch, setPreviewSearch] = useState('');

  // Section 4: Report Actions & PDF Export State
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // -------------------------------------------------------------
  // 1. Fetch Academic Filters from Server
  // -------------------------------------------------------------
  const loadFilters = useCallback(async () => {
    setFiltersLoading(true);
    try {
      const res = await apiGet('/api/results/reports/filters');
      const loadedBranches = Array.isArray(res?.branches) ? res.branches : [];
      const loadedDiplomas = Array.isArray(res?.diplomas) ? res.diplomas : [];
      const loadedExaminations = Array.isArray(res?.examinations) ? res.examinations : [];

      setFilterData({
        branches: loadedBranches,
        diplomas: loadedDiplomas,
        examinations: loadedExaminations,
      });

      if (initialFilters.branchId) {
        setSelectedBranchId(String(initialFilters.branchId));
      } else if (loadedBranches.length > 0) {
        setSelectedBranchId(String(loadedBranches[0].id));
      }

      if (initialFilters.intakeId) setSelectedIntakeId(String(initialFilters.intakeId));
      if (initialFilters.batchId) setSelectedBatchId(String(initialFilters.batchId));
      if (initialFilters.course) {
        setSelectedDiploma(String(initialFilters.course));
      } else if (loadedDiplomas.length > 0) {
        setSelectedDiploma(loadedDiplomas[0].name);
      }
      if (initialFilters.resultTitle) setSelectedExam(String(initialFilters.resultTitle));
    } catch (err) {
      setPreviewError(err?.message || 'Failed to load filter metadata.');
    } finally {
      setFiltersLoading(false);
    }
  }, [initialFilters]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  // -------------------------------------------------------------
  // Cascading Academic Filter Calculations
  // -------------------------------------------------------------
  const currentBranch = useMemo(() => {
    return filterData.branches.find((b) => String(b.id) === String(selectedBranchId));
  }, [filterData.branches, selectedBranchId]);

  const availableIntakes = useMemo(() => {
    return currentBranch?.intakes || [];
  }, [currentBranch]);

  const currentIntake = useMemo(() => {
    return availableIntakes.find(
      (i) => String(i.id) === String(selectedIntakeId) || String(i.name) === String(selectedIntakeId)
    );
  }, [availableIntakes, selectedIntakeId]);

  const availableBatches = useMemo(() => {
    return currentIntake?.batches || [];
  }, [currentIntake]);

  const handleBranchChange = (e) => {
    const val = e.target.value;
    setSelectedBranchId(val);
    setSelectedIntakeId('');
    setSelectedBatchId('');
    setSelectedStudentIds([]);
    setIndividualStudentId('');
  };

  const handleIntakeChange = (e) => {
    const val = e.target.value;
    setSelectedIntakeId(val);
    setSelectedBatchId('');
    setSelectedStudentIds([]);
    setIndividualStudentId('');
  };

  const handleBatchChange = (e) => {
    setSelectedBatchId(e.target.value);
    setSelectedStudentIds([]);
    setIndividualStudentId('');
  };

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
  // 2. Query Batch Roster for Checkbox Selection
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    async function loadBatchRoster() {
      try {
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
        // Ignore fallback
      }
    }

    if (selectedBranchId || selectedBatchId) {
      loadBatchRoster();
    }
    return () => {
      isMounted = false;
    };
  }, [selectedBranchId, selectedIntakeId, selectedBatchId, selectedDiploma]);

  // -------------------------------------------------------------
  // 3. Fetch Report Data from MongoDB
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
        selectedStudentIds: studentSelectionMode === 'MULTIPLE' ? selectedStudentIds : [],
        individualStudentId: studentSelectionMode === 'ONE' ? individualStudentId : '',
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

  // Initial fetch
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // -------------------------------------------------------------
  // Filtered Students in Preview & Roster
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
    setSelectedStudentIds(filteredRosterStudents.map((s) => s.id || s.studentId));
  };

  const handleClearSelectedStudents = () => {
    setSelectedStudentIds([]);
  };

  // -------------------------------------------------------------
  // Reset All Filters
  // -------------------------------------------------------------
  const handleResetFilters = () => {
    setSelectedBranchId(filterData.branches[0]?.id ? String(filterData.branches[0].id) : '');
    setSelectedIntakeId('');
    setSelectedBatchId('');
    setSelectedDiploma(filterData.diplomas[0]?.name || '');
    setSelectedExam('');
    setCustomExamInput('');
    setReportType('COMPLETE_BATCH');
    setResultStatus('ALL');
    setStudentSelectionMode('ALL');
    setSelectedStudentIds([]);
    setIndividualStudentId('');
    setStudentSearchQuery('');
    setPreviewSearch('');
  };

  // -------------------------------------------------------------
  // Download Report Action
  // -------------------------------------------------------------
  const handleDownloadReport = async () => {
    setPdfGenerating(true);
    try {
      // Re-fetch latest saved data immediately before download to ensure 100% fresh results
      const activeExamName = customExamInput.trim() || selectedExam;
      const payload = {
        branchId: selectedBranchId,
        intakeId: selectedIntakeId,
        batchId: selectedBatchId,
        diploma: selectedDiploma,
        examName: activeExamName,
        reportType,
        resultStatus,
        selectedStudentIds: studentSelectionMode === 'MULTIPLE' ? selectedStudentIds : [],
        individualStudentId: studentSelectionMode === 'ONE' ? individualStudentId : '',
      };

      const freshData = await apiPost('/api/results/reports/data', payload);
      setReportData(freshData);

      await exportResultsReportToPdf({
        header: freshData.header,
        summary: freshData.summary,
        students: freshData.students,
        orientation: reportType === 'COMPLETE_DIPLOMA' ? 'landscape' : 'portrait',
      });
    } catch (err) {
      alert(`Report download failed: ${err.message || 'Unknown error'}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================
          SECTION 1 – ACADEMIC FILTERS
      ========================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Section 1 – Academic Filters
            </h2>
          </div>
          {filtersLoading && (
            <span className="text-xs font-semibold text-blue-600 animate-pulse">
              Loading academic hierarchy...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Filter 1: Branch */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Select Branch
            </label>
            <select
              value={selectedBranchId}
              onChange={handleBranchChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Examinations</option>
              {availableExaminations.map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================
          SECTION 2 – REPORT CONFIGURATION
      ========================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Report Type & Result Status (5 cols) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Section 2 – Report Type
            </h2>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Pass Mark: 60%
            </span>
          </div>

          {/* Result Status Dropdown */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Filter by Result Status
            </label>
            <select
              value={resultStatus}
              onChange={(e) => setResultStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Results</option>
              <option value="PASSED">Passed (Score &ge; 60)</option>
              <option value="FAILED">Failed (Score &lt; 60)</option>
              <option value="RESIT">Resit Students Only</option>
              <option value="PENDING">Pending Results Only</option>
            </select>
          </div>

          {/* 7 Report Types Radio List */}
          <div className="space-y-2 pt-1">
            {[
              {
                id: 'COMPLETE_BATCH',
                title: '1. Complete Batch Results Report',
                desc: 'All enrolled students matching the selected academic filters.',
              },
              {
                id: 'PASSED_STUDENTS',
                title: '2. Passed Students Report',
                desc: 'Only students meeting or exceeding the 60% passing mark.',
              },
              {
                id: 'FAILED_STUDENTS',
                title: '3. Failed Students Report',
                desc: 'Students scoring below 60% who are eligible for resit.',
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
                desc: 'Students whose examination marks are missing or pending.',
              },
              {
                id: 'COMPLETE_DIPLOMA',
                title: '7. Complete Diploma Results Report',
                desc: 'Overall diploma completion status across all modules.',
              },
            ].map((item) => (
              <label
                key={item.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 transition ${
                  reportType === item.id
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="inPageReportType"
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
                  <div className="text-xs font-bold text-slate-800">{item.title}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Student Selection (7 cols) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-7 flex flex-col">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Student Selection
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {batchStudents.length} Students in Roster
            </span>
          </div>

          {/* Mode Selector Toggle */}
          <div className="mb-3 flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-semibold text-slate-700">
            <button
              type="button"
              disabled={reportType === 'INDIVIDUAL_STUDENT'}
              onClick={() => setStudentSelectionMode('ALL')}
              className={`flex-1 rounded-lg py-1.5 transition ${
                studentSelectionMode === 'ALL'
                  ? 'bg-white text-blue-900 shadow-xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              All Students
            </button>
            <button
              type="button"
              onClick={() => setStudentSelectionMode('ONE')}
              className={`flex-1 rounded-lg py-1.5 transition ${
                studentSelectionMode === 'ONE'
                  ? 'bg-white text-blue-900 shadow-xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              One Student
            </button>
            <button
              type="button"
              disabled={reportType === 'INDIVIDUAL_STUDENT'}
              onClick={() => setStudentSelectionMode('MULTIPLE')}
              className={`flex-1 rounded-lg py-1.5 transition ${
                studentSelectionMode === 'MULTIPLE'
                  ? 'bg-white text-blue-900 shadow-xs font-bold'
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
                Select Specific Student:
              </label>
              <select
                value={individualStudentId}
                onChange={(e) => setIndividualStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none"
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
                  placeholder="Search student by ID or name..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSelectAllStudents}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearSelectedStudents}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="text-[11px] font-medium text-slate-500">
                Selected: {selectedStudentIds.length} of {batchStudents.length} students
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 divide-y divide-slate-100">
                {filteredRosterStudents.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No matching students found in batch.
                  </div>
                ) : (
                  filteredRosterStudents.map((s) => {
                    const sKey = s.id || s.studentId;
                    const isChecked = selectedStudentIds.includes(sKey);
                    return (
                      <label
                        key={sKey}
                        className="flex cursor-pointer items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStudent(sKey)}
                            className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {s.studentId}
                          </span>
                          <span className="text-xs text-slate-700 font-medium">
                            {s.studentName}
                          </span>
                        </div>
                        {s.marks !== null && s.marks !== undefined && (
                          <span
                            className={`text-[11px] font-bold ${
                              s.marks >= 60 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {s.marks} ({s.grade || '-'})
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ALL STUDENTS MODE INFO */}
          {studentSelectionMode === 'ALL' && (
            <div className="flex-1 flex flex-col justify-center items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500">
              <Users className="mb-2 h-8 w-8 text-slate-400" />
              <span className="font-bold text-slate-800 text-sm">
                All Enrolled Students Selected
              </span>
              <p className="mt-1 max-w-sm text-slate-500">
                The generated examination report will automatically include all students enrolled in the matching academic batch and diploma.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          SECTION 3 – RESULTS PREVIEW & PERFORMANCE SUMMARY
      ========================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-4">
        {/* Summary KPI Cards */}
        {reportData?.summary && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Section 3 – Examination Performance Summary
              </h2>
              <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                Pass Mark Threshold: 60 Marks
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-center shadow-2xs">
                <div className="text-[11px] font-bold uppercase text-slate-500">Total Students</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900">
                  {reportData.summary.totalStudents}
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-center shadow-2xs">
                <div className="text-[11px] font-bold uppercase text-blue-700">In Report</div>
                <div className="mt-1 text-2xl font-extrabold text-blue-900">
                  {reportData.summary.includedStudents}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-center shadow-2xs">
                <div className="text-[11px] font-bold uppercase text-emerald-700">Passed (&ge; 60)</div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-700">
                  {reportData.summary.passed}
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 text-center shadow-2xs">
                <div className="text-[11px] font-bold uppercase text-rose-700">Failed (&lt; 60)</div>
                <div className="mt-1 text-2xl font-extrabold text-rose-700">
                  {reportData.summary.failed}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-center shadow-2xs">
                <div className="text-[11px] font-bold uppercase text-amber-700">Resit Candidates</div>
                <div className="mt-1 text-2xl font-extrabold text-amber-700">
                  {reportData.summary.resitStudents}
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 text-center shadow-2xs">
                <div className="text-[11px] font-bold uppercase text-indigo-700">Overall Pass Rate</div>
                <div className="mt-1 text-2xl font-extrabold text-indigo-900">
                  {reportData.summary.passRate}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Results Preview Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Results Preview Table
              </span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                {previewStudents.length} Students
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search preview table..."
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={fetchReportData}
                disabled={previewLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                title="Refresh Preview"
              >
                <RefreshCw className={`h-3 w-3 ${previewLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {previewError ? (
            <div className="p-8 text-center text-sm font-semibold text-rose-600">
              {previewError}
            </div>
          ) : previewLoading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2"></div>
              <div>Retrieving latest examination marks from MongoDB...</div>
            </div>
          ) : previewStudents.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No examination results match the selected academic criteria.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-900 text-white">
                  <tr>
                    <th className="py-2.5 px-3 text-center font-bold">No.</th>
                    <th className="py-2.5 px-3 font-bold">Student ID</th>
                    <th className="py-2.5 px-3 font-bold">Student Name</th>
                    <th className="py-2.5 px-3 text-center font-bold">Original Marks</th>
                    <th className="py-2.5 px-3 text-center font-bold">Original Grade</th>
                    <th className="py-2.5 px-3 text-center font-bold">Repeat Marks</th>
                    <th className="py-2.5 px-3 text-center font-bold">Repeat Grade</th>
                    <th className="py-2.5 px-3 text-center font-bold">Final Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewStudents.map((s, idx) => {
                    const origMarks =
                      s.originalMarks !== undefined && s.originalMarks !== null
                        ? s.originalMarks
                        : s.marks;
                    const numOrig =
                      origMarks !== null && origMarks !== undefined && origMarks !== ''
                        ? Number(origMarks)
                        : null;
                    const origGrade =
                      s.originalGrade && s.originalGrade !== '-' && s.originalGrade !== '—'
                        ? s.originalGrade
                        : s.grade;
                    const hasRepeat =
                      s.repeatMarks !== null &&
                      s.repeatMarks !== undefined &&
                      s.repeatMarks !== '' &&
                      s.repeatMarks !== '-' &&
                      s.repeatMarks !== '—';
                    const repMarks = hasRepeat ? s.repeatMarks : '—';
                    const repGrade =
                      hasRepeat && s.repeatGrade && s.repeatGrade !== '-' && s.repeatGrade !== '—'
                        ? s.repeatGrade
                        : '—';
                    const finalRes =
                      s.finalResult ||
                      (numOrig !== null
                        ? numOrig >= 60
                          ? 'Passed'
                          : 'Failed'
                        : s.resultStatus || 'Pending');

                    const isPass = numOrig !== null && numOrig >= 60;
                    const isFail = numOrig !== null && numOrig < 60;

                    return (
                      <tr
                        key={s.id || s.studentId || idx}
                        className={`transition ${
                          hasRepeat
                            ? 'bg-amber-50/80 hover:bg-amber-100/60 border-l-4 border-amber-500'
                            : 'hover:bg-slate-50 border-l-4 border-transparent'
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-500 font-mono">
                          {s.no || idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {s.studentId}
                        </td>
                        <td className="py-2 px-3 text-slate-800 font-medium">
                          <span>{s.studentName}</span>
                          {hasRepeat && (
                            <span className="inline-flex items-center ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-300">
                              REPEAT EXAM
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {numOrig !== null ? (
                            <span className={isPass ? 'text-emerald-600' : 'text-rose-600'}>
                              {numOrig}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {origGrade && origGrade !== '—' && origGrade !== '-' ? (
                            <span
                              className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-bold ${
                                isFail
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {origGrade}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {hasRepeat ? (
                            <span className="text-amber-600 font-bold">{repMarks}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {hasRepeat && repGrade !== '—' ? (
                            <span className="inline-flex rounded px-1.5 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              {repGrade}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              finalRes.startsWith('Passed')
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : finalRes.startsWith('Failed')
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : finalRes === 'Absent'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {finalRes}
                          </span>
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
          SECTION 4 – REPORT ACTIONS
      ========================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Apply Filters */}
          <button
            type="button"
            onClick={fetchReportData}
            disabled={previewLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Apply Filters</span>
          </button>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-100 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Preview Report Modal Button */}
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-5 py-2.5 text-xs font-bold text-blue-800 shadow-2xs transition hover:bg-blue-100 cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-blue-700" />
            <span>Preview Report</span>
          </button>

          {/* Download Results Report Button */}
          <button
            type="button"
            disabled={pdfGenerating || previewLoading || !reportData || previewStudents.length === 0}
            onClick={handleDownloadReport}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-blue-800 hover:to-indigo-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pdfGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span>Download Results Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================
          HIGH-RESOLUTION MODAL PREVIEW
      ========================================================= */}
      <ResultsReportModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        initialFilters={{
          branchId: selectedBranchId,
          intakeId: selectedIntakeId,
          batchId: selectedBatchId,
          course: selectedDiploma,
          resultTitle: selectedExam,
        }}
      />
    </div>
  );
}

