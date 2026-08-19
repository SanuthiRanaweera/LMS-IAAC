import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '../../api/http.js';

/* =========================================================
   HELPERS
========================================================= */

function compareStudentsByStudentId(a, b) {
  const rawA = String(a?.studentId || '')
    .trim()
    .toUpperCase();

  const rawB = String(b?.studentId || '')
    .trim()
    .toUpperCase();

  const numA = Number.parseInt(
    (rawA.match(/(\d+)/) || [])[1] || '',
    10
  );

  const numB = Number.parseInt(
    (rawB.match(/(\d+)/) || [])[1] || '',
    10
  );

  const prefixA = rawA.replace(/\d+/g, '');
  const prefixB = rawB.replace(/\d+/g, '');

  if (prefixA !== prefixB) {
    return prefixA.localeCompare(
      prefixB,
      undefined,
      {
        sensitivity: 'base',
      }
    );
  }

  const safeA = Number.isFinite(numA)
    ? numA
    : Number.POSITIVE_INFINITY;

  const safeB = Number.isFinite(numB)
    ? numB
    : Number.POSITIVE_INFINITY;

  if (safeA !== safeB) {
    return safeA - safeB;
  }

  return rawA.localeCompare(
    rawB,
    undefined,
    {
      sensitivity: 'base',
    }
  );
}

function getItemId(item) {
  return String(
    item?.id ||
      item?._id ||
      item?.key ||
      item?.code ||
      item?.name ||
      ''
  ).trim();
}

function buildIntakeOptions(
  branches,
  branchId
) {
  if (!branchId) {
    return [];
  }

  const branch = branches.find(
    (item) =>
      getItemId(item) ===
      String(branchId)
  );

  return Array.isArray(branch?.intakes)
    ? branch.intakes
    : [];
}

function buildBatchOptions(
  branches,
  branchId,
  intakeId
) {
  if (
    !branchId ||
    !intakeId
  ) {
    return [];
  }

  const branch = branches.find(
    (item) =>
      getItemId(item) ===
      String(branchId)
  );

  const intake =
    Array.isArray(branch?.intakes)
      ? branch.intakes.find(
          (item) =>
            getItemId(item) ===
            String(intakeId)
        )
      : null;

  return Array.isArray(
    intake?.batches
  )
    ? intake.batches
    : [];
}

const EMPTY_FORM = {
  fullName: '',
  email: '',
  studentId: '',
  dob: '',
  gender: '',
  nic: '',
  course: '',
  school: '',
  olResult: '',
  olMath: '',
  olEnglish: '',
  whatsappNumber: '',
  phoneNumber: '',
  address: '',
  guardianName: '',
  guardianPhoneNumber: '',
  password: '',
  branchId: '',
  intakeId: '',
  batchId: '',
};

const COURSE_OPTIONS = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

/* =========================================================
   PAGE
========================================================= */

export default function AdminStudentsPage() {
  const outletContext =
    useOutletContext();

  const admin =
    outletContext?.admin;

  const canDelete =
    String(
      admin?.role || ''
    ) === 'superadmin';

  /* =======================================================
     STUDENT DATA
  ======================================================= */

  const [q, setQ] =
    useState('');

  const [data, setData] =
    useState(null);

  const [error, setError] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  /* =======================================================
     METRICS
  ======================================================= */

  const [
    totalStudents,
    setTotalStudents,
  ] = useState(0);

  /* =======================================================
     ACADEMY NAVIGATION
  ======================================================= */

  const [
    activeView,
    setActiveView,
  ] = useState(null);

  const [
    courseFilter,
    setCourseFilter,
  ] = useState('all');

  /* =======================================================
     ACTION MENU
  ======================================================= */

  const [
    openActionsFor,
    setOpenActionsFor,
  ] = useState(null);

  /* =======================================================
     DELETE
  ======================================================= */

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    deleteError,
    setDeleteError,
  ] = useState(null);

  /* =======================================================
     DETAIL
  ======================================================= */

  const [
    detailStudent,
    setDetailStudent,
  ] = useState(null);

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    detailError,
    setDetailError,
  ] = useState(null);

  /* =======================================================
     ACADEMIC HIERARCHY
  ======================================================= */

  const [
    branches,
    setBranches,
  ] = useState([]);

  const [
    hierarchyError,
    setHierarchyError,
  ] = useState(null);

  /* =======================================================
     CREATE
  ======================================================= */

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    createError,
    setCreateError,
  ] = useState(null);

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    passwordCopied,
    setPasswordCopied,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState({
    ...EMPTY_FORM,
  });

  /* =======================================================
     EDIT
  ======================================================= */

  const [
    editingStudent,
    setEditingStudent,
  ] = useState(null);

  const [
    editForm,
    setEditForm,
  ] = useState({
    ...EMPTY_FORM,
    id: '',
  });

  const [
    editError,
    setEditError,
  ] = useState(null);

  const [
    savingEdit,
    setSavingEdit,
  ] = useState(false);

  /* =======================================================
     HIERARCHY OPTIONS
  ======================================================= */

  const createIntakes =
    useMemo(
      () =>
        buildIntakeOptions(
          branches,
          form.branchId
        ),
      [
        branches,
        form.branchId,
      ]
    );

  const createBatches =
    useMemo(
      () =>
        buildBatchOptions(
          branches,
          form.branchId,
          form.intakeId
        ),
      [
        branches,
        form.branchId,
        form.intakeId,
      ]
    );

  const editIntakes =
    useMemo(
      () =>
        buildIntakeOptions(
          branches,
          editForm.branchId
        ),
      [
        branches,
        editForm.branchId,
      ]
    );

  const editBatches =
    useMemo(
      () =>
        buildBatchOptions(
          branches,
          editForm.branchId,
          editForm.intakeId
        ),
      [
        branches,
        editForm.branchId,
        editForm.intakeId,
      ]
    );

  /* =======================================================
     QUERY STRING

     IMPORTANT:
     100 was causing your incorrect totals.

     We request up to 1000 students so the cards use
     the complete student set.
  ======================================================= */

  const queryString =
    useMemo(() => {
      const query =
        q.trim();

      if (!query) {
        return 'limit=1000';
      }

      return `q=${encodeURIComponent(
        query
      )}&limit=1000`;
    }, [q]);

  /* =======================================================
     SORTED STUDENTS
  ======================================================= */

  const sortedStudents =
    useMemo(() => {
      const list =
        Array.isArray(
          data?.students
        )
          ? data.students
          : [];

      return [...list].sort(
        compareStudentsByStudentId
      );
    }, [data]);

  /* =======================================================
     BRANCH COUNTS
  ======================================================= */

  const branchCounts =
    useMemo(() => {
      const counts = {};

      for (
        const student of
        sortedStudents
      ) {
        const branchId =
          String(
            student?.branchId ||
              ''
          ).trim();

        const key =
          branchId ||
          'unassigned';

        counts[key] =
          (counts[key] || 0) +
          1;
      }

      return counts;
    }, [sortedStudents]);

  /* =======================================================
     MATCHED / UNASSIGNED COUNTS
  ======================================================= */

  const assignedStudentsCount =
    useMemo(() => {
      return branches.reduce(
        (total, branch) => {
          const branchId =
            getItemId(branch);

          return (
            total +
            Number(
              branchCounts[
                branchId
              ] || 0
            )
          );
        },
        0
      );
    }, [
      branches,
      branchCounts,
    ]);

  const unassignedStudentsCount =
    useMemo(() => {
      /*
        Do not only count empty branchId.

        A student may contain an old branchId
        that does not exist in the current hierarchy.
      */

      const validBranchIds =
        new Set(
          branches
            .map(
              (branch) =>
                getItemId(branch)
            )
            .filter(Boolean)
        );

      return sortedStudents.filter(
        (student) => {
          const branchId =
            String(
              student?.branchId ||
                ''
            ).trim();

          if (!branchId) {
            return true;
          }

          return !validBranchIds.has(
            branchId
          );
        }
      ).length;
    }, [
      sortedStudents,
      branches,
    ]);

  /* =======================================================
     ACTIVE VIEW VALIDATION
  ======================================================= */

  useEffect(() => {
    if (
      !activeView ||
      activeView === 'all' ||
      activeView ===
        'unassigned'
    ) {
      return;
    }

    const exists =
      branches.some(
        (branch) =>
          getItemId(branch) ===
          String(activeView)
      );

    if (!exists) {
      setActiveView(null);
    }
  }, [
    branches,
    activeView,
  ]);

  useEffect(() => {
    setOpenActionsFor(null);
    setCourseFilter('all');
  }, [activeView]);

  /* =======================================================
     ACTIVE VIEW LABEL
  ======================================================= */

  const activeViewLabel =
    useMemo(() => {
      if (
        activeView === 'all'
      ) {
        return 'All students';
      }

      if (
        activeView ===
        'unassigned'
      ) {
        return 'Unassigned';
      }

      const branch =
        branches.find(
          (item) =>
            getItemId(item) ===
            String(activeView)
        );

      return (
        branch?.name ||
        'Academy'
      );
    }, [
      activeView,
      branches,
    ]);

  /* =======================================================
     FILTER STUDENTS
  ======================================================= */

  const filteredStudents =
    useMemo(() => {
      const validBranchIds =
        new Set(
          branches
            .map(
              (branch) =>
                getItemId(branch)
            )
            .filter(Boolean)
        );

      return sortedStudents.filter(
        (student) => {
          const studentBranchId =
            String(
              student?.branchId ||
                ''
            ).trim();

          if (
            activeView === 'all'
          ) {
            // Include every student.
          } else if (
            activeView ===
            'unassigned'
          ) {
            /*
              Include:
              - empty branchId
              - old/invalid branch IDs
            */

            if (
              studentBranchId &&
              validBranchIds.has(
                studentBranchId
              )
            ) {
              return false;
            }
          } else if (
            studentBranchId !==
            String(activeView)
          ) {
            return false;
          }

          if (
            courseFilter !==
              'all' &&
            String(
              student?.course ||
                ''
            ) !== courseFilter
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      sortedStudents,
      activeView,
      courseFilter,
      branches,
    ]);

  /* =======================================================
     LOAD STUDENTS
  ======================================================= */

  function loadStudents() {
    setLoading(true);
    setError(null);
    setDeleteError(null);

    return apiGet(
      `/api/admin/students?${queryString}`
    )
      .then((json) => {
        setData(json);
      })
      .catch((err) => {
        setData({
          students: [],
        });

        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  /* =======================================================
     LOAD DASHBOARD METRICS

     This gives the real total count from MongoDB.
  ======================================================= */

  function loadMetrics() {
    return apiGet(
      '/api/admin/metrics'
    )
      .then((json) => {
        setTotalStudents(
          Number(
            json?.students || 0
          )
        );
      })
      .catch((err) => {
        console.error(
          'Failed to load student metrics:',
          err
        );

        setTotalStudents(0);
      });
  }

  /* =======================================================
     INITIAL DATA
  ======================================================= */

  useEffect(() => {
    loadStudents();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    apiGet(
      '/api/materials/hierarchy/full'
    )
      .then((json) => {
        setBranches(
          Array.isArray(
            json?.branches
          )
            ? json.branches
            : []
        );
      })
      .catch((err) => {
        setHierarchyError(
          err
        );
      });
  }, []);

  /* =======================================================
     CREATE FORM HIERARCHY
  ======================================================= */

  useEffect(() => {
    if (!form.branchId) {
      setForm(
        (current) => ({
          ...current,
          intakeId: '',
          batchId: '',
        })
      );

      return;
    }

    if (
      createIntakes.length >
        0 &&
      !form.intakeId
    ) {
      setForm(
        (current) => ({
          ...current,
          intakeId:
            getItemId(
              createIntakes[0]
            ),
          batchId: '',
        })
      );
    }
  }, [
    form.branchId,
    form.intakeId,
    createIntakes,
  ]);

  useEffect(() => {
    if (!form.branchId) {
      return;
    }

    if (
      form.intakeId &&
      !createIntakes.some(
        (item) =>
          getItemId(item) ===
          String(
            form.intakeId
          )
      )
    ) {
      setForm(
        (current) => ({
          ...current,

          intakeId:
            createIntakes.length >
            0
              ? getItemId(
                  createIntakes[0]
                )
              : '',

          batchId: '',
        })
      );

      return;
    }

    if (
      form.batchId &&
      !createBatches.some(
        (item) =>
          getItemId(item) ===
          String(form.batchId)
      )
    ) {
      setForm(
        (current) => ({
          ...current,
          batchId: '',
        })
      );
    }
  }, [
    form.branchId,
    form.intakeId,
    form.batchId,
    createIntakes,
    createBatches,
  ]);

  /* =======================================================
     EDIT FORM HIERARCHY
  ======================================================= */

  useEffect(() => {
    if (!editingStudent) {
      return;
    }

    if (
      !editForm.branchId
    ) {
      setEditForm(
        (current) => ({
          ...current,
          intakeId: '',
          batchId: '',
        })
      );

      return;
    }

    if (
      editIntakes.length >
        0 &&
      !editForm.intakeId
    ) {
      setEditForm(
        (current) => ({
          ...current,
          intakeId:
            getItemId(
              editIntakes[0]
            ),
          batchId: '',
        })
      );

      return;
    }

    if (
      editForm.intakeId &&
      !editIntakes.some(
        (item) =>
          getItemId(item) ===
          String(
            editForm.intakeId
          )
      )
    ) {
      setEditForm(
        (current) => ({
          ...current,

          intakeId:
            editIntakes.length >
            0
              ? getItemId(
                  editIntakes[0]
                )
              : '',

          batchId: '',
        })
      );
    }
  }, [
    editingStudent,
    editForm.branchId,
    editForm.intakeId,
    editIntakes,
  ]);

  useEffect(() => {
    if (!editingStudent) {
      return;
    }

    if (
      editForm.batchId &&
      !editBatches.some(
        (item) =>
          getItemId(item) ===
          String(
            editForm.batchId
          )
      )
    ) {
      setEditForm(
        (current) => ({
          ...current,
          batchId: '',
        })
      );
    }
  }, [
    editingStudent,
    editForm.batchId,
    editBatches,
  ]);

  /* =======================================================
     INPUT HELPERS
  ======================================================= */

  const update =
    (key) => (event) => {
      const value =
        event.target.value;

      setForm(
        (current) => ({
          ...current,
          [key]: value,

          ...(key ===
          'branchId'
            ? {
                intakeId: '',
                batchId: '',
              }
            : {}),

          ...(key ===
          'intakeId'
            ? {
                batchId: '',
              }
            : {}),
        })
      );
    };

  const updateEdit =
    (key) => (event) => {
      const value =
        event.target.value;

      setEditForm(
        (current) => ({
          ...current,
          [key]: value,

          ...(key ===
          'branchId'
            ? {
                intakeId: '',
                batchId: '',
              }
            : {}),

          ...(key ===
          'intakeId'
            ? {
                batchId: '',
              }
            : {}),
        })
      );
    };

  /* =======================================================
     CREATE STUDENT
  ======================================================= */

  function onCreate(event) {
    event.preventDefault();

    setCreating(true);
    setCreateError(null);

    apiPost(
      '/api/admin/students',
      form
    )
      .then(() => {
        setForm({
          ...EMPTY_FORM,
        });

        setCreateOpen(false);

        return Promise.all([
          loadStudents(),
          loadMetrics(),
        ]);
      })
      .catch((err) => {
        setCreateError(err);
      })
      .finally(() => {
        setCreating(false);
      });
  }

  /* =======================================================
     START EDIT
  ======================================================= */

  function startEdit(studentId) {
    setEditError(null);
    setSavingEdit(false);

    apiGet(
      `/api/admin/students/${encodeURIComponent(
        studentId
      )}`
    )
      .then((json) => {
        const student =
          json?.student;

        if (!student) {
          return;
        }

        setEditingStudent(
          student
        );

        setEditForm({
          ...EMPTY_FORM,

          id:
            student.id,

          fullName:
            student.fullName ||
            '',

          email:
            student.email || '',

          studentId:
            student.studentId ||
            '',

          dob:
            student.dob
              ? String(
                  student.dob
                ).slice(0, 10)
              : '',

          gender:
            student.gender || '',

          nic:
            student.nic || '',

          course:
            student.course || '',

          school:
            student.school || '',

          olResult:
            student.olResult ||
            '',

          olMath:
            student.olMath || '',

          olEnglish:
            student.olEnglish ||
            '',

          whatsappNumber:
            student.whatsappNumber ||
            '',

          phoneNumber:
            student.phoneNumber ||
            '',

          address:
            student.address || '',

          guardianName:
            student.guardianName ||
            '',

          guardianPhoneNumber:
            student.guardianPhoneNumber ||
            '',

          password: '',

          branchId:
            student.branchId || '',

          intakeId:
            student.intakeId || '',

          batchId:
            student.batchId || '',
        });
      })
      .catch((err) => {
        setEditError(err);
      });
  }

  /* =======================================================
     SAVE EDIT
  ======================================================= */

  function onSaveEdit(event) {
    event.preventDefault();

    if (!editForm.id) {
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    apiPut(
      `/api/admin/students/${encodeURIComponent(
        editForm.id
      )}`,
      editForm
    )
      .then(() => {
        setEditingStudent(
          null
        );

        return Promise.all([
          loadStudents(),
          loadMetrics(),
        ]);
      })
      .catch((err) => {
        setEditError(err);
      })
      .finally(() => {
        setSavingEdit(false);
      });
  }

  /* =======================================================
     DELETE
  ======================================================= */

  function onDelete(student) {
    if (!canDelete) {
      return;
    }

    if (!student?.id) {
      return;
    }

    setDeleteError(null);

    const ok =
      window.confirm(
        `Delete student "${student.fullName}" (${student.studentId || 'no id'})? This cannot be undone.`
      );

    if (!ok) {
      return;
    }

    setDeletingId(
      student.id
    );

    apiDelete(
      `/api/admin/students/${encodeURIComponent(
        student.id
      )}`
    )
      .then(() =>
        Promise.all([
          loadStudents(),
          loadMetrics(),
        ])
      )
      .catch((err) => {
        setDeleteError(err);
      })
      .finally(() => {
        setDeletingId(null);
      });
  }

  /* =======================================================
     VIEW DETAILS
  ======================================================= */

  function openStudentDetails(
    student
  ) {
    setOpenActionsFor(null);

    setDetailError(null);
    setDetailLoading(true);

    apiGet(
      `/api/admin/students/${encodeURIComponent(
        student.id
      )}`
    )
      .then((json) => {
        setDetailStudent(
          json?.student || null
        );
      })
      .catch((err) => {
        setDetailError(err);
      })
      .finally(() => {
        setDetailLoading(
          false
        );
      });
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-6">
      {/* =====================================================
          CREATE STUDENT
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() =>
            setCreateOpen(
              (value) =>
                !value
            )
          }
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />

                <path
                  d="M4 17c0-2.8 2.7-5 6-5s6 2.2 6 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />

                <path
                  d="M16.5 5.5v4M14.5 7.5h4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900">
                Create student
              </div>

              <div className="text-xs text-slate-500">
                Register a new student and set up their enrollment
              </div>
            </div>
          </div>

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform duration-200 ${
                createOpen
                  ? 'rotate-180'
                  : ''
              }`}
            >
              <path
                d="M3 6l5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        {createOpen ? (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            {createError ? (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {createError.message ||
                  'Failed to create student.'}
              </div>
            ) : null}

            {hierarchyError ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                {hierarchyError.message ||
                  'Failed to load branch hierarchy.'}
              </div>
            ) : null}

            <form
              className="space-y-6"
              onSubmit={
                onCreate
              }
            >
              {/* PERSONAL DETAILS */}

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                    1
                  </span>

                  <h4 className="text-sm font-semibold text-slate-800">
                    Personal details
                  </h4>
                </div>

                <div className="grid gap-4 rounded-xl bg-slate-50/70 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600">
                      Full name *
                    </label>

                    <input
                      value={
                        form.fullName
                      }
                      onChange={
                        update(
                          'fullName'
                        )
                      }
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Email *
                    </label>

                    <input
                      value={
                        form.email
                      }
                      onChange={
                        update(
                          'email'
                        )
                      }
                      type="email"
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Student ID *
                    </label>

                    <input
                      value={
                        form.studentId
                      }
                      onChange={
                        update(
                          'studentId'
                        )
                      }
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Date of Birth *
                    </label>

                    <input
                      value={
                        form.dob
                      }
                      onChange={
                        update('dob')
                      }
                      type="date"
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Gender *
                    </label>

                    <select
                      value={
                        form.gender
                      }
                      onChange={
                        update(
                          'gender'
                        )
                      }
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="">
                        Select...
                      </option>

                      <option value="male">
                        Male
                      </option>

                      <option value="female">
                        Female
                      </option>

                      <option value="other">
                        Other
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      NIC / Passport
                    </label>

                    <input
                      value={
                        form.nic
                      }
                      onChange={
                        update('nic')
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      WhatsApp number
                    </label>

                    <input
                      value={
                        form.whatsappNumber
                      }
                      onChange={
                        update(
                          'whatsappNumber'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Phone number
                    </label>

                    <input
                      value={
                        form.phoneNumber
                      }
                      onChange={
                        update(
                          'phoneNumber'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600">
                      Address
                    </label>

                    <input
                      value={
                        form.address
                      }
                      onChange={
                        update(
                          'address'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>
              </div>

              {/* EDUCATION */}

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                    2
                  </span>

                  <h4 className="text-sm font-semibold text-slate-800">
                    Educational background
                  </h4>
                </div>

                <div className="grid gap-4 rounded-xl bg-slate-50/70 p-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      School name
                    </label>

                    <input
                      value={
                        form.school
                      }
                      onChange={
                        update(
                          'school'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      O/L full result
                    </label>

                    <input
                      value={
                        form.olResult
                      }
                      onChange={
                        update(
                          'olResult'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      O/L math result
                    </label>

                    <input
                      value={
                        form.olMath
                      }
                      onChange={
                        update(
                          'olMath'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      O/L English result
                    </label>

                    <input
                      value={
                        form.olEnglish
                      }
                      onChange={
                        update(
                          'olEnglish'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>
              </div>

              {/* ENROLLMENT */}

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                    3
                  </span>

                  <h4 className="text-sm font-semibold text-slate-800">
                    Academic enrollment
                  </h4>
                </div>

                <div className="grid gap-4 rounded-xl bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Branch
                    </label>

                    <select
                      value={
                        form.branchId
                      }
                      onChange={
                        update(
                          'branchId'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="">
                        Select branch
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
                              {branch.name ||
                                id}
                            </option>
                          );
                        }
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Intake
                    </label>

                    <select
                      value={
                        form.intakeId
                      }
                      onChange={
                        update(
                          'intakeId'
                        )
                      }
                      disabled={
                        !form.branchId
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        Select intake
                      </option>

                      {createIntakes.map(
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
                              {intake.name ||
                                id}
                            </option>
                          );
                        }
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Batch
                    </label>

                    <select
                      value={
                        form.batchId
                      }
                      onChange={
                        update(
                          'batchId'
                        )
                      }
                      disabled={
                        !form.intakeId
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        Select batch
                      </option>

                      {createBatches.map(
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
                              {batch.name ||
                                id}
                            </option>
                          );
                        }
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Diploma
                    </label>

                    <select
                      value={
                        form.course
                      }
                      onChange={
                        update(
                          'course'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="">
                        Select diploma
                      </option>

                      {COURSE_OPTIONS.map(
                        (course) => (
                          <option
                            key={
                              course
                            }
                            value={
                              course
                            }
                          >
                            {course}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* EMERGENCY CONTACT */}

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                    4
                  </span>

                  <h4 className="text-sm font-semibold text-slate-800">
                    Emergency contact
                  </h4>
                </div>

                <div className="grid gap-4 rounded-xl bg-slate-50/70 p-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Guardian name
                    </label>

                    <input
                      value={
                        form.guardianName
                      }
                      onChange={
                        update(
                          'guardianName'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Guardian phone
                    </label>

                    <input
                      value={
                        form.guardianPhoneNumber
                      }
                      onChange={
                        update(
                          'guardianPhoneNumber'
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>
              </div>

              {/* PASSWORD + BUTTONS */}

              <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="sm:w-72">
                  <label className="text-xs font-semibold text-slate-600">
                    Temporary password *
                  </label>

                  <div className="relative mt-1">
                    <input
                      value={
                        form.password
                      }
                      onChange={
                        update(
                          'password'
                        )
                      }
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      minLength={
                        8
                      }
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-16 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />

                    <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (value) =>
                              !value
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        {showPassword
                          ? '◉'
                          : '○'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !form.password
                          ) {
                            return;
                          }

                          navigator.clipboard
                            ?.writeText(
                              form.password
                            )
                            .then(() => {
                              setPasswordCopied(
                                true
                              );

                              setTimeout(
                                () =>
                                  setPasswordCopied(
                                    false
                                  ),
                                1500
                              );
                            })
                            .catch(
                              () => {}
                            );
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        {passwordCopied
                          ? '✓'
                          : '⧉'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400">
                    {passwordCopied
                      ? 'Copied!'
                      : 'At least 8 characters.'}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCreateOpen(
                        false
                      )
                    }
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      creating
                    }
                    className="inline-flex items-center justify-center rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                  >
                    {creating
                      ? 'Creating…'
                      : 'Create student'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : null}
      </section>

      {/* =====================================================
          STUDENT ACADEMY SECTION
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!activeView ? (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900">
                  Students by academy
                </div>

                <div className="mt-0.5 text-sm text-slate-500">
                  Pick an academy to view its student list
                </div>
              </div>

              <input
                value={q}
                onChange={(event) =>
                  setQ(
                    event.target
                      .value
                  )
                }
                placeholder="Search name, email, student ID"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 md:max-w-sm"
              />
            </div>

            {error ? (
              <div className="mt-4 text-sm text-rose-700">
                {error.message ||
                  'Failed to load students.'}
              </div>
            ) : null}

            {loading &&
            !data ? (
              <div className="mt-5 text-sm text-slate-500">
                Loading students...
              </div>
            ) : null}

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* ALL STUDENTS */}

              <button
                type="button"
                onClick={() =>
                  setActiveView(
                    'all'
                  )
                }
                className="rounded-2xl border border-slate-200 p-6 text-left transition hover:border-sky-300 hover:shadow-sm"
              >
                <div className="text-lg font-bold text-slate-900">
                  All students
                </div>

                <div className="mt-3 text-4xl font-extrabold text-sky-700">
                  {totalStudents ||
                    sortedStudents.length}
                </div>

                <div className="mt-2 text-sm text-slate-500">
                  Every registered student
                </div>
              </button>

              {/* BRANCH CARDS */}

              {branches.map(
                (branch) => {
                  const branchId =
                    getItemId(
                      branch
                    );

                  return (
                    <button
                      key={
                        branchId
                      }
                      type="button"
                      onClick={() =>
                        setActiveView(
                          branchId
                        )
                      }
                      className="rounded-2xl border border-slate-200 p-6 text-left transition hover:border-sky-300 hover:shadow-sm"
                    >
                      <div className="text-lg font-bold text-slate-900">
                        {branch.name ||
                          branchId}
                      </div>

                      <div className="mt-3 text-4xl font-extrabold text-sky-700">
                        {branchCounts[
                          branchId
                        ] || 0}
                      </div>

                      <div className="mt-2 text-sm text-slate-500">
                        students enrolled
                      </div>
                    </button>
                  );
                }
              )}

              {/* UNASSIGNED */}

              {unassignedStudentsCount >
              0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveView(
                      'unassigned'
                    )
                  }
                  className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-6 text-left transition hover:border-amber-400 hover:shadow-sm"
                >
                  <div className="text-lg font-bold text-slate-900">
                    Unassigned
                  </div>

                  <div className="mt-3 text-4xl font-extrabold text-amber-600">
                    {
                      unassignedStudentsCount
                    }
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    No valid academy set
                  </div>
                </button>
              ) : null}
            </div>

            {totalStudents >
              assignedStudentsCount &&
            unassignedStudentsCount ===
              0 ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Total database students: {totalStudents}. Students loaded on this page: {sortedStudents.length}. If these numbers differ, increase the backend students endpoint limit.
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setActiveView(
                      null
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Academies
                </button>

                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {
                      activeViewLabel
                    }
                  </div>

                  <div className="text-xs text-slate-500">
                    {filteredStudents.length} student(s)
                  </div>
                </div>
              </div>

              <input
                value={q}
                onChange={(event) =>
                  setQ(
                    event.target
                      .value
                  )
                }
                placeholder="Search name, email, student ID"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 md:max-w-xs"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold text-slate-600">
                Diploma
              </label>

              <select
                value={
                  courseFilter
                }
                onChange={(event) =>
                  setCourseFilter(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">
                  All diplomas
                </option>

                {COURSE_OPTIONS.map(
                  (course) => (
                    <option
                      key={
                        course
                      }
                      value={
                        course
                      }
                    >
                      {course}
                    </option>
                  )
                )}
              </select>
            </div>

            {deleteError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {deleteError.message ||
                  'Failed to delete student.'}
              </div>
            ) : null}

            {!data ||
            loading ? (
              <div className="mt-4 text-sm text-slate-600">
                Loading…
              </div>
            ) : filteredStudents.length ===
              0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No students match these filters.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-2">
                        Name
                      </th>

                      <th className="py-2">
                        Email
                      </th>

                      <th className="py-2">
                        Student ID
                      </th>

                      <th className="py-2">
                        Course
                      </th>

                      <th className="py-2 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {filteredStudents.map(
                      (student) => (
                        <tr
                          key={
                            student.id
                          }
                          className="text-slate-800"
                        >
                          <td className="py-3 font-semibold">
                            {
                              student.fullName
                            }
                          </td>

                          <td className="py-3 break-all">
                            {
                              student.email
                            }
                          </td>

                          <td className="py-3">
                            {
                              student.studentId
                            }
                          </td>

                          <td className="py-3">
                            {student.course ||
                              '—'}
                          </td>

                          <td className="py-3 text-right">
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenActionsFor(
                                    (
                                      current
                                    ) =>
                                      current ===
                                      student.id
                                        ? null
                                        : student.id
                                  )
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                              >
                                ⋮
                              </button>

                              {openActionsFor ===
                              student.id ? (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() =>
                                      setOpenActionsFor(
                                        null
                                      )
                                    }
                                  />

                                  <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openStudentDetails(
                                          student
                                        )
                                      }
                                      className="block w-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      View
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionsFor(
                                          null
                                        );

                                        startEdit(
                                          student.id
                                        );
                                      }}
                                      className="block w-full px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
                                    >
                                      Edit
                                    </button>

                                    {canDelete ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionsFor(
                                            null
                                          );

                                          onDelete(
                                            student
                                          );
                                        }}
                                        disabled={
                                          deletingId ===
                                          student.id
                                        }
                                        className="block w-full border-t border-slate-100 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                      >
                                        {deletingId ===
                                        student.id
                                          ? 'Deleting…'
                                          : 'Delete'}
                                      </button>
                                    ) : null}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {detailStudent ||
      detailLoading ||
      detailError ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setDetailStudent(
                null
              );

              setDetailError(
                null
              );
            }}
          />

          <div className="relative my-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">
                Student details
              </h3>

              <button
                type="button"
                className="text-sm text-slate-500"
                onClick={() =>
                  setDetailStudent(
                    null
                  )
                }
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="mt-4 text-sm text-slate-600">
                Loading…
              </div>
            ) : detailError ? (
              <div className="mt-4 text-sm text-rose-700">
                {detailError.message ||
                  'Failed to load details.'}
              </div>
            ) : detailStudent ? (
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div>
                  <strong>
                    Name:
                  </strong>{' '}
                  {
                    detailStudent.fullName
                  }
                </div>

                <div>
                  <strong>
                    Email:
                  </strong>{' '}
                  {
                    detailStudent.email
                  }
                </div>

                <div>
                  <strong>
                    Student ID:
                  </strong>{' '}
                  {
                    detailStudent.studentId
                  }
                </div>

                <div>
                  <strong>
                    Course:
                  </strong>{' '}
                  {detailStudent.course ||
                    '—'}
                </div>

                <div>
                  <strong>
                    Branch:
                  </strong>{' '}
                  {detailStudent.branchId ||
                    '—'}
                </div>

                <div>
                  <strong>
                    Intake:
                  </strong>{' '}
                  {detailStudent.intakeId ||
                    '—'}
                </div>

                <div>
                  <strong>
                    Batch:
                  </strong>{' '}
                  {detailStudent.batchId ||
                    '—'}
                </div>

                <div>
                  <strong>
                    Phone:
                  </strong>{' '}
                  {detailStudent.phoneNumber ||
                    '—'}
                </div>

                <div>
                  <strong>
                    WhatsApp:
                  </strong>{' '}
                  {detailStudent.whatsappNumber ||
                    '—'}
                </div>

                <div>
                  <strong>
                    Address:
                  </strong>{' '}
                  {detailStudent.address ||
                    '—'}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

      {editingStudent ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              setEditingStudent(
                null
              )
            }
          />

          <form
            onSubmit={
              onSaveEdit
            }
            className="relative my-4 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold">
                Edit student
              </h3>

              <button
                type="button"
                className="text-sm text-slate-500"
                onClick={() =>
                  setEditingStudent(
                    null
                  )
                }
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {editError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {editError.message ||
                    'Failed to update student.'}
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Full name
                  </label>

                  <input
                    value={
                      editForm.fullName
                    }
                    onChange={
                      updateEdit(
                        'fullName'
                      )
                    }
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Email
                  </label>

                  <input
                    value={
                      editForm.email
                    }
                    onChange={
                      updateEdit(
                        'email'
                      )
                    }
                    type="email"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Student ID
                  </label>

                  <input
                    value={
                      editForm.studentId
                    }
                    onChange={
                      updateEdit(
                        'studentId'
                      )
                    }
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Course
                  </label>

                  <select
                    value={
                      editForm.course
                    }
                    onChange={
                      updateEdit(
                        'course'
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">
                      Select diploma
                    </option>

                    {COURSE_OPTIONS.map(
                      (course) => (
                        <option
                          key={
                            course
                          }
                          value={
                            course
                          }
                        >
                          {course}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Branch
                  </label>

                  <select
                    value={
                      editForm.branchId
                    }
                    onChange={
                      updateEdit(
                        'branchId'
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">
                      Select branch
                    </option>

                    {branches.map(
                      (branch) => {
                        const id =
                          getItemId(
                            branch
                          );

                        return (
                          <option
                            key={
                              id
                            }
                            value={
                              id
                            }
                          >
                            {branch.name ||
                              id}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Intake
                  </label>

                  <select
                    value={
                      editForm.intakeId
                    }
                    onChange={
                      updateEdit(
                        'intakeId'
                      )
                    }
                    disabled={
                      !editForm.branchId
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    <option value="">
                      Select intake
                    </option>

                    {editIntakes.map(
                      (intake) => {
                        const id =
                          getItemId(
                            intake
                          );

                        return (
                          <option
                            key={
                              id
                            }
                            value={
                              id
                            }
                          >
                            {intake.name ||
                              id}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Batch
                  </label>

                  <select
                    value={
                      editForm.batchId
                    }
                    onChange={
                      updateEdit(
                        'batchId'
                      )
                    }
                    disabled={
                      !editForm.intakeId
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    <option value="">
                      Select batch
                    </option>

                    {editBatches.map(
                      (batch) => {
                        const id =
                          getItemId(
                            batch
                          );

                        return (
                          <option
                            key={
                              id
                            }
                            value={
                              id
                            }
                          >
                            {batch.name ||
                              id}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Phone
                  </label>

                  <input
                    value={
                      editForm.phoneNumber
                    }
                    onChange={
                      updateEdit(
                        'phoneNumber'
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    WhatsApp
                  </label>

                  <input
                    value={
                      editForm.whatsappNumber
                    }
                    onChange={
                      updateEdit(
                        'whatsappNumber'
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    NIC
                  </label>

                  <input
                    value={
                      editForm.nic
                    }
                    onChange={
                      updateEdit(
                        'nic'
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Address
                  </label>

                  <input
                    value={
                      editForm.address
                    }
                    onChange={
                      updateEdit(
                        'address'
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Guardian name
                  </label>

                  <input
                    value={
                      editForm.guardianName
                    }
                    onChange={
                      updateEdit(
                        'guardianName'
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Guardian phone
                  </label>

                  <input
                    value={
                      editForm.guardianPhoneNumber
                    }
                    onChange={
                      updateEdit(
                        'guardianPhoneNumber'
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setEditingStudent(
                    null
                  )
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  savingEdit
                }
                className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
              >
                {savingEdit
                  ? 'Saving…'
                  : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}