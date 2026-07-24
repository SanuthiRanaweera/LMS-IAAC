import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

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
    .replace(/\s+/g, '-')
    .slice(0, 120) || 'unknown';
}

function buildObjectKey(prefix, fileName) {
  const safePrefix = sanitizePathSegment(prefix);
  const safeName = sanitizePathSegment(fileName || 'file');
  return `${safePrefix}/${Date.now()}-${randomUUID()}-${safeName}`;
}

function getR2Client() {
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getBucketName() {
  return requireEnv('R2_BUCKET');
}

function getSignedUrlTtl() {
  const raw = Number(process.env.R2_SIGNED_URL_TTL_SECONDS || 900);
  if (!Number.isFinite(raw) || raw < 60) return 900;
  return Math.floor(raw);
}

function toStorageUri(objectKey) {
  return `r2://${objectKey}`;
}

function fromStorageUri(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('r2://')) return trimmed.slice('r2://'.length);
  return trimmed;
}

async function getPublicOrSignedUrl(objectKey) {
  const publicBase = String(process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/g, '');
  if (publicBase) {
    return `${publicBase}/${encodeURIComponent(objectKey).replace(/%2F/g, '/')}`;
  }

  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: objectKey,
  });

  return getSignedUrl(client, command, { expiresIn: getSignedUrlTtl() });
}

export async function uploadAssignmentFileToR2({
  folder,
  fileName,
  fileBuffer,
  mimeType,
  metadata = {},
}) {
  if (!fileBuffer || typeof fileBuffer.length !== 'number') {
    const error = new Error('Invalid file buffer for R2 upload');
    error.status = 400;
    throw error;
  }

  const objectKey = buildObjectKey(folder || 'assignments', fileName);

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: objectKey,
    Body: fileBuffer,
    ContentType: mimeType || 'application/octet-stream',
    Metadata: Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [sanitizePathSegment(key).toLowerCase(), sanitizePathSegment(value)])
    ),
  });

  await getR2Client().send(command);

  return {
    objectKey,
    storageUri: toStorageUri(objectKey),
  };
}

export async function resolveAssignmentFileUrl(value) {
  const objectKey = fromStorageUri(value);
  if (!objectKey) return '';

  if (!String(value || '').startsWith('r2://')) {
    return String(value || '').trim();
  }

  return getPublicOrSignedUrl(objectKey);
}