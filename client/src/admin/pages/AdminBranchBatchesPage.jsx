import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Eye, Pencil, Plus, X } from 'lucide-react';

import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import EntityNameDialog from '../../components/EntityNameDialog.jsx';
import { apiGet } from '../../api/http.js';
import { getAcademics, saveAcademics } from '../../services/academicsAdmin.service.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeComparable(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function canonicalCourse(value) {
  const v = normalizeComparable(value);

  if (!v) return '';
  if (v.includes('cabin')) return 'Cabin Crew';
  if (v.includes('ground')) return 'Ground Operations';

  if (v.includes('ticketing') || v.includes('reservation')) {
    return 'Ticketing & Reservations';
  }

  if (v.includes('cargo')) return 'Air Cargo';

  return normalizeText(value);
}

function courseFromBatchName(value) {
  return canonicalCourse(value);
}

function getStudentBranchId(student) {
  return normalizeText(
    student?.branchId ||
      student?.branch ||
      student?.registeredBranchId ||
      student?.academicBranchId
  );
}

function getStudentIntakeValue(student) {
  return normalizeText(
    student?.intakeId ||
      student?.intake ||
      student?.batchName ||
      student?.registeredIntakeId ||
      student?.academicIntakeId
  );
}

function getStudentCourse(student) {
  return canonicalCourse(
    student?.course ||
      student?.program ||
      student?.diploma ||
      student?.courseName ||
      student?.programName ||
      student?.diplomaName
  );
}

function getStudentName(student) {
  return (
    student?.name ||
    student?.fullName ||
    student?.studentName ||
    `${student?.firstName || ''} ${student?.lastName || ''}`.trim() ||
    'Unnamed Student'
  );
}

function getStudentEmail(student) {
  return student?.email || student?.studentEmail || '—';
}

function getStudentPhone(student) {
  return student?.phone || student?.mobile || student?.contactNo || student?.contactNumber || '—';
}

function getStudentId(student) {
  return student?.studentId || student?.studentNo || student?.registrationNo || student?._id || '—';
}

function parseStudentIdParts(student) {
  const raw = String(getStudentId(student) || '').trim();
  const upper = raw.toUpperCase();
  const numMatch = upper.match(/(\d+)/);
  const numeric = numMatch ? Number.parseInt(numMatch[1], 10) : Number.POSITIVE_INFINITY;
  const prefix = upper.replace(/\d+/g, '');
  return { raw: upper, prefix, numeric };
}

function compareStudentsByStudentId(a, b) {
  const aParts = parseStudentIdParts(a);
  const bParts = parseStudentIdParts(b);

  if (aParts.prefix !== bParts.prefix) {
    return aParts.prefix.localeCompare(bParts.prefix, undefined, { sensitivity: 'base' });
  }

  if (aParts.numeric !== bParts.numeric) {
    return aParts.numeric - bParts.numeric;
  }

  return aParts.raw.localeCompare(bParts.raw, undefined, { sensitivity: 'base' });
}

function extractStudents(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.students)) return response.students;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

async function apiGetFirstWorking(endpoints) {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      return await apiGet(endpoint);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to load students.');
}

export default function AdminBranchBatchesPage() {
  const { branchId, intakeId } = useParams();

  const [items, setItems] = useState([]);
  const [studentsByBatch, setStudentsByBatch] = useState({});
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [dialogInitialValue, setDialogInitialValue] = useState('');
  const [dialogRow, setDialogRow] = useState(null);
  const [dialogError, setDialogError] = useState('');

  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const branchName = useMemo(() => {
    const found = branches.find((b) => String(b?.id) === String(branchId));
    return found?.name || 'Branch';
  }, [branches, branchId]);

  const intakeName = useMemo(() => {
    const branch = branches.find((b) => String(b?.id) === String(branchId));
    const intakes = Array.isArray(branch?.intakes) ? branch.intakes : [];
    const found = intakes.find((i) => String(i?.id) === String(intakeId));
    return found?.name || 'Intake';
  }, [branches, branchId, intakeId]);

  async function refreshAcademics() {
    const res = await apiGet('/api/materials/hierarchy/full');
    const list = Array.isArray(res?.branches) ? res.branches : [];

    setBranches(list);

    const branch = list.find((b) => String(b?.id) === String(branchId));
    const intakes = Array.isArray(branch?.intakes) ? branch.intakes : [];
    const intake = intakes.find((i) => String(i?.id) === String(intakeId));

    return {
      batches: Array.isArray(intake?.batches) ? intake.batches : [],
      resolvedIntakeName: intake?.name || '',
    };
  }

  async function loadAllStudents() {
    const response = await apiGetFirstWorking([
      '/api/entities/students',
      '/api/students',
      '/api/admin/students',
      '/api/entities/students?type=students',
    ]);

    return extractStudents(response);
  }

  async function loadStudentsForBatches(batches, resolvedIntakeName = '') {
    const nextStudentsByBatch = {};

    try {
      const allStudents = await loadAllStudents();

      const currentBranchId = normalizeText(branchId);
      const currentIntakeId = normalizeText(intakeId);

      batches.forEach((batch) => {
        const diplomaId = normalizeText(batch?.id);
        const diplomaCourse = canonicalCourse(batch?.name);

        if (!diplomaId || !currentBranchId || !currentIntakeId) {
          nextStudentsByBatch[diplomaId] = [];
          return;
        }

        // Filter students by branch, intake, AND course/diploma
        const students = allStudents.filter((student) => {
          const studentBranchId = getStudentBranchId(student);
          const studentIntakeValue = getStudentIntakeValue(student);
          const studentCourse = getStudentCourse(student);

          const sameBranch =
            normalizeComparable(studentBranchId) === normalizeComparable(currentBranchId);

          const sameIntake =
            normalizeComparable(studentIntakeValue) === normalizeComparable(currentIntakeId) ||
            normalizeComparable(studentIntakeValue) === normalizeComparable(resolvedIntakeName);

          const sameCourse = studentCourse === diplomaCourse;

          return sameBranch && sameIntake && sameCourse;
        });

        nextStudentsByBatch[diplomaId] = students.sort(compareStudentsByStudentId);
      });
    } catch (err) {
      console.error('Failed to load students:', err);

      batches.forEach((batch) => {
        const diplomaId = normalizeText(batch?.id);
        nextStudentsByBatch[diplomaId] = [];
      });
    }

    setStudentsByBatch(nextStudentsByBatch);
  }

  async function loadPage() {
    setLoading(true);
    setStudentsLoading(true);
    setError('');

    try {
      const { batches, resolvedIntakeName } = await refreshAcademics();
      setItems(batches);
      await loadStudentsForBatches(batches, resolvedIntakeName);
    } catch {
      setError('Failed to load diplomas.');
    } finally {
      setLoading(false);
      setStudentsLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, [branchId, intakeId]);

  const selectedBatchStudents = useMemo(() => {
    if (!selectedBatch?.id) return [];
    return [...(studentsByBatch[selectedBatch.id] || [])].sort(compareStudentsByStudentId);
  }, [studentsByBatch, selectedBatch]);

  function getStudentCount(batch) {
    const diplomaId = normalizeText(batch?.id);
    return studentsByBatch[diplomaId]?.length || 0;
  }

  function openAddDialog() {
    setDialogError('');
    setDialogMode('add');
    setDialogInitialValue('');
    setDialogRow(null);
    setDialogOpen(true);
  }

  function openRenameDialog(row) {
    setDialogError('');
    setDialogMode('edit');
    setDialogInitialValue(row?.name || '');
    setDialogRow(row || null);
    setDialogOpen(true);
  }

  function openStudentsModal(row) {
    setSelectedBatch(row);
    setStudentsModalOpen(true);
  }

  async function addBatch(name) {
    const { payload } = await getAcademics();
    const branchesPayload = Array.isArray(payload?.branches) ? payload.branches : [];

    const updated = branchesPayload.map((b) => {
      if (String(b?.id) !== String(branchId)) return b;

      const intakes = Array.isArray(b?.intakes) ? b.intakes : [];

      return {
        ...(b || {}),
        intakes: intakes.map((i) => {
          if (String(i?.id) !== String(intakeId)) return i;

          const batches = Array.isArray(i?.batches) ? i.batches : [];
          const id = `batch-${Date.now().toString(36)}`;

          return {
            ...(i || {}),
            batches: [{ id, name, studentCount: 0 }, ...batches],
          };
        }),
      };
    });

    await saveAcademics({ ...(payload || {}), branches: updated });
  }

  async function renameBatch(row, nextName) {
    const { payload } = await getAcademics();
    const branchesPayload = Array.isArray(payload?.branches) ? payload.branches : [];

    const updated = branchesPayload.map((b) => {
      if (String(b?.id) !== String(branchId)) return b;

      const intakes = Array.isArray(b?.intakes) ? b.intakes : [];

      return {
        ...(b || {}),
        intakes: intakes.map((i) => {
          if (String(i?.id) !== String(intakeId)) return i;

          const batches = Array.isArray(i?.batches) ? i.batches : [];

          return {
            ...(i || {}),
            batches: batches.map((bt) =>
              String(bt?.id) === String(row?.id)
                ? { ...(bt || {}), name: nextName }
                : bt
            ),
          };
        }),
      };
    });

    await saveAcademics({ ...(payload || {}), branches: updated });
  }

  async function onDialogConfirm(value) {
    setDialogError('');
    setError('');
    setSaving(true);

    try {
      if (dialogMode === 'edit' && dialogRow) {
        await renameBatch(dialogRow, value);
      } else {
        await addBatch(value);
      }

      setDialogOpen(false);
      await loadPage();
    } catch {
      setDialogError('Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/admin' },
          { label: 'Branches', to: '/admin/branches' },
          { label: branchName, to: `/admin/branches/${branchId}/intakes` },
          { label: intakeName },
          { label: 'Diplomas' },
        ]}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Diplomas — {branchName} / {intakeName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View diplomas, registered student counts, and student details.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddDialog}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={16} />
            Add New
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-600">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="text-base font-bold text-slate-900">No diplomas found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Add a diploma so admins can upload materials for that diploma.
            </p>

            <button
              type="button"
              onClick={openAddDialog}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={16} />
              Add New
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Students</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row?.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {row?.name || 'Unnamed Diploma'}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {row?.id || '—'}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {studentsLoading ? '...' : getStudentCount(row)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openStudentsModal(row)}
                          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                        >
                          <Eye size={16} />
                          View Students
                        </button>

                        <button
                          type="button"
                          onClick={() => openRenameDialog(row)}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                        >
                          <Pencil size={16} />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EntityNameDialog
        open={dialogOpen}
        title={dialogMode === 'edit' ? 'Rename diploma' : 'Add diploma'}
        label="Diploma name"
        initialValue={dialogInitialValue}
        confirmLabel={dialogMode === 'edit' ? 'Update' : 'Create'}
        loading={saving}
        error={dialogError}
        onClose={() => (saving ? null : setDialogOpen(false))}
        onConfirm={onDialogConfirm}
      />

      {studentsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
          <div className="my-4 max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Registered Students
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedBatch?.name || 'Selected diploma'} — {selectedBatch?.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStudentsModalOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-146px)] overflow-y-auto p-6">
              {selectedBatchStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                  <h3 className="text-base font-bold text-slate-900">
                    No students registered
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    There are no students registered for this branch, batch, and diploma yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Student ID</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Course</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {selectedBatchStudents.map((student) => (
                        <tr key={student?._id || student?.id || getStudentId(student)}>
                          <td className="px-4 py-3 font-semibold text-slate-900 break-words">
                            {getStudentName(student)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {getStudentId(student)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 break-all">
                            {getStudentEmail(student)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {getStudentPhone(student)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {student?.course || student?.program || student?.diploma || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-10 flex justify-end border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setStudentsModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}