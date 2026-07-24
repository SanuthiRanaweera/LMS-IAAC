import { apiGet, getApiBaseUrl } from '../api/http.js';

function joinApiUrl(base, path) {
  const normalizedBase = String(base || '').replace(/\/$/, '');
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;

  if (normalizedBase.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${normalizedBase}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBase}${normalizedPath}`;
}

export async function fetchAssignmentHierarchy() {
  const response = await apiGet('/api/materials/hierarchy/full');
  return Array.isArray(response?.branches) ? response.branches : [];
}

export async function fetchAdminAssignments() {
  const response = await apiGet('/api/admin/assignments?limit=50');
  return Array.isArray(response?.assignments) ? response.assignments : [];
}

export async function createAssignment(payload) {
  const apiBase = await getApiBaseUrl();
  const formData = new globalThis.FormData();

  formData.append('branchId', payload.branchId);
  formData.append('batchId', payload.batchId);
  formData.append('course', payload.course);
  formData.append('title', payload.title);
  formData.append('description', payload.description);
  formData.append('deadline', payload.deadline);

  if (payload.referenceDocument) {
    formData.append('referenceDocument', payload.referenceDocument);
  }

  const response = await fetch(joinApiUrl(apiBase, '/api/admin/assignments'), {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const payloadError = await response.json().catch(() => ({}));
    const errors = Array.isArray(payloadError?.errors) ? payloadError.errors.filter(Boolean) : [];
    throw new Error(errors[0] || payloadError?.message || 'Failed to create assignment.');
  }

  return response.json();
}

export async function fetchStudentAssignments() {
  const response = await apiGet('/api/student/assignments');
  return Array.isArray(response?.assignments) ? response.assignments : [];
}

export async function submitAssignmentFile({ assignmentId, file }) {
  const apiBase = await getApiBaseUrl();
  const formData = new globalThis.FormData();
  formData.append('assignmentId', assignmentId);
  formData.append('file', file);

  const response = await fetch(joinApiUrl(apiBase, '/api/student/assignments/submit'), {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const payloadError = await response.json().catch(() => ({}));
    throw new Error(payloadError?.message || 'Failed to submit assignment.');
  }

  return response.json();
}