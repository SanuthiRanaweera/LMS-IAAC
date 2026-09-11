import { useEffect, useMemo, useState } from 'react';

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from '../../api/http.js';

const COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

export default function ResultsPage() {
  /* =========================================================
     ACADEMIC HIERARCHY
  ========================================================= */

  const [branches, setBranches] = useState([]);

  const [branchId, setBranchId] = useState('');
  const [intakeId, setIntakeId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [course, setCourse] = useState('');

  /* =========================================================
     RESULT INFORMATION
  ========================================================= */

  const [resultTitle, setResultTitle] = useState('');

  const [resultDate, setResultDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  /* =========================================================
     STUDENTS
  ========================================================= */

  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState([]);

  /* =========================================================
     SAVED RESULTS
  ========================================================= */

  const [savedResults, setSavedResults] = useState([]);
  const [savedResultsLoading, setSavedResultsLoading] = useState(false);

  /* =========================================================
     EDITING
  ========================================================= */

  const [editingResultId, setEditingResultId] = useState('');
  const [editingPublished, setEditingPublished] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');

  /* =========================================================
     UI STATE
  ========================================================= */

  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const [savingMode, setSavingMode] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSavedStatus, setLastSavedStatus] = useState('');

  /* =========================================================
     HELPERS
  ========================================================= */

  function getItemId(item) {
    return String(
      item?.id ||
        item?._id ||
        item?.key ||
        item?.code ||
        item?.name ||
        ''
    );
  }

  function calculateGrade(marks) {
    if (
      marks === '' ||
      marks === null ||
      marks === undefined
    ) {
      return '';
    }

    const value = Number(marks);

    if (Number.isNaN(value)) {
      return '';
    }

    if (value >= 75) return 'A';
    if (value >= 65) return 'B';
    if (value >= 55) return 'C';
    if (value >= 40) return 'S';

    return 'F';
  }

  function calculateStatus(marks) {
    if (
      marks === '' ||
      marks === null ||
      marks === undefined
    ) {
      return 'PENDING';
    }

    const value = Number(marks);

    if (Number.isNaN(value)) {
      return 'PENDING';
    }

    return value >= 40 ? 'PASS' : 'FAIL';
  }

  function formatDate(value) {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString();
  }

  function dateInputValue(value) {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
  }

  /* =========================================================
     LOAD FULL ACADEMIC HIERARCHY
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadHierarchy() {
      setHierarchyLoading(true);
      setError('');

      try {
        const response = await apiGet('/api/materials/hierarchy/full');

        if (cancelled) {
          return;
        }

        const loadedBranches = Array.isArray(
          response?.branches
        )
          ? response.branches
          : [];

        setBranches(loadedBranches);
      } catch (err) {
        if (!cancelled) {
          setBranches([]);

          setError(
            err?.message ||
              'Failed to load branches, intakes and batches.'
          );
        }
      } finally {
        if (!cancelled) {
          setHierarchyLoading(false);
        }
      }
    }

    loadHierarchy();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     LOAD SAVED RESULTS
  ========================================================= */

  async function loadSavedResults() {
    try {
      setSavedResultsLoading(true);

      const response = await apiGet('/api/results');

      setSavedResults(
        Array.isArray(response?.results)
          ? response.results
          : []
      );
    } catch (err) {
      console.error(
        'Failed to load saved results:',
        err
      );
    } finally {
      setSavedResultsLoading(false);
    }
  }

  useEffect(() => {
    loadSavedResults();
  }, []);

  /* =========================================================
     SELECTED BRANCH
  ========================================================= */

  const selectedBranch = useMemo(() => {
    return branches.find(
      (branch) =>
        getItemId(branch) === String(branchId)
    );
  }, [branches, branchId]);

  /* =========================================================
     INTAKES
  ========================================================= */

  const intakes = useMemo(() => {
    return Array.isArray(selectedBranch?.intakes)
      ? selectedBranch.intakes
      : [];
  }, [selectedBranch]);

  /* =========================================================
     SELECTED INTAKE
  ========================================================= */

  const selectedIntake = useMemo(() => {
    return intakes.find(
      (intake) =>
        getItemId(intake) === String(intakeId)
    );
  }, [intakes, intakeId]);

  /* =========================================================
     BATCHES
  ========================================================= */

  const batches = useMemo(() => {
    return Array.isArray(selectedIntake?.batches)
      ? selectedIntake.batches
      : [];
  }, [selectedIntake]);

  /* =========================================================
     SELECT CHANGES
  ========================================================= */

  function handleBranchChange(value) {
    setEditingResultId('');
    setEditingPublished(false);

    setBranchId(value);

    setIntakeId('');
    setBatchId('');
    setCourse('');

    setStudents([]);
    setRows([]);

    setResultTitle('');

    setError('');
    setSuccess('');
    setLastSavedStatus('');
  }

  function handleIntakeChange(value) {
    setEditingResultId('');
    setEditingPublished(false);

    setIntakeId(value);

    setBatchId('');
    setCourse('');

    setStudents([]);
    setRows([]);

    setResultTitle('');

    setError('');
    setSuccess('');
    setLastSavedStatus('');
  }

  function handleBatchChange(value) {
    setEditingResultId('');
    setEditingPublished(false);

    setBatchId(value);

    setCourse('');

    setStudents([]);
    setRows([]);

    setResultTitle('');

    setError('');
    setSuccess('');
    setLastSavedStatus('');
  }

  function handleCourseChange(value) {
    setEditingResultId('');
    setEditingPublished(false);

    setCourse(value);

    setResultTitle('');

    setStudents([]);
    setRows([]);

    setError('');
    setSuccess('');
    setLastSavedStatus('');
  }

  /* =========================================================
     LOAD MATCHING STUDENTS
  ========================================================= */

  const canLoadStudents = Boolean(
    branchId &&
      intakeId &&
      batchId &&
      course
  );

  useEffect(() => {
    /*
      IMPORTANT:

      When editing an existing result, do not reload blank
      students because that would overwrite the saved marks.
    */

    if (editingResultId) {
      return;
    }

    if (!canLoadStudents) {
      setStudents([]);
      setRows([]);
      return;
    }

    let cancelled = false;

    async function loadStudents() {
      setStudentsLoading(true);
      setError('');
      setSuccess('');
      setLastSavedStatus('');

      try {
        const params = new URLSearchParams({
          branchId,
          intakeId,
          batchId,
          course,
        });

        const response = await apiGet(
          `/api/admin/students/results?${params.toString()}`
        );

        if (cancelled) {
          return;
        }

        const loadedStudents = Array.isArray(
          response?.students
        )
          ? response.students
          : [];

        setStudents(loadedStudents);

        setRows(
          loadedStudents.map((student) => ({
            student: student.id,
            studentId: student.studentId,
            studentName: student.fullName,

            marks: '',
            grade: '',
            status: 'PENDING',
            remarks: '',
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setStudents([]);
          setRows([]);

          setError(
            err?.message ||
              'Failed to load students.'
          );
        }
      } finally {
        if (!cancelled) {
          setStudentsLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [
    canLoadStudents,
    branchId,
    intakeId,
    batchId,
    course,
    editingResultId,
  ]);

  /* =========================================================
     UPDATE RESULT ROW
  ========================================================= */

  function updateRow(index, field, value) {
    setRows((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  /* =========================================================
     MARKS CHANGE
  ========================================================= */

  function handleMarksChange(index, value) {
    if (
      value !== '' &&
      (
        Number(value) < 0 ||
        Number(value) > 100
      )
    ) {
      return;
    }

    setRows((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,

              marks: value,

              grade:
                calculateGrade(value),

              status:
                calculateStatus(value),
            }
          : row
      )
    );
  }

  /* =========================================================
     VALIDATION
  ========================================================= */

  function validateResult({
    publish = false,
  } = {}) {
    if (!branchId) {
      return 'Please select a branch.';
    }

    if (!intakeId) {
      return 'Please select an intake.';
    }

    if (!batchId) {
      return 'Please select a batch.';
    }

    if (!course) {
      return 'Please select a diploma.';
    }

    if (!resultDate) {
      return 'Please select a result date.';
    }

    if (!resultTitle.trim()) {
      return 'Please enter a result title.';
    }

    if (rows.length === 0) {
      return 'No students were found for the selected group.';
    }

    const invalidMarks = rows.find(
      (row) =>
        row.marks !== '' &&
        (
          Number(row.marks) < 0 ||
          Number(row.marks) > 100
        )
    );

    if (invalidMarks) {
      return `Marks for ${invalidMarks.studentId} must be between 0 and 100.`;
    }

    if (publish) {
      const incompleteStudent = rows.find(
        (row) =>
          row.status !== 'ABSENT' &&
          (
            row.marks === '' ||
            row.marks === null ||
            row.marks === undefined
          )
      );

      if (incompleteStudent) {
        return `Enter marks for ${incompleteStudent.studentId} before publishing.`;
      }
    }

    return '';
  }

  /* =========================================================
     BUILD RESULT ROW PAYLOAD
  ========================================================= */

  function buildResultRowsPayload() {
    return rows.map((row) => ({
      student: row.student,

      marks:
        row.status === 'ABSENT'
          ? null
          : row.marks === ''
            ? null
            : Number(row.marks),

      grade:
        row.status === 'ABSENT'
          ? ''
          : String(row.grade || '').trim(),

      status:
        row.status,

      remarks:
        String(row.remarks || '').trim(),
    }));
  }

  /* =========================================================
     CREATE RESULT
  ========================================================= */

  async function saveResult({
    publish = false,
  } = {}) {
    setError('');
    setSuccess('');
    setLastSavedStatus('');

    const validationError =
      validateResult({
        publish,
      });

    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingMode(
      publish
        ? 'publish'
        : 'draft'
    );

    try {
      const payload = {
        resultTitle:
          resultTitle.trim(),

        resultDate,

        branchId,
        intakeId,
        batchId,
        course,

        isPublished:
          publish,

        results:
          buildResultRowsPayload(),
      };

      const response = await apiPost(
        '/api/results',
        payload
      );

      setLastSavedStatus(
        publish
          ? 'published'
          : 'draft'
      );

      setSuccess(
        publish
          ? 'Result saved and published successfully. Students can now view it.'
          : 'Result saved as draft successfully.'
      );

      /*
        Keep marks visible after save.
      */

      await loadSavedResults();

      return response;
    } catch (err) {
      setError(
        err?.message ||
          (
            publish
              ? 'Failed to publish result.'
              : 'Failed to save result.'
          )
      );
    } finally {
      setSavingMode('');
    }
  }

  /* =========================================================
     LOAD SAVED RESULT FOR EDITING
  ========================================================= */

  async function editSavedResult(resultId) {
    if (!resultId) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLastSavedStatus('');

      setActionLoadingId(resultId);

      const response = await apiGet(
        `/api/results/${resultId}`
      );

      const result = response?.result;

      if (!result) {
        setError('Result not found.');
        return;
      }

      /*
        Set editing first so the automatic students useEffect
        does not overwrite the result rows with blank marks.
      */

      setEditingResultId(result.id);
      setEditingPublished(
        Boolean(result.isPublished)
      );

      setBranchId(
        result.branchId || ''
      );

      setIntakeId(
        result.intakeId || ''
      );

      setBatchId(
        result.batchId || ''
      );

      setCourse(
        result.course || ''
      );

      setResultTitle(
        result.resultTitle || ''
      );

      setResultDate(
        dateInputValue(
          result.resultDate
        )
      );

      const resultRows =
        Array.isArray(
          result.results
        )
          ? result.results
          : [];

      const loadedRows =
        resultRows.map(
          (row) => ({
            student:
              row.student,

            studentId:
              row.studentId || '',

            studentName:
              row.studentName || '',

            marks:
              row.marks === null ||
              row.marks === undefined
                ? ''
                : String(row.marks),

            grade:
              row.grade || '',

            status:
              row.status ||
              'PENDING',

            remarks:
              row.remarks || '',
          })
        );

      setRows(loadedRows);

      setStudents(
        loadedRows.map(
          (row) => ({
            id:
              row.student,

            studentId:
              row.studentId,

            fullName:
              row.studentName,
          })
        )
      );

      setLastSavedStatus(
        result.isPublished
          ? 'published'
          : 'draft'
      );

      setSuccess(
        'Result loaded. You can now edit the marks and click Update Result.'
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (err) {
      setError(
        err?.message ||
          'Failed to load result.'
      );
    } finally {
      setActionLoadingId('');
    }
  }

  /* =========================================================
     UPDATE EXISTING RESULT
  ========================================================= */

  async function updateExistingResult() {
    if (!editingResultId) {
      return;
    }

    setError('');
    setSuccess('');

    const validationError =
      validateResult({
        publish:
          editingPublished,
      });

    if (validationError) {
      setError(
        validationError
      );

      return;
    }

    setSavingMode('update');

    try {
      const payload = {
        resultTitle:
          resultTitle.trim(),

        resultDate,

        results:
          buildResultRowsPayload(),
      };

      await apiPut(
        `/api/results/${editingResultId}`,
        payload
      );

      setSuccess(
        'Result updated successfully.'
      );

      setLastSavedStatus(
        editingPublished
          ? 'published'
          : 'draft'
      );

      /*
        Marks stay visible after update.
      */

      await loadSavedResults();
    } catch (err) {
      setError(
        err?.message ||
          'Failed to update result.'
      );
    } finally {
      setSavingMode('');
    }
  }

  /* =========================================================
     CANCEL EDITING
  ========================================================= */

  function cancelEdit() {
    setEditingResultId('');
    setEditingPublished(false);

    setResultTitle('');

    setSuccess('');
    setError('');
    setLastSavedStatus('');

    /*
      The useEffect will reload the students for the currently
      selected group and return the page to create mode.
    */
  }

  /* =========================================================
     DELETE SAVED RESULT
  ========================================================= */

  async function deleteSavedResult(result) {
    if (!result?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${result.resultTitle || 'this result'}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      setActionLoadingId(
        result.id
      );

      await apiDelete(
        `/api/results/${result.id}`
      );

      if (
        editingResultId ===
        result.id
      ) {
        setEditingResultId('');
        setEditingPublished(false);
        setResultTitle('');
        setRows([]);
        setStudents([]);
        setLastSavedStatus('');
      }

      setSuccess(
        'Result deleted successfully.'
      );

      await loadSavedResults();
    } catch (err) {
      setError(
        err?.message ||
          'Failed to delete result.'
      );
    } finally {
      setActionLoadingId('');
    }
  }

  /* =========================================================
     PUBLISH / UNPUBLISH
  ========================================================= */

  async function togglePublish(result) {
    if (!result?.id) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      setActionLoadingId(
        result.id
      );

      if (
        result.isPublished
      ) {
        await apiPut(
          `/api/results/${result.id}/unpublish`,
          {}
        );

        setSuccess(
          'Result unpublished successfully. Students can no longer see it.'
        );
      } else {
        await apiPut(
          `/api/results/${result.id}/publish`,
          {}
        );

        setSuccess(
          'Result published successfully. Students can now see it.'
        );
      }

      /*
        If the result currently being edited is the same result,
        update its editing publication state too.
      */

      if (
        editingResultId ===
        result.id
      ) {
        setEditingPublished(
          !result.isPublished
        );

        setLastSavedStatus(
          result.isPublished
            ? 'draft'
            : 'published'
        );
      }

      await loadSavedResults();
    } catch (err) {
      setError(
        err?.message ||
          'Failed to change publish status.'
      );
    } finally {
      setActionLoadingId('');
    }
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Student Results
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Select the student group, enter their results and publish them to the student portal.
        </p>
      </div>

      {/* =====================================================
          EDITING NOTICE
      ===================================================== */}

      {editingResultId ? (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-blue-800">
              Editing saved result
            </div>

            <p className="mt-1 text-xs text-blue-700">
              Change the marks, grade, status, remarks, title or date and click Update Result.
            </p>
          </div>

          <span
            className={[
              'inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold',
              editingPublished
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700',
            ].join(' ')}
          >
            {editingPublished
              ? 'Published'
              : 'Draft'}
          </span>
        </div>
      ) : null}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {/* =====================================================
          SUCCESS
      ===================================================== */}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      ) : null}

      {/* =====================================================
          ADD / EDIT RESULT
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-5 text-xl font-bold text-slate-900">
          {editingResultId
            ? 'Edit Result'
            : 'Add Result'}
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          {/* BRANCH */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Branch
            </label>

            <select
              value={branchId}
              onChange={(event) =>
                handleBranchChange(
                  event.target.value
                )
              }
              disabled={
                hierarchyLoading ||
                Boolean(
                  editingResultId
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                {hierarchyLoading
                  ? 'Loading branches...'
                  : 'Select branch'}
              </option>

              {branches.map(
                (branch) => {
                  const id =
                    getItemId(
                      branch
                    );

                  return (
                    <option
                      key={id}
                      value={id}
                    >
                      {branch?.name ||
                        id}
                    </option>
                  );
                }
              )}
            </select>
          </div>

          {/* INTAKE */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Intake
            </label>

            <select
              value={intakeId}
              onChange={(event) =>
                handleIntakeChange(
                  event.target.value
                )
              }
              disabled={
                Boolean(
                  editingResultId
                ) ||
                !branchId ||
                intakes.length === 0
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                {branchId &&
                intakes.length === 0
                  ? 'No intakes available'
                  : 'Select intake'}
              </option>

              {intakes.map(
                (intake) => {
                  const id =
                    getItemId(
                      intake
                    );

                  return (
                    <option
                      key={id}
                      value={id}
                    >
                      {intake?.name ||
                        id}
                    </option>
                  );
                }
              )}
            </select>
          </div>

          {/* BATCH */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Batch
            </label>

            <select
              value={batchId}
              onChange={(event) =>
                handleBatchChange(
                  event.target.value
                )
              }
              disabled={
                Boolean(
                  editingResultId
                ) ||
                !intakeId ||
                batches.length === 0
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                {intakeId &&
                batches.length === 0
                  ? 'No batches available'
                  : 'Select batch'}
              </option>

              {batches.map(
                (batch) => {
                  const id =
                    getItemId(
                      batch
                    );

                  return (
                    <option
                      key={id}
                      value={id}
                    >
                      {batch?.name ||
                        id}
                    </option>
                  );
                }
              )}
            </select>
          </div>

          {/* DIPLOMA */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Diploma
            </label>

            <select
              value={course}
              onChange={(event) =>
                handleCourseChange(
                  event.target.value
                )
              }
              disabled={
                Boolean(
                  editingResultId
                ) ||
                !batchId
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                Select diploma
              </option>

              {COURSES.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>

          {/* RESULT DATE */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Result Date
            </label>

            <input
              type="date"
              value={resultDate}
              onChange={(event) =>
                setResultDate(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* RESULT TITLE */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Result Title
            </label>

            <input
              type="text"
              value={resultTitle}
              onChange={(event) =>
                setResultTitle(
                  event.target.value
                )
              }
              placeholder="Example: Cabin Crew Final Examination 2026"
              className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          STUDENTS
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            Students
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {studentsLoading
              ? 'Loading students...'
              : `${students.length} student(s) found`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Student ID
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Student Name
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Marks
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Grade
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Status
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Remarks
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.map(
                (
                  row,
                  index
                ) => (
                  <tr
                    key={
                      row.student
                    }
                    className="hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-800">
                      {row.studentId}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {row.studentName}
                    </td>

                    {/* MARKS */}

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={
                          row.status ===
                          'ABSENT'
                        }
                        value={
                          row.marks
                        }
                        onChange={(
                          event
                        ) =>
                          handleMarksChange(
                            index,
                            event.target.value
                          )
                        }
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                      />
                    </td>

                    {/* GRADE */}

                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={
                          row.grade
                        }
                        disabled={
                          row.status ===
                          'ABSENT'
                        }
                        onChange={(
                          event
                        ) =>
                          updateRow(
                            index,
                            'grade',
                            event.target.value
                          )
                        }
                        className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                      />
                    </td>

                    {/* STATUS */}

                    <td className="px-4 py-3">
                      <select
                        value={
                          row.status
                        }
                        onChange={(
                          event
                        ) => {
                          const value =
                            event.target.value;

                          setRows(
                            (
                              previous
                            ) =>
                              previous.map(
                                (
                                  item,
                                  rowIndex
                                ) =>
                                  rowIndex ===
                                  index
                                    ? {
                                        ...item,

                                        status:
                                          value,

                                        ...(value ===
                                        'ABSENT'
                                          ? {
                                              marks:
                                                '',
                                              grade:
                                                '',
                                            }
                                          : {}),
                                      }
                                    : item
                              )
                          );
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="PENDING">
                          Pending
                        </option>

                        <option value="PASS">
                          Pass
                        </option>

                        <option value="FAIL">
                          Fail
                        </option>

                        <option value="ABSENT">
                          Absent
                        </option>
                      </select>
                    </td>

                    {/* REMARKS */}

                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={
                          row.remarks
                        }
                        onChange={(
                          event
                        ) =>
                          updateRow(
                            index,
                            'remarks',
                            event.target.value
                          )
                        }
                        placeholder="Optional"
                        className="min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </td>
                  </tr>
                )
              )}

              {!studentsLoading &&
              rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm font-medium text-slate-500"
                  >
                    Select Branch, Intake, Batch and Diploma to display students.
                  </td>
                </tr>
              ) : null}

              {studentsLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm font-medium text-slate-500"
                  >
                    Loading students...
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* =================================================
            ACTION AREA
        ================================================= */}

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700">
              {rows.length > 0
                ? `${rows.length} student result(s)`
                : 'No students selected'}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Draft results are hidden from students. Published results appear in My Results.
            </p>

            {lastSavedStatus ? (
              <div className="mt-3">
                <span
                  className={[
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold',
                    lastSavedStatus ===
                    'published'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700',
                  ].join(' ')}
                >
                  {lastSavedStatus ===
                  'published'
                    ? 'Published'
                    : 'Draft'}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {/* =================================================
                EDIT MODE
            ================================================= */}

            {editingResultId ? (
              <>
                <button
                  type="button"
                  onClick={
                    cancelEdit
                  }
                  disabled={
                    Boolean(
                      savingMode
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    updateExistingResult
                  }
                  disabled={
                    Boolean(
                      savingMode
                    ) ||
                    rows.length ===
                      0
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#003580] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#002b68] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingMode ===
                  'update'
                    ? 'Updating...'
                    : 'Update Result'}
                </button>
              </>
            ) : (
              <>
                {/* SAVE DRAFT */}

                <button
                  type="button"
                  onClick={() =>
                    saveResult({
                      publish:
                        false,
                    })
                  }
                  disabled={
                    Boolean(
                      savingMode
                    ) ||
                    rows.length ===
                      0
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#003580] bg-white px-6 py-2.5 text-sm font-bold text-[#003580] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingMode ===
                  'draft'
                    ? 'Saving...'
                    : 'Save Draft'}
                </button>

                {/* SAVE & PUBLISH */}

                <button
                  type="button"
                  onClick={() =>
                    saveResult({
                      publish:
                        true,
                    })
                  }
                  disabled={
                    Boolean(
                      savingMode
                    ) ||
                    rows.length ===
                      0
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#003580] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#002b68] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingMode ===
                  'publish'
                    ? 'Publishing...'
                    : 'Save & Publish'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          SAVED RESULTS
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            Saved Results
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Edit, publish, unpublish or delete previously saved results.
          </p>
        </div>

        {savedResultsLoading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading saved results...
          </div>
        ) : savedResults.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No saved results found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Result Title
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Course
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Date
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Students
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {savedResults.map(
                  (result) => {
                    const loading =
                      actionLoadingId ===
                      result.id;

                    return (
                      <tr
                        key={
                          result.id
                        }
                        className={[
                          'hover:bg-slate-50',
                          editingResultId ===
                          result.id
                            ? 'bg-blue-50/60'
                            : '',
                        ].join(' ')}
                      >
                        {/* RESULT TITLE */}

                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {result.resultTitle ||
                              '-'}
                          </div>

                          {editingResultId ===
                          result.id ? (
                            <div className="mt-1 text-xs font-semibold text-blue-600">
                              Currently editing
                            </div>
                          ) : null}
                        </td>

                        {/* COURSE */}

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {result.course ||
                            '-'}
                        </td>

                        {/* DATE */}

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {formatDate(
                            result.resultDate
                          )}
                        </td>

                        {/* STUDENT COUNT */}

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {result.studentCount ??
                            0}
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">
                          {result.isPublished ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                              Draft
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {/* EDIT */}

                            <button
                              type="button"
                              disabled={
                                loading
                              }
                              onClick={() =>
                                editSavedResult(
                                  result.id
                                )
                              }
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {loading
                                ? 'Please wait...'
                                : 'Edit'}
                            </button>

                            {/* PUBLISH / UNPUBLISH */}

                            <button
                              type="button"
                              disabled={
                                loading
                              }
                              onClick={() =>
                                togglePublish(
                                  result
                                )
                              }
                              className={[
                                'rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50',
                                result.isPublished
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                              ].join(
                                ' '
                              )}
                            >
                              {result.isPublished
                                ? 'Unpublish'
                                : 'Publish'}
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              disabled={
                                loading
                              }
                              onClick={() =>
                                deleteSavedResult(
                                  result
                                )
                              }
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}