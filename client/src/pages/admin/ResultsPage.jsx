import { useEffect, useMemo, useState } from 'react';

import { apiGet, apiPost } from '../../api/http.js';
import { getAcademics } from '../../services/academicsAdmin.service.js';

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
     UI STATE
  ========================================================= */

  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const [savingMode, setSavingMode] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    return value >= 40
      ? 'PASS'
      : 'FAIL';
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
        const response = await getAcademics();

        if (cancelled) {
          return;
        }

        const loadedBranches = Array.isArray(
          response?.payload?.branches
        )
          ? response.payload.branches
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
    setBranchId(value);

    setIntakeId('');
    setBatchId('');
    setCourse('');

    setStudents([]);
    setRows([]);

    setError('');
    setSuccess('');
  }

  function handleIntakeChange(value) {
    setIntakeId(value);

    setBatchId('');
    setCourse('');

    setStudents([]);
    setRows([]);

    setError('');
    setSuccess('');
  }

  function handleBatchChange(value) {
    setBatchId(value);

    setCourse('');

    setStudents([]);
    setRows([]);

    setError('');
    setSuccess('');
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
    publish,
  }) {
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

    /*
      When publishing, require every student
      to have either:
      - marks
      OR
      - ABSENT status
    */
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
     SAVE RESULT
  ========================================================= */

  async function saveResult({
    publish = false,
  } = {}) {
    setError('');
    setSuccess('');

    const validationError =
      validateResult({
        publish,
      });

    if (validationError) {
      setError(
        validationError
      );

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

        /*
          IMPORTANT:

          true  -> student can see it
          false -> saved as draft only
        */
        isPublished:
          publish,

        results:
          rows.map((row) => ({
            student:
              row.student,

            marks:
              row.status === 'ABSENT'
                ? null
                : row.marks === ''
                  ? null
                  : Number(row.marks),

            grade:
              row.status === 'ABSENT'
                ? ''
                : row.grade.trim(),

            status:
              row.status,

            remarks:
              row.remarks.trim(),
          })),
      };

      const response =
        await apiPost(
          '/api/results',
          payload
        );

      setSuccess(
        publish
          ? 'Result saved and published successfully. Students can now view it.'
          : 'Result saved as draft successfully.'
      );

      /*
        Keep student group selected,
        but clear result information.
      */

      setResultTitle('');

      setRows((previous) =>
        previous.map((row) => ({
          ...row,

          marks: '',

          grade: '',

          status:
            'PENDING',

          remarks: '',
        }))
      );

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
     RENDER
  ========================================================= */

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Student Results
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Select the student group, enter their results and publish them to the student portal.
        </p>
      </div>

      {/* ERROR */}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {/* SUCCESS */}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      ) : null}

      {/* ADD RESULT */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-5 text-xl font-bold text-slate-900">
          Add Result
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
                hierarchyLoading
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
                !branchId ||
                intakes.length ===
                  0
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                {branchId &&
                intakes.length ===
                  0
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
                !intakeId ||
                batches.length ===
                  0
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                {intakeId &&
                batches.length ===
                  0
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
                setCourse(
                  event.target.value
                )
              }
              disabled={
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
              value={
                resultDate
              }
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
              value={
                resultTitle
              }
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

      {/* STUDENTS */}

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
                      {
                        row.studentId
                      }
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {
                        row.studentName
                      }
                    </td>

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
                            event
                              .target
                              .value
                          )
                        }
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </td>

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
                            event
                              .target
                              .value
                          )
                        }
                        className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={
                          row.status
                        }
                        onChange={(
                          event
                        ) => {
                          const value =
                            event
                              .target
                              .value;

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
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Optional"
                        className="min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm"
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

        {/* ACTION BUTTONS */}

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
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
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

            {/* SAVE AND PUBLISH */}

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
          </div>
        </div>
      </div>
    </div>
  );
}