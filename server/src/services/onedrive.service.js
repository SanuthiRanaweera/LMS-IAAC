import axios from 'axios';

let cachedToken = '';
let cachedTokenExpiresAt = 0;

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    const error = new Error(`${name} is not configured`);
    error.status = 503;
    throw error;
  }
  return value;
}

function sanitizePathSegment(value) {
  return Array.from(String(value || ''))
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('')
    .trim()
    .replace(/[<>:"\\|?*]+/g, '-')
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120) || 'unknown';
}

function buildDrivePath(segments) {
  return segments
    .map((segment) => sanitizePathSegment(segment))
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && cachedTokenExpiresAt > now + 60_000) {
    return cachedToken;
  }

  const tenantId = requireEnv('MS_GRAPH_TENANT_ID');
  const clientId = requireEnv('MS_GRAPH_CLIENT_ID');
  const clientSecret = requireEnv('MS_GRAPH_CLIENT_SECRET');

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new globalThis.URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });

  const { data } = await axios.post(tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15_000,
  });

  cachedToken = String(data?.access_token || '');
  cachedTokenExpiresAt = now + Number(data?.expires_in || 3600) * 1000;

  if (!cachedToken) {
    const error = new Error('Failed to obtain Microsoft Graph access token');
    error.status = 502;
    throw error;
  }

  return cachedToken;
}

export async function uploadAssignmentSubmissionToOneDrive({ course, batchId, studentId, fileName, fileBuffer, mimeType }) {
  const driveId = requireEnv('MS_GRAPH_DRIVE_ID');
  const rootPath = String(process.env.MS_GRAPH_ASSIGNMENTS_ROOT_PATH || 'IAAC_Assignments')
    .trim()
    .replace(/^\/+|\/+$/g, '');

  const token = await getAccessToken();
  const drivePath = buildDrivePath([
    rootPath,
    course,
    batchId,
    `${studentId}_${fileName}`,
  ]);

  const url = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root:/${drivePath}:/content`;

  const { data } = await axios.put(url, fileBuffer, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': mimeType || 'application/octet-stream',
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60_000,
  });

  const webUrl = String(data?.webUrl || '').trim();
  const oneDriveFileId = String(data?.id || '').trim();

  if (!webUrl || !oneDriveFileId) {
    const error = new Error('Microsoft OneDrive did not return a usable file link');
    error.status = 502;
    throw error;
  }

  return {
    oneDriveUrl: webUrl,
    oneDriveFileId,
  };
}