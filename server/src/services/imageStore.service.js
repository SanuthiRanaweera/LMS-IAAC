import fs from 'fs';
import { pipeline } from 'stream/promises';
import mongoose from 'mongoose';

const { GridFSBucket, ObjectId } = mongoose.mongo;
const IMAGE_BUCKET_NAME = 'image-assets';
const FILE_BUCKET_NAME = 'file-assets';

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

function toObjectId(value) {
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

export async function storeImageUpload(file, metadata = {}) {
  const bucket = getImageBucket();
  const uploadStream = bucket.openUploadStream(file.originalname || 'image', {
    contentType: file.mimetype || 'application/octet-stream',
    metadata,
  });

  await pipeline(fs.createReadStream(file.path), uploadStream);
  return String(uploadStream.id);
}

export async function getImageAssetInfo(assetId) {
  const objectId = toObjectId(assetId);
  if (!objectId) return null;

  const files = await getImageBucket().find({ _id: objectId }).limit(1).toArray();
  return files[0] || null;
}

export function openImageDownloadStream(assetId) {
  const objectId = toObjectId(assetId);
  if (!objectId) return null;
  return getImageBucket().openDownloadStream(objectId);
}

export async function deleteImageAsset(assetId) {
  const objectId = toObjectId(assetId);
  if (!objectId) return;

  try {
    await getImageBucket().delete(objectId);
  } catch (err) {
    if (err?.message?.includes('FileNotFound')) return;
    throw err;
  }
}

export async function storeFileUpload(file, metadata = {}) {
  const bucket = getFileBucket();
  const uploadStream = bucket.openUploadStream(file.originalname || 'file', {
    contentType: file.mimetype || 'application/octet-stream',
    metadata,
  });

  await pipeline(fs.createReadStream(file.path), uploadStream);
  return String(uploadStream.id);
}

export async function getFileAssetInfo(assetId) {
  const objectId = toObjectId(assetId);
  if (!objectId) return null;

  const files = await getFileBucket().find({ _id: objectId }).limit(1).toArray();
  return files[0] || null;
}

export function openFileDownloadStream(assetId, options = {}) {
  const objectId = toObjectId(assetId);
  if (!objectId) return null;
  return getFileBucket().openDownloadStream(objectId, options);
}

export async function deleteFileAsset(assetId) {
  const objectId = toObjectId(assetId);
  if (!objectId) return;

  try {
    await getFileBucket().delete(objectId);
  } catch (err) {
    if (err?.message?.includes('FileNotFound')) return;
    throw err;
  }
}