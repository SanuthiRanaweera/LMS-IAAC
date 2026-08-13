import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import EntityTable from '../../components/EntityTable.jsx';
import EntityNameDialog from '../../components/EntityNameDialog.jsx';

import { apiGet } from '../../api/http.js';

import {
  getAcademics,
  saveAcademics,
} from '../../services/academicsAdmin.service.js';

export default function AdminBranchIntakesPage() {
  const navigate = useNavigate();

  const { branchId } = useParams();

  /* =========================================================
     STATE
  ========================================================= */

  const [items, setItems] = useState([]);

  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  /* =========================================================
     DIALOG STATE
  ========================================================= */

  const [dialogOpen, setDialogOpen] = useState(false);

  const [dialogMode, setDialogMode] = useState('add');

  const [dialogInitialValue, setDialogInitialValue] = useState('');

  const [dialogRow, setDialogRow] = useState(null);

  const [dialogError, setDialogError] = useState('');

  /* =========================================================
     LOAD FULL ACADEMIC HIERARCHY

     IMPORTANT:

     /api/materials/hierarchy/full

     returns:

     Branch
       ↓
     Intake
       ↓
     Batch
  ========================================================= */

  async function refresh() {
    const response = await apiGet(
      '/api/materials/hierarchy/full'
    );

    const branchList = Array.isArray(response?.branches)
      ? response.branches
      : [];

    setBranches(branchList);

    const selectedBranch = branchList.find(
      (branch) =>
        String(branch?.id) === String(branchId)
    );

    return Array.isArray(selectedBranch?.intakes)
      ? selectedBranch.intakes
      : [];
  }

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadIntakes() {
      setLoading(true);

      setError('');

      try {
        const list = await refresh();

        if (!cancelled) {
          setItems(list);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            'Failed to load intakes:',
            err
          );

          setError(
            err?.message ||
              'Failed to load intakes.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadIntakes();

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  /* =========================================================
     CURRENT BRANCH NAME
  ========================================================= */

  const branchName = useMemo(() => {
    const found = branches.find(
      (branch) =>
        String(branch?.id) === String(branchId)
    );

    return found?.name || 'Branch';
  }, [branches, branchId]);

  /* =========================================================
     TABLE COLUMNS
  ========================================================= */

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        key: 'name',
      },

      {
        header: 'ID',
        key: 'id',
        className:
          'text-xs text-slate-500',
      },

      {
        header: 'Registration',

        render: (row) => {
          const origin =
            typeof window !== 'undefined'
              ? window.location.origin
              : '';

          const url =
            `${origin}/register` +
            `?branchId=${encodeURIComponent(
              String(branchId || '')
            )}` +
            `&intakeId=${encodeURIComponent(
              String(row?.id || '')
            )}`;

          async function copyRegistrationLink() {
            try {
              if (
                navigator?.clipboard?.writeText
              ) {
                await navigator.clipboard.writeText(
                  url
                );

                window.alert(
                  'Registration link copied.'
                );

                return;
              }
            } catch {
              // Fall back to prompt below.
            }

            window.prompt(
              'Copy registration link:',
              url
            );
          }

          return (
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={
                copyRegistrationLink
              }
            >
              Copy link
            </button>
          );
        },

        className: 'text-right',
      },
    ],
    [branchId]
  );

  /* =========================================================
     OPEN ADD DIALOG
  ========================================================= */

  function openAddDialog() {
    setDialogError('');

    setDialogMode('add');

    setDialogInitialValue('');

    setDialogRow(null);

    setDialogOpen(true);
  }

  /* =========================================================
     OPEN RENAME DIALOG
  ========================================================= */

  function openRenameDialog(row) {
    setDialogError('');

    setDialogMode('edit');

    setDialogInitialValue(
      row?.name || ''
    );

    setDialogRow(row || null);

    setDialogOpen(true);
  }

  /* =========================================================
     ADD INTAKE
  ========================================================= */

  async function addIntake(name) {
    const trimmedName = String(
      name || ''
    ).trim();

    if (!trimmedName) {
      throw new Error(
        'Intake name is required'
      );
    }

    const { payload } =
      await getAcademics();

    const branchesPayload =
      Array.isArray(payload?.branches)
        ? payload.branches
        : [];

    const updated =
      branchesPayload.map(
        (branch) => {
          if (
            String(branch?.id) !==
            String(branchId)
          ) {
            return branch;
          }

          const intakes =
            Array.isArray(
              branch?.intakes
            )
              ? branch.intakes
              : [];

          /*
          Your existing project uses
          the intake name as the intake ID.
          */
          const intakeId =
            trimmedName;

          const exists =
            intakes.some(
              (intake) =>
                String(
                  intake?.id
                ) ===
                  intakeId ||
                String(
                  intake?.name
                ) ===
                  trimmedName
            );

          if (exists) {
            throw new Error(
              'An intake with this name already exists'
            );
          }

          const newIntake = {
            id: intakeId,

            name: trimmedName,

            batches: [],
          };

          return {
            ...(branch || {}),

            intakes: [
              newIntake,
              ...intakes,
            ],
          };
        }
      );

    await saveAcademics({
      ...(payload || {}),

      branches: updated,
    });
  }

  /* =========================================================
     RENAME INTAKE
  ========================================================= */

  async function renameIntake(
    row,
    nextName
  ) {
    const trimmedName = String(
      nextName || ''
    ).trim();

    if (!trimmedName) {
      throw new Error(
        'Intake name is required'
      );
    }

    const { payload } =
      await getAcademics();

    const branchesPayload =
      Array.isArray(payload?.branches)
        ? payload.branches
        : [];

    const updated =
      branchesPayload.map(
        (branch) => {
          if (
            String(branch?.id) !==
            String(branchId)
          ) {
            return branch;
          }

          const intakes =
            Array.isArray(
              branch?.intakes
            )
              ? branch.intakes
              : [];

          return {
            ...(branch || {}),

            intakes:
              intakes.map(
                (intake) =>
                  String(
                    intake?.id
                  ) ===
                  String(
                    row?.id
                  )
                    ? {
                        ...(intake ||
                          {}),

                        name:
                          trimmedName,
                      }
                    : intake
              ),
          };
        }
      );

    await saveAcademics({
      ...(payload || {}),

      branches: updated,
    });
  }

  /* =========================================================
     DELETE INTAKE
  ========================================================= */

  async function deleteIntake(row) {
    const { payload } =
      await getAcademics();

    const branchesPayload =
      Array.isArray(payload?.branches)
        ? payload.branches
        : [];

    const updated =
      branchesPayload.map(
        (branch) => {
          if (
            String(branch?.id) !==
            String(branchId)
          ) {
            return branch;
          }

          const intakes =
            Array.isArray(
              branch?.intakes
            )
              ? branch.intakes
              : [];

          return {
            ...(branch || {}),

            intakes:
              intakes.filter(
                (intake) =>
                  String(
                    intake?.id
                  ) !==
                  String(
                    row?.id
                  )
              ),
          };
        }
      );

    await saveAcademics({
      ...(payload || {}),

      branches: updated,
    });
  }

  /* =========================================================
     DIALOG CONFIRM
  ========================================================= */

  async function onDialogConfirm(
    value
  ) {
    setDialogError('');

    setError('');

    setSaving(true);

    try {
      if (
        dialogMode === 'edit' &&
        dialogRow
      ) {
        await renameIntake(
          dialogRow,
          value
        );
      } else {
        await addIntake(
          value
        );
      }

      const refreshed =
        await refresh();

      setItems(
        refreshed
      );

      setDialogOpen(
        false
      );
    } catch (err) {
      setDialogError(
        err?.message ||
          'Failed to save.'
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     DELETE HANDLER
  ========================================================= */

  async function handleDelete(
    row
  ) {
    if (!row?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete intake "${row?.name || ''}"? This will remove its batches too.`
      );

    if (!confirmed) {
      return;
    }

    setError('');

    setSaving(true);

    try {
      await deleteIntake(
        row
      );

      const refreshed =
        await refresh();

      setItems(
        refreshed
      );
    } catch (err) {
      console.error(
        'Failed to delete intake:',
        err
      );

      setError(
        err?.message ||
          'Failed to delete intake.'
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: 'Home',
            to: '/admin',
          },

          {
            label: 'Branches',
            to: '/admin/branches',
          },

          {
            label: branchName,
          },

          {
            label: 'Intakes',
          },
        ]}
      />

      {/* ERROR */}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      {/* LOADING */}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
          Loading...
        </div>
      ) : (
        <EntityTable
          title={`Intakes — ${branchName}`}
          data={items}
          columns={columns}
          empty={{
            title:
              'No intakes found',

            description:
              'Add an intake to start creating batches for this branch.',

            addLabel:
              'Add New',
          }}
          onAction={{
            onView: (row) =>
              navigate(
                `/admin/branches/${encodeURIComponent(
                  branchId
                )}/intakes/${encodeURIComponent(
                  row.id
                )}/batches`
              ),

            onEdit: (row) =>
              openRenameDialog(
                row
              ),

            onDelete:
              handleDelete,

            onAddNew:
              openAddDialog,
          }}
        />
      )}

      {/* DIALOG */}

      <EntityNameDialog
        open={dialogOpen}
        title={
          dialogMode ===
          'edit'
            ? 'Rename intake'
            : 'Add intake'
        }
        label="Intake name"
        initialValue={
          dialogInitialValue
        }
        confirmLabel={
          dialogMode ===
          'edit'
            ? 'Update'
            : 'Create'
        }
        loading={saving}
        error={dialogError}
        onClose={() => {
          if (!saving) {
            setDialogOpen(
              false
            );
          }
        }}
        onConfirm={
          onDialogConfirm
        }
      />
    </div>
  );
}