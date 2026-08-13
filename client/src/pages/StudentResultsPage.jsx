import { useEffect, useState } from 'react';

import { apiGet } from '../api/http.js';

export default function StudentResultsPage() {
  const [results, setResults] = useState([]);
  const [student, setStudent] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      try {
        setLoading(true);
        setError('');

        const response =
          await apiGet(
            '/api/student/results'
          );

        if (cancelled) {
          return;
        }

        setStudent(
          response?.student ||
            null
        );

        setResults(
          Array.isArray(
            response?.results
          )
            ? response.results
            : []
        );
      } catch (err) {
        if (!cancelled) {
          setResults([]);

          setError(
            err?.message ||
              'Failed to load your results.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResults();

    return () => {
      cancelled = true;
    };
  }, []);

  function formatDate(value) {
    if (!value) {
      return '-';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }

    return date.toLocaleDateString();
  }

  function getStatusClass(status) {
    switch (
      String(status || '')
        .toUpperCase()
    ) {
      case 'PASS':
        return 'bg-emerald-100 text-emerald-700';

      case 'FAIL':
        return 'bg-rose-100 text-rose-700';

      case 'ABSENT':
        return 'bg-amber-100 text-amber-700';

      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          My Results
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          View your published examination and assessment results.
        </p>
      </div>

      {/* STUDENT INFO */}

      {student ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Student ID
              </div>

              <div className="mt-1 font-bold text-slate-900">
                {student.studentId || '-'}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Student
              </div>

              <div className="mt-1 font-bold text-slate-900">
                {student.fullName || '-'}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Course
              </div>

              <div className="mt-1 font-bold text-slate-900">
                {student.course || '-'}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Results
              </div>

              <div className="mt-1 font-bold text-slate-900">
                {results.length}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ERROR */}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {/* LOADING */}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-600 shadow-sm">
          Loading your results...
        </div>
      ) : null}

      {/* EMPTY */}

      {!loading &&
      !error &&
      results.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            No published results
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Your results will appear here after they are published by the administration.
          </p>
        </div>
      ) : null}

      {/* RESULTS */}

      {!loading &&
      results.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">
              Published Results
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {results.length} result(s)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Result
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Date
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Marks
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Grade
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700">
                    Remarks
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {results.map(
                  (result) => (
                    <tr
                      key={
                        result.id ||
                        result.resultId
                      }
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {result.resultTitle}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {result.course}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {formatDate(
                          result.resultDate
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-900">
                        {result.marks ??
                          '-'}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-900">
                        {result.grade ||
                          '-'}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClass(
                            result.status
                          )}`}
                        >
                          {result.status ||
                            'PENDING'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {result.remarks ||
                          '-'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}