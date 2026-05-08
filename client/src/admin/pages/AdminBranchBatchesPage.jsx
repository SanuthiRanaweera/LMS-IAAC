import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import EntityTable from '../../components/EntityTable.jsx';
import EntityNameDialog from '../../components/EntityNameDialog.jsx';
import { apiGet } from '../../api/http.js';
import { getAcademics, saveAcademics } from '../../services/academicsAdmin.service.js';

export default function AdminBranchBatchesPage() {
  const { branchId, intakeId } = useParams();

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
    const intakes = Array.isArray(branch?.intakes) ? branch.intakes : [];
    const intake = intakes.find((i) => String(i?.id) === String(intakeId));
    return Array.isArray(intake?.batches) ? intake.batches : [];
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
        if (!cancelled) setError('Failed to load diplomas.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [branchId, intakeId]);

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

  const columns = useMemo(
    () => [
      { header: 'Name', key: 'name' },
      { header: 'ID', key: 'id', className: 'text-xs text-slate-500' },
      {
        header: 'Students',
        render: (row) => String(row?.studentCount ?? 0),
        className: 'text-xs text-slate-600',
      },
    ],
    []
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
          return { ...(i || {}), batches: [{ id, name, studentCount: 0 }, ...batches] };
        }),
      };
    });

    await saveAcademics({ ...(payload || {}), branches: updated });
  }

  async function renameBatch(row, nextName) {
    const { payload } = await getAcademics();
    const branchesPayload = Array.isArray(payload?.branches) ? payload.branches : [];

    const updated = branchesPayload.map((b) => {
      const intakes = Array.isArray(b?.intakes) ? b.intakes : [];
      if (String(b?.id) !== String(branchId)) return b;
      return {
        ...(b || {}),
        intakes: intakes.map((i) => {
          const batches = Array.isArray(i?.batches) ? i.batches : [];
          if (String(i?.id) !== String(intakeId)) return i;
          return {
            ...(i || {}),
            batches: batches.map((bt) =>
              String(bt?.id) === String(row?.id) ? { ...(bt || {}), name: nextName } : bt
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
      const refreshed = await refresh();
      setItems(refreshed);
      setDialogOpen(false);
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
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
          Loading...
        </div>
      ) : (
        <EntityTable
          title={`Diplomas — ${branchName} / ${intakeName}`}
          data={items}
          columns={columns}
          empty={{
            title: 'No diplomas found',
            description: 'Add a diploma so admins can upload materials for that diploma.',
            addLabel: 'Add New',
          }}
          onAction={{
            onEdit: (row) => openRenameDialog(row),
            onAddNew: () => openAddDialog(),
          }}
        />
      )}

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
    </div>
  );
}
