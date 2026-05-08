import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import EntityTable from '../../components/EntityTable.jsx';
import EntityNameDialog from '../../components/EntityNameDialog.jsx';
import { fetchEntities } from '../../services/entities.service.js';
import { getAcademics, saveAcademics } from '../../services/academicsAdmin.service.js';

export default function AdminIntakesPage() {
  const navigate = useNavigate();
  const { programId } = useParams();

  const [faculties, setFaculties] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [dialogInitialValue, setDialogInitialValue] = useState('');
  const [dialogRow, setDialogRow] = useState(null);
  const [dialogError, setDialogError] = useState('');

  function generateInviteToken() {
    try {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      let binary = '';
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    } catch {
      return `inv-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    }
  }

  async function copyText(text, idForFeedback) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(String(idForFeedback || ''));
      window.setTimeout(() => setCopiedId(''), 1400);
    } catch {
      setError('Copy failed. Please copy manually.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    // For breadcrumb names we fetch faculties + programs for each faculty.
    fetchEntities('faculties')
      .then(async (facList) => {
        if (cancelled) return;
        setFaculties(facList);

        const allPrograms = [];
        for (const f of facList) {
          // eslint-disable-next-line no-await-in-loop
          const progs = await fetchEntities('programs', f.id);
          allPrograms.push(...progs);
        }

        if (!cancelled) setPrograms(allPrograms);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load hierarchy.');
      });

    fetchEntities('intakes', programId)
      .then((intakeList) => {
        if (!cancelled) setItems(intakeList);
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
  }, [programId]);

  const programName = useMemo(() => {
    const found = programs.find((p) => String(p.id) === String(programId));
    return found?.name || 'Program';
  }, [programs, programId]);

  const columns = useMemo(
    () => [
      { header: 'Name', key: 'name' },
      { header: 'ID', key: 'id', className: 'text-xs text-slate-500' },
      {
        header: 'Registration link',
        render: (row) => {
          const token = row?.inviteToken;
          if (!token) return <span className="text-xs text-slate-500">—</span>;
          const url = `${window.location.origin}/register?intakeId=${encodeURIComponent(
            String(row?.id || '')
          )}&token=${encodeURIComponent(String(token))}`;

          return (
            <button
              type="button"
              onClick={() => copyText(url, row?.id)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              title={url}
            >
              {String(copiedId) === String(row?.id) ? 'Copied' : 'Copy link'}
            </button>
          );
        },
      },
    ],
    [copiedId]
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
    const facultiesPayload = Array.isArray(payload?.faculties) ? payload.faculties : [];

    const updatedFaculties = facultiesPayload.map((f) => {
      const programs = Array.isArray(f?.programs) ? f.programs : [];
      return {
        ...(f || {}),
        programs: programs.map((p) => {
          if (String(p?.id) !== String(programId)) return p;
          const intakes = Array.isArray(p?.intakes) ? p.intakes : [];
          const trimmedName = String(name || '').trim();
          const id = trimmedName;
          if (!trimmedName) {
            throw new Error('Intake name is required');
          }
          const exists = intakes.some((i) => String(i?.id) === id || String(i?.name) === trimmedName);
          if (exists) {
            throw new Error('An intake with this name already exists');
          }
          const inviteToken = generateInviteToken();
          return {
            ...(p || {}),
            intakes: [{ id, name: trimmedName, inviteToken, subjects: [] }, ...intakes],
          };
        }),
      };
    });

    await saveAcademics({ ...(payload || {}), faculties: updatedFaculties });
  }

  async function renameIntake(row, nextName) {
    const { payload } = await getAcademics();
    const facultiesPayload = Array.isArray(payload?.faculties) ? payload.faculties : [];

    const updatedFaculties = facultiesPayload.map((f) => {
      const programs = Array.isArray(f?.programs) ? f.programs : [];
      return {
        ...(f || {}),
        programs: programs.map((p) => {
          const intakes = Array.isArray(p?.intakes) ? p.intakes : [];
          return {
            ...(p || {}),
            intakes: intakes.map((i) =>
              String(i?.id) === String(row?.id) ? { ...(i || {}), name: nextName } : i
            ),
          };
        }),
      };
    });

    await saveAcademics({ ...(payload || {}), faculties: updatedFaculties });
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
      const refreshed = await fetchEntities('intakes', programId);
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
          { label: 'Faculties', to: '/admin/faculties' },
          { label: 'Programs' },
          { label: programName },
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
          title={`Intakes — ${programName}`}
          data={items}
          columns={columns}
          empty={{
            title: 'No intakes found',
            description: 'Add an intake under this program to continue.',
            addLabel: 'Add New',
          }}
          onAction={{
            onView: (row) => navigate(`/admin/programs/${programId}/intakes/${row.id}/students`),
            onEdit: (row) => openRenameDialog(row),
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
