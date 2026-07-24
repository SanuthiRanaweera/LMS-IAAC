import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PassThrough } from 'stream';
import mongoose from 'mongoose';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const { GridFSBucket, ObjectId } = mongoose.mongo;
const IMAGE_BUCKET_NAME = 'image-assets';
const FILE_BUCKET_NAME = 'file-assets';
const SCOPE_CODES = {
  materials: 'mat',
  recordings: 'rec',
  'knowledge-hub': 'kh',
  default: 'ast',
};

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    const error = new Error(`${name} is not configured`);
    error.status = 503;
    throw error;
  }
  return value;
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

function sanitizeMetadataValue(value, maxLength = 200) {
  return Array.from(String(value || ''))
    .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126)
    .join('')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function sanitizeMetadataKey(value) {
  return sanitizeMetadataValue(value, 40)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function sanitizeExtension(fileName) {
  const rawExtension = path.extname(String(fileName || '')).toLowerCase();
  if (!rawExtension) return '';
  return rawExtension.replace(/[^a-z0-9.]+/g, '').slice(0, 10);
}

function scopeCode(scope) {
  const normalized = sanitizeMetadataValue(scope, 30).toLowerCase();
  return SCOPE_CODES[normalized] || SCOPE_CODES.default;
}

function buildObjectKey(fileName, metadata = {}, kind = 'file') {
  const kindCode = kind === 'image' ? 'img' : 'bin';
  const extension = sanitizeExtension(fileName);
  const stamp = Date.now().toString(36);
  const token = randomUUID().replace(/-/g, '');
  return `${scopeCode(metadata.scope)}/${kindCode}-${stamp}-${token}${extension}`;
}

function toObjectId(value) {
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

function isLegacyGridFsAssetId(assetId) {
  return Boolean(toObjectId(assetId));
}

function getImageBucket() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('Database is not connected');
  }

  return new GridFSBucket(mongoose.connection.db, { bucketName: IMAGE_BUCKET_NAME });
}

function getFileBucket() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('Database is not connected');
  }

  return new GridFSBucket(mongoose.connection.db, { bucketName: FILE_BUCKET_NAME });
}

function getUploadBody(file) {
  if (file?.buffer) return file.buffer;
  if (file?.path) return fs.createReadStream(file.path);

  const error = new Error('Uploaded file content is missing');
  error.status = 400;
  throw error;
}

function normalizeUploadMetadata(file, metadata = {}) {
  const entries = [
    ['originalfilename', file?.originalname || file?.filename || 'file'],
    ...Object.entries(metadata || {}),
  ];

  return Object.fromEntries(
    entries
      .map(([key, value]) => [sanitizeMetadataKey(key), sanitizeMetadataValue(value)])
      .filter(([key, value]) => key && value)
  );
}

function buildByteRange(options = {}) {
  const start = Number.isInteger(options.start) ? options.start : null;
  const endExclusive = Number.isInteger(options.end) ? options.end : null;

  if (start == null && endExclusive == null) return '';

  const endInclusive = endExclusive != null ? Math.max(start ?? 0, endExclusive - 1) : '';
  return `bytes=${start ?? 0}-${endInclusive}`;
}

async function storeAssetUpload(file, metadata = {}, kind = 'file') {
  const objectKey = buildObjectKey(file?.originalname, metadata, kind);
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: objectKey,
    Body: getUploadBody(file),
    ContentLength: Number.isFinite(file?.size) ? file.size : undefined,
    ContentType: file?.mimetype || 'application/octet-stream',
    Metadata: normalizeUploadMetadata(file, metadata),
  });

  await getR2Client().send(command);
  return objectKey;
}

async function getLegacyAssetInfo(assetId, bucketFactory) {
  const objectId = toObjectId(assetId);
  if (!objectId) return null;

  const files = await bucketFactory().find({ _id: objectId }).limit(1).toArray();
  return files[0] || null;
}

async function getR2AssetInfo(assetId) {
  try {
    const response = await getR2Client().send(
      new HeadObjectCommand({
        Bucket: getBucketName(),
        Key: assetId,
      })
    );

    return {
      _id: assetId,
      filename: response.Metadata?.originalfilename || path.basename(assetId),
      contentType: response.ContentType || 'application/octet-stream',
      length: Number(response.ContentLength || 0),
      metadata: response.Metadata || {},
    };
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
      return null;
    }

    throw err;
  }
}

function openLegacyDownloadStream(assetId, bucketFactory, options = {}) {
  const objectId = toObjectId(assetId);
  if (!objectId) return null;
  return bucketFactory().openDownloadStream(objectId, options);
}

function openR2DownloadStream(assetId, options = {}) {
  const stream = new PassThrough();

  void (async () => {
    const range = buildByteRange(options);
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: getBucketName(),
        Key: assetId,
        ...(range ? { Range: range } : {}),
      })
    );

    if (!response.Body || typeof response.Body.pipe !== 'function') {
      throw new Error('Failed to open asset download stream');
    }

    response.Body.on('error', (err) => stream.destroy(err));
    response.Body.pipe(stream);
  })().catch((err) => {
    stream.destroy(err);
  });

  return stream;
}

async function deleteLegacyAsset(assetId, bucketFactory) {
  const objectId = toObjectId(assetId);
  if (!objectId) return;

  try {
    await bucketFactory().delete(objectId);
  } catch (err) {
    if (err?.message?.includes('FileNotFound')) return;
    throw err;
  }
}

async function deleteR2Asset(assetId) {
  try {
    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: assetId,
      })
    );
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
      return;
    }

    throw err;
  }
}

export async function storeImageUpload(file, metadata = {}) {
  return storeAssetUpload(file, metadata, 'image');
}

export async function getImageAssetInfo(assetId) {
  if (!assetId) return null;
  if (isLegacyGridFsAssetId(assetId)) {
    return getLegacyAssetInfo(assetId, getImageBucket);
  }

  return getR2AssetInfo(assetId);
}

export function openImageDownloadStream(assetId) {
  if (!assetId) return null;
  if (isLegacyGridFsAssetId(assetId)) {
    return openLegacyDownloadStream(assetId, getImageBucket);
  }

  return openR2DownloadStream(assetId);
}

export async function deleteImageAsset(assetId) {
  if (!assetId) return;
  if (isLegacyGridFsAssetId(assetId)) {
    await deleteLegacyAsset(assetId, getImageBucket);
    return;
  }

  await deleteR2Asset(assetId);
}

export async function storeFileUpload(file, metadata = {}) {
  return storeAssetUpload(file, metadata, 'file');
}

export async function getFileAssetInfo(assetId) {
  if (!assetId) return null;
  if (isLegacyGridFsAssetId(assetId)) {
    return getLegacyAssetInfo(assetId, getFileBucket);
  }

  return getR2AssetInfo(assetId);
}

export function openFileDownloadStream(assetId, options = {}) {
  if (!assetId) return null;
  if (isLegacyGridFsAssetId(assetId)) {
    return openLegacyDownloadStream(assetId, getFileBucket, options);
  }

  return openR2DownloadStream(assetId, options);
}

export async function deleteFileAsset(assetId) {
  if (!assetId) return;
  if (isLegacyGridFsAssetId(assetId)) {
    await deleteLegacyAsset(assetId, getFileBucket);
    return;
  }

  await deleteR2Asset(assetId);
}