import fs from 'fs';
import path from 'path';
import { Admin } from '../models/Admin.js';
import { KnowledgeHubItem } from '../models/KnowledgeHubItem.js';
import { Student } from '../models/Student.js';
import {
  deleteImageAsset,
  getImageAssetInfo,
  openImageDownloadStream,
  storeImageUpload,
} from '../services/imageStore.service.js';

const ALLOWED_FILE_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/plain',
]);
const ALLOWED_FILE_EXTS = new Set(['.pdf', '.docx', '.pptx', '.xlsx', '.zip', '.doc', '.xls', '.ppt', '.txt']);
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function normalizeId(v) { return v == null ? '' : String(v).trim(); }
function safeStr(v, max = 300) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function buildAbsoluteUrl(req, value) {
  if (!value) return '';
  if (isAbsoluteUrl(value)) return String(value);
  return `${req.protocol}://${req.get('host')}/${String(value).replace(/^\/+/, '')}`;
}

function toItem(d, req) {
  const imagePaths = Array.isArray(d.imageAssetIds) && d.imageAssetIds.length > 0
    ? d.imageAssetIds.map((_, index) => buildAbsoluteUrl(req, `api/knowledge-hub/media/${String(d._id)}/${index}`))
    : (Array.isArray(d.imagePaths) ? d.imagePaths.map((value) => buildAbsoluteUrl(req, value)) : []);

  return {
    id: String(d._id),
    branchId: d.branchId,
    intakeId: d.intakeId,
    batchId:  d.batchId,
    resourceType: d.resourceType,
    title:       d.title,
    description: d.description || '',
    hasFile:    Boolean(d.filePath),
    fileName:   d.fileName || '',
    fileSize:   d.fileSize || 0,
    downloadUrl: d.filePath ? buildAbsoluteUrl(req, `api/knowledge-hub/download/${String(d._id)}`) : '',
    imagePaths,
    imageNames: Array.isArray(d.imageNames) ? d.imageNames : [],
    contentUrl: d.contentUrl || '',
    textContent: d.textContent || '',
    addedBy:     d.addedBy,
    addedByName: d.addedByName,
    addedByRole: d.addedByRole,
    createdAt:  d.createdAt,
  };
}

function buildVisibilityFilter(user) {
  const filter = {};
  if (user?.batchId) filter.batchId = normalizeId(user.batchId);
  if (user?.intakeId) filter.intakeId = normalizeId(user.intakeId);
  if (user?.branchId) filter.branchId = normalizeId(user.branchId);
  return filter;
}

function getUploadedFiles(req, fieldName) {
  const files = req.files;
  if (!files || Array.isArray(files)) return [];
  const value = files[fieldName];
  return Array.isArray(value) ? value : value ? [value] : [];
}

function removeUploadedFiles(files) {
  for (const file of files) {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
}

async function removeStoredKnowledgeHubFiles(item) {
  if (Array.isArray(item?.imageAssetIds) && item.imageAssetIds.length > 0) {
    await Promise.allSettled(item.imageAssetIds.map((assetId) => deleteImageAsset(assetId)));
  }

  const paths = [item?.filePath, ...(Array.isArray(item?.imagePaths) ? item.imagePaths : [])].filter(Boolean);
  for (const filePath of paths) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

async function resolveUserBatch(auth) {
  if (auth?.role === 'lecturer') {
    const l = await Admin.findById(auth.sub).lean();
    return l ? { branchId: l.branchId, intakeId: l.intakeId, batchId: l.batchId, name: l.name, role: 'lecturer', id: String(l._id) } : null;
  }
  const s = await Student.findById(auth.sub).lean();
  return s ? { branchId: s.branchId, intakeId: s.intakeId, batchId: s.batchId, role: 'student', id: String(s._id) } : null;
}

// ─── STUDENT / LECTURER: list items for their batch ──────────────────────────
export async function listMyHubItems(req, res, next) {
  try {
    const user = await resolveUserBatch(req.auth);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const visibilityFilter = buildVisibilityFilter(user);
    if (!visibilityFilter.batchId && !visibilityFilter.intakeId && !visibilityFilter.branchId) {
      return res.json({ items: [] });
    }

    const items = await KnowledgeHubItem.find(visibilityFilter)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: items.map((item) => toItem(item, req)) });
  } catch (err) { next(err); }
}

export async function streamHubImage(req, res, next) {
  try {
    const item = await KnowledgeHubItem.findById(req.params.id)
      .select('imageAssetIds imagePaths imageNames title')
      .lean();
    if (!item) return res.status(404).json({ message: 'Resource not found' });

    const index = Number.parseInt(req.params.index, 10);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ message: 'Invalid image index' });
    }

    const assetId = Array.isArray(item.imageAssetIds) ? item.imageAssetIds[index] : '';
    if (assetId) {
      const asset = await getImageAssetInfo(assetId);
      if (!asset) return res.status(404).json({ message: 'Image not found' });

      const stream = openImageDownloadStream(assetId);
      if (!stream) return res.status(404).json({ message: 'Image not found' });

      res.setHeader('Content-Type', asset.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${item.imageNames?.[index] || asset.filename || `image-${index + 1}`}"`);
      stream.on('error', next);
      stream.pipe(res);
      return;
    }

    const legacyPath = Array.isArray(item.imagePaths) ? item.imagePaths[index] : '';
    if (!legacyPath) return res.status(404).json({ message: 'Image not found' });

    const absPath = path.resolve(legacyPath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ message: 'Image not found' });

    res.sendFile(absPath);
  } catch (err) {
    next(err);
  }
}

// ─── STUDENT: download a file resource ───────────────────────────────────────
export async function studentDownloadResource(req, res, next) {
  try {
    const student = await Student.findById(req.auth.sub).lean();
    if (!student) return res.status(401).json({ message: 'Unauthorized' });

    const item = await KnowledgeHubItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: 'Resource not found' });

    const sameBatch = student.batchId && normalizeId(item.batchId) === normalizeId(student.batchId);
    const sameIntake = !student.batchId && student.intakeId && normalizeId(item.intakeId) === normalizeId(student.intakeId);
    const sameBranch = !student.batchId && !student.intakeId && student.branchId && normalizeId(item.branchId) === normalizeId(student.branchId);
    if (!sameBatch && !sameIntake && !sameBranch) {
      return res.status(403).json({ message: 'This resource is not available for your batch.' });
    }
    if (!item.filePath) return res.status(404).json({ message: 'No file attached' });

    const absPath = path.resolve(item.filePath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ message: 'File not found' });

    res.download(absPath, item.fileName || 'download');
  } catch (err) { next(err); }
}

// ─── LECTURER: add resource ───────────────────────────────────────────────────
export async function lecturerAddHubItem(req, res, next) {
  try {
    const lecturer = await Admin.findById(req.auth.sub).lean();
    if (!lecturer || lecturer.role !== 'lecturer') return res.status(403).json({ message: 'Forbidden' });

    const { resourceType, title, description, contentUrl, textContent, batchId, intakeId } = req.body || {};

    const validTypes = ['file', 'link', 'video', 'note'];
    if (!validTypes.includes(resourceType)) {
      return res.status(400).json({ message: 'Invalid resource type. Use: file, link, video, note' });
    }
    if (!safeStr(title)) return res.status(400).json({ message: 'Title is required' });

    const targetBatchId  = normalizeId(batchId)  || normalizeId(lecturer.batchId);
    const targetIntakeId = normalizeId(intakeId) || normalizeId(lecturer.intakeId);
    const targetBranchId = normalizeId(lecturer.branchId);

    if (!targetBatchId) return res.status(400).json({ message: 'No batch assigned to your account' });

    if (normalizeId(lecturer.batchId) && targetBatchId !== normalizeId(lecturer.batchId)) {
      return res.status(403).json({ message: 'You can only add resources for your assigned batch' });
    }

    let filePath = '', fileName = '', fileSize = 0, fileMime = '';

    if (resourceType === 'file') {
      if (!req.file) return res.status(400).json({ message: 'File is required for type "file"' });
      if (!ALLOWED_FILE_MIMES.has(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Invalid file type. Only PDF, DOCX, PPTX, XLSX, ZIP allowed.' });
      }
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!ALLOWED_FILE_EXTS.has(ext)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Invalid file extension.' });
      }
      filePath = req.file.path;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      fileMime = req.file.mimetype;
    } else if (resourceType === 'link' || resourceType === 'video') {
      if (!contentUrl || !isValidUrl(contentUrl)) {
        return res.status(400).json({ message: 'A valid URL is required for type "link" or "video"' });
      }
    } else if (resourceType === 'note') {
      if (!safeStr(textContent || '', 20000)) {
        return res.status(400).json({ message: 'Note content is required' });
      }
    }

    const created = await KnowledgeHubItem.create({
      branchId: targetBranchId,
      intakeId: targetIntakeId,
      batchId:  targetBatchId,
      resourceType,
      title:       safeStr(title),
      description: safeStr(description || '', 1000),
      filePath, fileName, fileSize, fileMime,
      contentUrl:  contentUrl ? safeStr(contentUrl, 1000) : '',
      textContent: textContent ? safeStr(textContent, 20000) : '',
      addedBy:     String(lecturer._id),
      addedByName: lecturer.name,
      addedByRole: 'lecturer',
    });

    res.status(201).json({ item: toItem(created) });
  } catch (err) { next(err); }
}

// ─── LECTURER: delete own resource ───────────────────────────────────────────
export async function lecturerDeleteHubItem(req, res, next) {
  try {
    const item = await KnowledgeHubItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: 'Resource not found' });

    if (String(item.addedBy) !== String(req.auth.sub)) {
      return res.status(403).json({ message: 'You can only delete your own resources' });
    }

    await removeStoredKnowledgeHubFiles(item);
    await KnowledgeHubItem.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// ─── ADMIN: list all resources ────────────────────────────────────────────────
export async function adminListHubItems(req, res, next) {
  try {
    const { batchId } = req.query;
    const filter = {};
    if (batchId) filter.batchId = normalizeId(batchId);

    const items = await KnowledgeHubItem.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ items: items.map((item) => toItem(item, req)) });
  } catch (err) { next(err); }
}

// ─── ADMIN: add resource to any batch ────────────────────────────────────────
export async function adminAddHubItem(req, res, next) {
  try {
    const { resourceType, title, description, contentUrl, textContent, branchId, intakeId, batchId } = req.body || {};

    const validTypes = ['file', 'link', 'video', 'note', 'gallery'];
    if (!validTypes.includes(resourceType)) return res.status(400).json({ message: 'Invalid resource type' });
    if (!safeStr(title)) return res.status(400).json({ message: 'Title is required' });
    if (!normalizeId(branchId)) return res.status(400).json({ message: 'Branch is required' });
    if (!normalizeId(batchId))  return res.status(400).json({ message: 'Batch is required' });

    let filePath = '', fileName = '', fileSize = 0, fileMime = '';
    let imageAssetIds = [];
    let imagePaths = [];
    let imageNames = [];

    if (resourceType === 'file') {
      const file = req.file || getUploadedFiles(req, 'file')[0];
      if (!file) return res.status(400).json({ message: 'File is required' });
      if (!ALLOWED_FILE_MIMES.has(file.mimetype)) {
        removeUploadedFiles([file]);
        return res.status(400).json({ message: 'Invalid file type' });
      }
      filePath = file.path;
      fileName = file.originalname;
      fileSize = file.size;
      fileMime = file.mimetype;
    } else if (resourceType === 'link' || resourceType === 'video') {
      if (!contentUrl || !isValidUrl(contentUrl)) return res.status(400).json({ message: 'Valid URL required' });
    } else if (resourceType === 'note') {
      if (!safeStr(textContent || '', 20000)) return res.status(400).json({ message: 'Note content required' });
    } else if (resourceType === 'gallery') {
      const files = getUploadedFiles(req, 'images');
      if (files.length === 0) return res.status(400).json({ message: 'At least one image is required' });
      if (files.length > 6) {
        removeUploadedFiles(files);
        return res.status(400).json({ message: 'You can upload up to 6 images' });
      }

      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_IMAGE_MIMES.has(file.mimetype) || !ALLOWED_IMAGE_EXTS.has(ext)) {
          removeUploadedFiles(files);
          return res.status(400).json({ message: 'Invalid image type. Use JPG, PNG, WebP or GIF.' });
        }
      }

      imageNames = files.map((file) => file.originalname);

      try {
        for (const file of files) {
          // GridFS avoids writing persisted image assets to the local uploads directory.
          const assetId = await storeImageUpload(file, {
            scope: 'knowledge-hub',
            resourceType,
            title: safeStr(title),
          });
          imageAssetIds.push(assetId);
        }
      } catch (err) {
        await Promise.allSettled(imageAssetIds.map((assetId) => deleteImageAsset(assetId)));
        throw err;
      } finally {
        removeUploadedFiles(files);
      }
    }

    const adminId = String(req.adminAuth?.sub || req.adminAuth?.id || '');
    const adminDoc = adminId ? await Admin.findById(adminId).select('name').lean() : null;
    const adminName = adminDoc?.name || 'Admin';

    let created;
    try {
      created = await KnowledgeHubItem.create({
        branchId: normalizeId(branchId),
        intakeId: normalizeId(intakeId || ''),
        batchId:  normalizeId(batchId),
        resourceType,
        title:       safeStr(title),
        description: safeStr(description || '', 1000),
        filePath, fileName, fileSize, fileMime,
        imageAssetIds, imagePaths, imageNames,
        contentUrl:  contentUrl ? safeStr(contentUrl, 1000) : '',
        textContent: textContent ? safeStr(textContent, 20000) : '',
        addedBy:     adminId,
        addedByName: adminName,
        addedByRole: 'superadmin',
      });
    } catch (err) {
      await Promise.allSettled(imageAssetIds.map((assetId) => deleteImageAsset(assetId)));
      throw err;
    }

    res.status(201).json({ item: toItem(created, req) });
  } catch (err) { next(err); }
}

// ─── ADMIN: delete any resource ───────────────────────────────────────────────
export async function adminDeleteHubItem(req, res, next) {
  try {
    const item = await KnowledgeHubItem.findByIdAndDelete(req.params.id).lean();
    if (!item) return res.status(404).json({ message: 'Resource not found' });
    await removeStoredKnowledgeHubFiles(item);
    res.json({ ok: true });
  } catch (err) { next(err); }
}
