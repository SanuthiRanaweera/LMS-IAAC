import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import EntityTable from '../../components/EntityTable.jsx';
import EntityNameDialog from '../../components/EntityNameDialog.jsx';
import { apiGet } from '../../api/http.js';
import { getAcademics, saveAcademics } from '../../services/academicsAdmin.service.js';

export default function AdminBranchIntakesPage() {
  const navigate = useNavigate();
  const { branchId } = useParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [branches, setBranches] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [dialogInitialValue, setDialogInitialValue] = useState('');
  const [dialogRow, setDialogRow] = useState(null);
  const [dialogError, setDialogError] = useState('');

  async function refresh() {
    const res = await apiGet('/api/materials/hierarchy/full');
    const list = Array.isArray(res?.branches) ? res.branches : [];
    setBranches(list);
    const branch = list.find((b) => String(b?.id) === String(branchId));
    return Array.isArray(branch?.intakes) ? branch.intakes : [];
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    refresh()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load intakes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const branchName = useMemo(() => {
    const found = branches.find((b) => String(b?.id) === String(branchId));
    return found?.name || 'Branch';
  }, [branches, branchId]);

  const columns = useMemo(
    () => [
      { header: 'Name', key: 'name' },
      { header: 'ID', key: 'id', className: 'text-xs text-slate-500' },
      {
        header: 'Registration',
        render: (row) => {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const url = `${origin}/register?branchId=${encodeURIComponent(String(branchId || ''))}&intakeId=${encodeURIComponent(String(row?.id || ''))}`;

          return (
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={async () => {
                try {
                  if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(url);
                    window.alert('Registration link copied.');
                    return;
                  }
                } catch {
                  // fall through
                }
                window.prompt('Copy registration link:', url);
              }}
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

  async function addIntake(name) {
    const { payload } = await getAcademics();
    const branchesPayload = Array.isArray(payload?.branches) ? payload.branches : [];
    const updated = branchesPayload.map((b) => {
      if (String(b?.id) !== String(branchId)) return b;
      const intakes = Array.isArray(b?.intakes) ? b.intakes : [];
      const trimmedName = String(name || '').trim();
      const id = trimmedName;
      if (!trimmedName) {
        throw new Error('Intake name is required');
      }
      const exists = intakes.some((i) => String(i?.id) === id || String(i?.name) === trimmedName);
      if (exists) {
        throw new Error('An intake with this name already exists');
      }
      return { ...(b || {}), intakes: [{ id, name: trimmedName, batches: [] }, ...intakes] };
    });

    await saveAcademics({ ...(payload || {}), branches: updated });
  }

  async function renameIntake(row, nextName) {
    const { payload } = await getAcademics();
    const branchesPayload = Array.isArray(payload?.branches) ? payload.branches : [];

    const updated = branchesPayload.map((b) => {
      const intakes = Array.isArray(b?.intakes) ? b.intakes : [];
      if (String(b?.id) !== String(branchId)) return b;
      return {
        ...(b || {}),
        intakes: intakes.map((i) => (String(i?.id) === String(row?.id) ? { ...(i || {}), name: nextName } : i)),
      };
    });

    await saveAcademics({ ...(payload || {}), branches: updated });
  }

  async function deleteIntake(row) {
    const { payload } = await getAcademics();
    const branchesPayload = Array.isArray(payload?.branches) ? payload.branches : [];

    const updated = branchesPayload.map((b) => {
      if (String(b?.id) !== String(branchId)) return b;
      const intakes = Array.isArray(b?.intakes) ? b.intakes : [];
      return {
        ...(b || {}),
        intakes: intakes.filter((i) => String(i?.id) !== String(row?.id)),
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
        await renameIntake(dialogRow, value);
      } else {
        await addIntake(value);
      }
      const refreshed = await refresh();
      setItems(refreshed);
      setDialogOpen(false);
    } catch (err) {
      setDialogError(err?.message || 'Failed to save.');
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
          { label: branchName },
          { label: 'Intakes' },
        ]}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      ) : null}

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
            title: 'No intakes found',
            description: 'Add an intake to start creating diplomas for this branch.',
            addLabel: 'Add New',
          }}
          onAction={{
            onView: (row) => navigate(`/admin/branches/${branchId}/intakes/${row.id}/batches`),
            onEdit: (row) => openRenameDialog(row),
            onDelete: async (row) => {
              if (!row?.id) return;
              const ok = window.confirm(`Delete intake "${row?.name || ''}"? This will remove its diplomas too.`);
              if (!ok) return;

              setError('');
              setSaving(true);
              try {
                await deleteIntake(row);
                const refreshed = await refresh();
                setItems(refreshed);
              } catch {
                setError('Failed to delete intake.');
              } finally {
                setSaving(false);
              }
            },
            onAddNew: () => openAddDialog(),
          }}
        />
      )}

      <EntityNameDialog
        open={dialogOpen}
        title={dialogMode === 'edit' ? 'Rename intake' : 'Add intake'}
        label="Intake name"
        initialValue={dialogInitialValue}
        confirmLabel={dialogMode === 'edit' ? 'Update' : 'Create'}
        loading={saving}
        error={dialogError}
        onClose={() => (saving ? null : setDialogOpen(false))}
        onConfirm={onDialogConfirm}
      />
    </div>
  );
}
