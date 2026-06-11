// @rewritten — full CRUD class schedule page
import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Calendar, Clock, MapPin, User } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/http.js';

const emptyForm = {
  branchId: '', intakeId: '', batchId: '',
  subject: '', date: '', startTime: '', endTime: '',
  room: '', notes: '',
  lecturerName: '', lecturerId: '',
};

export default function AdminScheduleLecturePage() {
  const [schedules, setSchedules]   = useState([]);
  const [branches, setBranches]     = useState([]);
  const [intakes, setIntakes]       = useState([]);
  const [batches, setBatches]       = useState([]);
  const [lecturers, setLecturers]   = useState([]);

  const [form, setForm]             = useState(emptyForm);
  const [formErr, setFormErr]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm]     = useState(false);

  const [editId, setEditId]         = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [editErr, setEditErr]       = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [loading, setLoading]       = useState(false);
  const [listErr, setListErr]       = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    apiGet('/api/admin/auth/me')
      .then((d) => setIsSuperAdmin(d?.role === 'superadmin'))
      .catch(() => {});
    apiGet('/api/materials/hierarchy')
      .then((d) => setBranches(Array.isArray(d?.branches) ? d.branches : []))
      .catch(() => {});
  }, []);

  const loadSchedules = () => {
    setLoading(true); setListErr('');
    apiGet('/api/admin/schedule')
      .then((d) => setSchedules(Array.isArray(d?.schedules) ? d.schedules : []))
      .catch((e) => setListErr(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadSchedules(); }, []);

  // Cascade: branch → intakes + lecturers
  useEffect(() => {
    setIntakes([]); setBatches([]);
    setForm((f) => ({ ...f, intakeId: '', batchId: '', lecturerName: '', lecturerId: '' }));
    setLecturers([]);
    if (!form.branchId) return;
    apiGet(`/api/materials/branches/${encodeURIComponent(form.branchId)}/intakes`)
      .then((d) => setIntakes(Array.isArray(d?.intakes) ? d.intakes : [])).catch(() => {});
    apiGet(`/api/admin/schedule/lecturers?branchId=${encodeURIComponent(form.branchId)}`)
      .then((d) => setLecturers(Array.isArray(d?.lecturers) ? d.lecturers : [])).catch(() => {});
  }, [form.branchId]); // eslint-disable-line

  // Cascade: intake → batches
  useEffect(() => {
    setBatches([]);
    setForm((f) => ({ ...f, batchId: '' }));
    if (!form.branchId || !form.intakeId) return;
    apiGet(`/api/materials/branches/${encodeURIComponent(form.branchId)}/intakes/${encodeURIComponent(form.intakeId)}/batches`)
      .then((d) => setBatches(Array.isArray(d?.batches) ? d.batches : [])).catch(() => {});
  }, [form.branchId, form.intakeId]); // eslint-disable-line

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setEdit = (k) => (e) => setEditForm((f) => ({ ...f, [k]: e.target.value }));

  const onLecturerSelect = (e) => {
    const lect = lecturers.find((l) => l.id === e.target.value);
    setForm((f) => ({ ...f, lecturerId: lect?.id || '', lecturerName: lect?.name || '' }));
  };

  const onCreate = async (e) => {
    e.preventDefault(); setFormErr(''); setSubmitting(true);
    try {
      await apiPost('/api/admin/schedule', form);
      setForm(emptyForm); setShowForm(false); loadSchedules();
    } catch (err) { setFormErr(err?.message || 'Failed to create'); }
    finally { setSubmitting(false); }
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setEditForm({ subject: s.subject, date: s.date, startTime: s.startTime, endTime: s.endTime, room: s.room, notes: s.notes, lecturerName: s.lecturerName, lecturerId: s.lecturerId });
    setEditErr('');
  };

  const onEditSave = async (e) => {
    e.preventDefault(); setEditErr(''); setEditSaving(true);
    try { await apiPut(`/api/admin/schedule/${editId}`, editForm); setEditId(null); loadSchedules(); }
    catch (err) { setEditErr(err?.message || 'Failed to update'); }
    finally { setEditSaving(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this schedule entry?')) return;
    try { await apiDelete(`/api/admin/schedule/${id}`); loadSchedules(); }
    catch (err) { alert(err?.message || 'Failed to delete'); }
  };

  const inputCls = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Class Schedule</h2>
        <button
          onClick={() => { setShowForm((v) => !v); setFormErr(''); }}
          className="flex items-center gap-2 rounded-xl bg-[#003580] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Add Schedule'}
        </button>
      </div>

      {showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900 mb-4">New schedule entry</p>
          {formErr && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{formErr}</div>}
          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onCreate}>
            <div>
              <label className="text-xs font-semibold text-slate-600">Branch *</label>
              <select value={form.branchId} onChange={set('branchId')} className={`mt-1 ${inputCls}`} required>
                <option value="">Select branch</option>
                {branches.map((b) => <option key={b.id ?? b.name} value={b.id ?? b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Intake *</label>
              <select value={form.intakeId} onChange={set('intakeId')} className={`mt-1 ${inputCls}`} required disabled={!form.branchId}>
                <option value="">Select intake</option>
                {intakes.map((i) => <option key={i.id ?? i.name} value={i.id ?? i.name}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Batch *</label>
              <select value={form.batchId} onChange={set('batchId')} className={`mt-1 ${inputCls}`} required disabled={!form.intakeId}>
                <option value="">Select batch</option>
                {batches.map((b) => <option key={b.id ?? b.name} value={b.id ?? b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Subject / Class *</label>
              <input value={form.subject} onChange={set('subject')} className={`mt-1 ${inputCls}`} required placeholder="e.g. Air Navigation" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Date *</label>
              <input type="date" value={form.date} onChange={set('date')} className={`mt-1 ${inputCls}`} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Start time *</label>
              <input type="time" value={form.startTime} onChange={set('startTime')} className={`mt-1 ${inputCls}`} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">End time *</label>
              <input type="time" value={form.endTime} onChange={set('endTime')} className={`mt-1 ${inputCls}`} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Assigned lecturer *</label>
              {lecturers.length > 0 ? (
                <select value={form.lecturerId} onChange={onLecturerSelect} className={`mt-1 ${inputCls}`} required>
                  <option value="">Select lecturer</option>
                  {lecturers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              ) : (
                <input value={form.lecturerName} onChange={set('lecturerName')} className={`mt-1 ${inputCls}`} required placeholder="Lecturer name" />
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Room / Location *</label>
              <input value={form.room} onChange={set('room')} className={`mt-1 ${inputCls}`} required placeholder="Room 101 or Online" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Notes (optional)</label>
              <textarea value={form.notes} onChange={set('notes')} className={`mt-1 ${inputCls} resize-none`} rows={2} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={submitting} className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">
                {submitting ? 'Saving…' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-900">All Schedules</p>
          <button onClick={loadSchedules} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Refresh</button>
        </div>
        {listErr && <div className="text-sm text-rose-700 mb-3">{listErr}</div>}
        {loading && !schedules.length ? <div className="text-sm text-slate-500">Loading…</div> : null}
        {!loading && schedules.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">No schedules yet.</div>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                {editId === s.id ? (
                  <form onSubmit={onEditSave} className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {editErr && <div className="md:col-span-2 text-xs text-rose-700">{editErr}</div>}
                    <div><label className="text-xs font-semibold text-slate-600">Subject *</label><input value={editForm.subject} onChange={setEdit('subject')} className={`mt-1 ${inputCls}`} required /></div>
                    <div><label className="text-xs font-semibold text-slate-600">Date *</label><input type="date" value={editForm.date} onChange={setEdit('date')} className={`mt-1 ${inputCls}`} required /></div>
                    <div><label className="text-xs font-semibold text-slate-600">Start *</label><input type="time" value={editForm.startTime} onChange={setEdit('startTime')} className={`mt-1 ${inputCls}`} required /></div>
                    <div><label className="text-xs font-semibold text-slate-600">End *</label><input type="time" value={editForm.endTime} onChange={setEdit('endTime')} className={`mt-1 ${inputCls}`} required /></div>
                    <div><label className="text-xs font-semibold text-slate-600">Room *</label><input value={editForm.room} onChange={setEdit('room')} className={`mt-1 ${inputCls}`} required /></div>
                    <div><label className="text-xs font-semibold text-slate-600">Lecturer</label><input value={editForm.lecturerName} onChange={setEdit('lecturerName')} className={`mt-1 ${inputCls}`} /></div>
                    <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-600">Notes</label><textarea value={editForm.notes} onChange={setEdit('notes')} className={`mt-1 ${inputCls} resize-none`} rows={2} /></div>
                    <div className="md:col-span-2 flex gap-2">
                      <button type="submit" disabled={editSaving} className="rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60">{editSaving ? 'Saving…' : 'Save'}</button>
                      <button type="button" onClick={() => setEditId(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{s.subject}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{s.date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.startTime} – {s.endTime}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.room}</span>
                        {s.lecturerName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{s.lecturerName}</span>}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">Batch: {s.batchId} • Added by: {s.addedByName}</p>
                      {s.notes && <p className="mt-1 text-xs text-slate-600 italic">{s.notes}</p>}
                    </div>
                    {isSuperAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(s)} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"><Pencil size={14} /></button>
                        <button onClick={() => onDelete(s.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-100"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
