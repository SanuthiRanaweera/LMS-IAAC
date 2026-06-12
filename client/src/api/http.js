let resolvedApiBaseUrl = null;
let resolvingApiBaseUrl = null;

function envBaseUrl() {
  const v = import.meta.env.VITE_API_BASE_URL;
  if (typeof v !== 'string' || !v.trim()) return null;

  const normalized = v.trim().replace(/\/$/, '');

  if (normalized === '/api') {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized.replace(/\/api$/, '');
  }

  return normalized;
}

async function canReachApi(baseUrl, { timeoutMs = 800 } = {}) {
  const controller = new globalThis.AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function resolveApiBaseUrl() {
  if (resolvedApiBaseUrl) return resolvedApiBaseUrl;
  if (resolvingApiBaseUrl) return resolvingApiBaseUrl;

  const fromEnv = envBaseUrl();
  if (fromEnv) {
    resolvedApiBaseUrl = fromEnv;
    return fromEnv;
  }

  resolvingApiBaseUrl = (async () => {
    const cached =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem('iaac-api-base-url')
        : null;

    if (cached && (await canReachApi(cached))) {
      resolvedApiBaseUrl = cached;
      return cached;
    }

    // The server may auto-increment PORT (5000..5009). Probe quickly.
    for (let port = 5000; port <= 5009; port += 1) {
      const base = `http://localhost:${port}`;
      if (await canReachApi(base)) {
        resolvedApiBaseUrl = base;
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('iaac-api-base-url', base);
        }
        return base;
      }
    }

    resolvedApiBaseUrl = 'http://localhost:5000';
    return resolvedApiBaseUrl;
  })();

  try {
    return await resolvingApiBaseUrl;
  } finally {
    resolvingApiBaseUrl = null;
  }
}

export async function getApiBaseUrl() {
  return resolveApiBaseUrl();
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function readErrorMessage(res) {
  const contentType = String(res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    const cloned = res.clone();
    try {
      const json = await res.json();
      const msg =
        (json && typeof json === 'object' && (json.message || json.error)) ||
        (typeof json === 'string' ? json : null);
      if (msg) return String(msg);
      return JSON.stringify(json);
    } catch {
      const text = await cloned.text();
      return text || `Request failed: ${res.status}`;
    }
  }

  const text = await res.text();
  return text || `Request failed: ${res.status}`;
}

function networkErrorMessage(baseUrl) {
  return `Can't connect to the server (${baseUrl}). Please make sure the backend is running and try again.`;
}

function buildRequestUrl(baseUrl, path) {
  const normalizedBaseUrl = String(baseUrl || '').replace(/\/$/, '');
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;

  if (normalizedBaseUrl.endsWith('/api') && normalizedPath === '/api') {
    return normalizedBaseUrl;
  }

  if (normalizedBaseUrl.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${normalizedBaseUrl}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export async function apiGet(path) {
  const baseUrl = await resolveApiBaseUrl();
  const requestUrl = buildRequestUrl(baseUrl, path);
  let res;
  try {
    res = await fetch(requestUrl, { credentials: 'include', cache: 'no-store' });
  } catch {
    throw new ApiError(networkErrorMessage(baseUrl), 0);
  }
  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status);
  return res.json();
}

export async function apiPost(path, body) {
  const baseUrl = await resolveApiBaseUrl();
  const requestUrl = buildRequestUrl(baseUrl, path);
  let res;
  try {
    res = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(networkErrorMessage(baseUrl), 0);
  }
  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status);
  return res.json();
}

export async function apiPut(path, body) {
  const baseUrl = await resolveApiBaseUrl();
  const requestUrl = buildRequestUrl(baseUrl, path);
  let res;
  try {
    res = await fetch(requestUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(networkErrorMessage(baseUrl), 0);
  }
  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status);
  return res.json();
}

export async function apiPatch(path, body) {
  const baseUrl = await resolveApiBaseUrl();
  const requestUrl = buildRequestUrl(baseUrl, path);
  let res;
  try {
    res = await fetch(requestUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(networkErrorMessage(baseUrl), 0);
  }
  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status);
  return res.json();
}

export async function apiDelete(path) {
  const baseUrl = await resolveApiBaseUrl();
  const requestUrl = buildRequestUrl(baseUrl, path);
  let res;
  try {
    res = await fetch(requestUrl, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    throw new ApiError(networkErrorMessage(baseUrl), 0);
  }
  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status);
  return res.text(); // DELETE endpoints typically return text
}
