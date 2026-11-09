import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  UsersRound,
  Search,
  Filter,
  RefreshCw,
  Mail,
  GraduationCap,
  CheckCircle2,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react';
import { apiGet } from '../../api/http.js';

export default function LecturerStudentsPage() {
  const { lecturer } = useOutletContext() || {};

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');

  const fetchStudents = () => {
    setLoading(true);
    setError('');
    apiGet('/api/lecturers/me/students')
      .then((data) => {
        setStudents(Array.isArray(data?.students) ? data.students : []);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load students.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const uniqueCourses = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.course) set.add(s.course);
    });
    return Array.from(set).sort();
  }, [students]);

  const uniqueBatches = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.batchId) set.add(s.batchId);
    });
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (courseFilter !== 'ALL' && s.course !== courseFilter) return false;
      if (batchFilter !== 'ALL' && s.batchId !== batchFilter) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          s.fullName?.toLowerCase().includes(q) ||
          s.studentId?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, courseFilter, batchFilter, search]);

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <UsersRound size={24} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <span>My Students</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View students enrolled in your assigned classes and academic batches.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStudents}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw
            size={16}
            strokeWidth={1.8}
            className={loading ? 'animate-spin' : ''}
            aria-hidden="true"
          />
          <span>Refresh List</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Students
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{students.length}</span>
            <UsersRound size={20} strokeWidth={1.8} className="text-slate-300" aria-hidden="true" />
          </div>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
            Filtered Count
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-sky-900">{filteredStudents.length}</span>
            <Filter size={20} strokeWidth={1.8} className="text-sky-500" aria-hidden="true" />
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#173B75]">
            Assigned Batch
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-extrabold text-[#173B75] truncate">
              {lecturer?.batchId ? `Batch ${lecturer.batchId}` : 'All Batches'}
            </span>
            <GraduationCap size={20} strokeWidth={1.8} className="text-[#173B75]" aria-hidden="true" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Active Status
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-800">
              {students.filter((s) => s.academicStatus !== 'Inactive').length}
            </span>
            <CheckCircle2 size={20} strokeWidth={1.8} className="text-emerald-600" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row items-stretch sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search size={18} strokeWidth={1.8} className="text-slate-400 absolute left-3.5 top-3" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search student by name, student ID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ALL">All Diplomas</option>
            {uniqueCourses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ALL">All Batches</option>
            {uniqueBatches.map((b) => (
              <option key={b} value={b}>
                Batch {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {error && (
          <div className="p-4 text-xs font-semibold text-rose-700 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
            <AlertCircle size={16} strokeWidth={1.8} className="text-rose-600" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <LoaderCircle size={32} strokeWidth={1.8} className="mx-auto animate-spin text-[#173B75] mb-3" aria-hidden="true" />
            <p className="font-bold text-slate-700">Loading student directory from database...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <UsersRound size={36} strokeWidth={1.8} className="mx-auto text-slate-300 mb-2" aria-hidden="true" />
            <p className="text-base font-bold text-slate-700">No students found matching your search</p>
            <p className="mt-1 text-slate-400">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Student ID</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Diploma / Course</th>
                  <th className="py-3.5 px-4 text-center">Batch</th>
                  <th className="py-3.5 px-4">Email Address</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st) => (
                  <tr key={st.id || st.studentId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-[#173B75] bg-blue-50/80 border border-blue-100 px-2.5 py-1 rounded-lg">
                        {st.studentId}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {st.fullName}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {st.course || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                        {st.batchId ? `Batch ${st.batchId}` : '—'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {st.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail size={14} strokeWidth={1.8} className="text-slate-400 shrink-0" aria-hidden="true" />
                          <span>{st.email}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 size={12} strokeWidth={2} className="text-emerald-600" aria-hidden="true" />
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
