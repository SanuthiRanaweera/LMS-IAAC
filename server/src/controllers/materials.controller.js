import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Material, STUDY_MATERIAL_COURSES } from '../models/Material.js';
import { Student } from '../models/Student.js';
import { DEFAULT_LMS_DATA } from '../data/defaultLmsData.js';
import { getOrCreateAppDataPayload } from '../services/appData.service.js';
import { logAdminAction } from '../middleware/adminAuth.js';
import {
  deleteFileAsset,
  getFileAssetInfo,
  openFileDownloadStream,
  storeFileUpload,
} from '../services/imageStore.service.js';

function normalizeId(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeName(value) {
  return typeof value === 'string' ? value : '';
}

function canonicalCourse(value) {
  const v = String(value || '').trim().toLowerCase();

  if (!v) return '';
  if (v === 'cabin crew' || v === 'cabin' || v === 'crew') return 'Cabin Crew';

  if (
    v === 'ground operations' ||
    v === 'ground ops' ||
    v === 'ground operation' ||
    v === 'ground'
  ) {
    return 'Ground Operations';
  }

  if (
    v === 'ticketing & reservations' ||
    v === 'ticketing and reservations' ||
    v === 'ticketing' ||
    v === 'reservations'
  ) {
    return 'Ticketing & Reservations';
  }

  if (v === 'air cargo' || v === 'cargo') return 'Air Cargo';

  return String(value || '').trim();
}

function removeUploadedFile(file) {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function deleteMaterialStoredFile(material) {
  if (material?.fileAssetId) {
    await deleteFileAsset(material.fileAssetId);
  }

  if (material?.fileUrl) {
    const absPath = path.resolve(material.fileUrl);

    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  }
}

function toAdminMaterialItem(material) {
  return {
    id: material._id,
    title: material.title,
    description: material.description || '',
    fileName: material.fileName,
    fileType: material.fileType,
    fileSize: material.fileSize,
    branchId: material.branchId,
    intakeId: material.intakeId,
    batchId: material.batchId,
    course: material.course || '',
    weekNumber: material.weekNumber || null,
    content: material.content || '',
    category: material.category || '',
    uploadedBy: material.uploadedByName,
    uploadedAt: material.createdAt,
    downloadCount: material.downloadCount,
    isActive: material.isActive,
  };
}

function toOption(node) {
  const id = normalizeId(node?.id || node?._id || node?.key || node?.code || node?.name);
  const name = normalizeName(node?.name || node?.title || node?.label);
  return { id, name };
}

function getFallbackBranches() {
  return Array.isArray(DEFAULT_LMS_DATA?.academics?.branches)
    ? DEFAULT_LMS_DATA.academics.branches
    : [];
}

async function loadAcademicBranches() {
  if (mongoose.connection.readyState !== 1) {
    return getFallbackBranches();
  }

  try {
    const payload = await getOrCreateAppDataPayload('academics', {
      branches: getFallbackBranches(),
    });

    return Array.isArray(payload?.branches) ? payload.branches : getFallbackBranches();
  } catch {
    return getFallbackBranches();
  }
}

function studentCanAccessMaterial(student, material, auth = {}) {
  const studentCourse = canonicalCourse(auth.course || student.course || '');
  const materialCourse = canonicalCourse(material.course || '');

  return Boolean(studentCourse && materialCourse && studentCourse === materialCourse);
}

async function getAuthorizedStudentMaterial(materialId, studentId, auth = {}) {
  if (!studentId) {
    return {
      status: 401,
      body: { message: 'Student authentication required' },
    };
  }

  const student = await Student.findById(studentId).lean();

  if (!student) {
    return {
      status: 404,
      body: { message: 'Student not found' },
    };
  }

  const material = await Material.findOne({
    _id: materialId,
    isActive: { $ne: false },
  }).lean();

  if (!material) {
    return {
      status: 404,
      body: { message: 'Material not found' },
    };
  }

  if (!studentCanAccessMaterial(student, material, auth)) {
    return {
      status: 403,
      body: {
        message: 'Access denied. This material is not available for your course.',
      },
    };
  }

  return { student, material };
}

function validateMaterialTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Material title is required' };
  }

  const trimmed = title.trim();

  if (trimmed.length < 5) {
    return {
      valid: false,
      error: 'Material title must be at least 5 characters long',
    };
  }

  const invalidNames = [
    'file1',
    'file2',
    'file3',
    'document',
    'upload',
    'material',
    'test',
    'example',
    'sample',
    'untitled',
    'new',
    'doc1',
    'doc2',
  ];

  if (invalidNames.includes(trimmed.toLowerCase())) {
    return {
      valid: false,
      error:
        'Please provide a descriptive title. Generic names like "file1" or "document" are not allowed',
    };
  }

  return { valid: true };
}

function validateUploadFields(body) {
  const { branchId, intakeId, title, course, weekNumber } = body;
  const errors = [];

  if (!String(branchId || '').trim()) {
    errors.push('Please select a branch');
  }

  if (!String(intakeId || '').trim()) {
    errors.push('Please select an intake');
  }

  const normalizedCourse = canonicalCourse(course);

  if (!normalizedCourse || !STUDY_MATERIAL_COURSES.includes(normalizedCourse)) {
    errors.push(`Please select a valid course: ${STUDY_MATERIAL_COURSES.join(', ')}`);
  }

  const parsedWeek = Number.parseInt(weekNumber, 10);

  if (!Number.isInteger(parsedWeek) || parsedWeek < 1 || parsedWeek > 52) {
    errors.push('Please provide a valid week number between 1 and 52');
  }

  const titleValidation = validateMaterialTitle(title);

  if (!titleValidation.valid) {
    errors.push(titleValidation.error);
  }

  return errors;
}

export async function getAcademicHierarchy(req, res, next) {
  try {
    const branches = await loadAcademicBranches();

    res.json({
      branches,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBranches(req, res, next) {
  try {
    const branches = await loadAcademicBranches();

    res.json({
      branches: branches.map((b) => toOption(b)).filter((b) => b.id && b.name),
    });
  } catch (err) {
    next(err);
  }
}

export async function getIntakes(req, res, next) {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({ message: 'Branch ID is required' });
    }

    const branches = await loadAcademicBranches();

    const branch = branches.find(
      (b) => normalizeId(b?.id || b?._id || b?.key || b?.code || b?.name) === normalizeId(branchId)
    );

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const intakes = Array.isArray(branch.intakes) ? branch.intakes : [];

    res.json({
      intakes: intakes.map((i) => toOption(i)).filter((i) => i.id && i.name),
    });
  } catch (err) {
    next(err);
  }
}

export async function getBatches(req, res, next) {
  try {
    const { branchId, intakeId } = req.params;

    if (!branchId || !intakeId) {
      return res.status(400).json({
        message: 'Branch ID and Intake ID are required',
      });
    }

    const branches = await loadAcademicBranches();

    const branch = branches.find(
      (b) => normalizeId(b?.id || b?._id || b?.key || b?.code || b?.name) === normalizeId(branchId)
    );

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const intakes = Array.isArray(branch.intakes) ? branch.intakes : [];

    const intake = intakes.find(
      (i) => normalizeId(i?.id || i?._id || i?.key || i?.code || i?.name) === normalizeId(intakeId)
    );

    if (!intake) {
      return res.status(404).json({ message: 'Intake not found' });
    }

    const batches = Array.isArray(intake.batches) ? intake.batches : [];

    const resolvedBatches =
      batches.length > 0
        ? batches
        : [
            {
              id: normalizeId(intake?.id || intake?.name),
              name: normalizeName(intake?.name || intake?.id),
              studentCount: 0,
            },
          ];

    res.json({
      batches: resolvedBatches.map((b) => ({
        ...toOption(b),
        studentCount: Number(b?.studentCount || 0),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadMaterial(req, res, next) {
  try {
    const {
      branchId,
      intakeId,
      batchId,
      title,
      description,
      category,
      course,
      weekNumber,
      content,
    } = req.body;

    const adminAuth = req.adminAuth;

    const validationErrors = validateUploadFields(req.body);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Upload validation failed',
        errors: validationErrors,
      });
    }

    if (!req.file && !String(content || '').trim()) {
      return res.status(400).json({
        message: 'Please upload a file or provide material content/link',
      });
    }

    const cleanBranchId = String(branchId || '').trim();
    const cleanIntakeId = String(intakeId || '').trim();
    const cleanBatchId = String(batchId || '').trim();
    const cleanTitle = String(title || '').trim();
    const cleanContent = String(content || '').trim();

    const parsedWeekNumber = Number.parseInt(weekNumber, 10);
    const normalizedCourse = canonicalCourse(course);
    const moduleMatch = cleanTitle.match(/Module\s+(\d+)/i);

    let fileAssetId = '';

    try {
      if (req.file) {
        fileAssetId = await storeFileUpload(req.file, {
          scope: 'materials',
          title: cleanTitle,
          branchId: cleanBranchId,
          intakeId: cleanIntakeId,
          batchId: cleanBatchId,
          course: normalizedCourse,
          weekNumber: parsedWeekNumber,
        });
      }

      const material = new Material({
        branchId: cleanBranchId,
        intakeId: cleanIntakeId,
        batchId: cleanBatchId,
        course: normalizedCourse,
        weekNumber: parsedWeekNumber,
        title: cleanTitle,
        description: String(description || '').trim(),
        content: cleanContent,
        fileName: req.file?.originalname || `${cleanTitle}.link`,
        fileUrl: req.file ? 'api/materials/student/download/content/pending' : '',
        fileAssetId,
        fileSize: req.file?.size || 0,
        fileType: req.file?.mimetype || 'text/link',
        uploadedBy: adminAuth.id,
        uploadedByName: adminAuth.name || 'Admin',
        category: String(category || 'Study Material').trim() || 'Study Material',
        week: parsedWeekNumber,
        module: moduleMatch ? Number.parseInt(moduleMatch[1], 10) : null,
        isActive: true,
      });

      const saved = await material.save();

      await logAdminAction(adminAuth.id, 'UPLOAD_MATERIAL', {
        materialId: saved._id,
        title: cleanTitle,
        branchId: cleanBranchId,
        batchId: cleanBatchId,
        intakeId: cleanIntakeId,
        course: normalizedCourse,
        weekNumber: parsedWeekNumber,
        fileSize: req.file?.size || 0,
        storedInMongo: Boolean(req.file),
      });

      res.status(201).json({
        message: 'Material uploaded successfully',
        material: {
          id: saved._id,
          title: saved.title,
          fileName: saved.fileName,
          fileSize: saved.fileSize,
          fileType: saved.fileType,
          course: saved.course,
          weekNumber: saved.weekNumber,
          uploadedAt: saved.createdAt,
        },
      });
    } catch (err) {
      if (fileAssetId) {
        await deleteFileAsset(fileAssetId);
      }

      removeUploadedFile(req.file);
      throw err;
    }

    if (req.file) {
      removeUploadedFile(req.file);
    }
  } catch (err) {
    next(err);
  }
}

export async function updateMaterial(req, res, next) {
  try {
    const { materialId } = req.params;

    const existing = await Material.findById(materialId);

    if (!existing) {
      removeUploadedFile(req.file);
      return res.status(404).json({ message: 'Material not found' });
    }

    const {
      branchId,
      intakeId,
      batchId,
      title,
      description,
      category,
      course,
      weekNumber,
      content,
    } = req.body || {};

    const validationErrors = validateUploadFields({
      branchId,
      intakeId,
      title,
      course,
      weekNumber,
    });

    if (validationErrors.length > 0) {
      removeUploadedFile(req.file);

      return res.status(400).json({
        message: 'Update validation failed',
        errors: validationErrors,
      });
    }

    const cleanBranchId = String(branchId || '').trim();
    const cleanIntakeId = String(intakeId || '').trim();
    const cleanBatchId = String(batchId || '').trim();
    const cleanTitle = String(title || '').trim();
    const cleanContent = String(content || '').trim();

    const normalizedCourse = canonicalCourse(course);
    const parsedWeekNumber = parsePositiveInt(weekNumber);
    const previousFileAssetId = existing.fileAssetId || '';

    let nextFileAssetId = existing.fileAssetId || '';
    let nextFileName = existing.fileName;
    let nextFileSize = existing.fileSize;
    let nextFileType = existing.fileType;
    let removeOldAsset = false;

    try {
      if (req.file) {
        nextFileAssetId = await storeFileUpload(req.file, {
          scope: 'materials',
          title: cleanTitle,
          branchId: cleanBranchId,
          intakeId: cleanIntakeId,
          batchId: cleanBatchId,
          course: normalizedCourse,
          weekNumber: parsedWeekNumber,
          replacedMaterialId: String(existing._id),
        });

        nextFileName = req.file.originalname;
        nextFileSize = req.file.size;
        nextFileType = req.file.mimetype;
        removeOldAsset = Boolean(existing.fileAssetId);
      }

      existing.branchId = cleanBranchId;
      existing.intakeId = cleanIntakeId;
      existing.batchId = cleanBatchId;
      existing.course = normalizedCourse;
      existing.weekNumber = parsedWeekNumber;
      existing.week = parsedWeekNumber;
      existing.title = cleanTitle;
      existing.description = String(description || '').trim();
      existing.content = cleanContent;
      existing.category = String(category || 'Study Material').trim() || 'Study Material';
      existing.fileAssetId = nextFileAssetId;
      existing.fileName = nextFileName || existing.fileName;
      existing.fileSize = nextFileSize;
      existing.fileType = nextFileType || existing.fileType;
      existing.fileUrl = existing.fileAssetId
        ? 'api/materials/student/download/content/pending'
        : existing.fileUrl;
      existing.isActive = existing.isActive !== false;

      await existing.save();

      if (req.file) {
        removeUploadedFile(req.file);
      }

      if (removeOldAsset) {
        await deleteFileAsset(previousFileAssetId);
      }

      await logAdminAction(req.adminAuth?.id, 'EDIT_MATERIALS', {
        materialId: existing._id,
        title: existing.title,
      });

      res.json({
        message: 'Material updated successfully',
        material: toAdminMaterialItem(existing.toObject()),
      });
    } catch (err) {
      if (req.file) {
        removeUploadedFile(req.file);

        if (nextFileAssetId && nextFileAssetId !== existing.fileAssetId) {
          await deleteFileAsset(nextFileAssetId);
        }
      }

      throw err;
    }
  } catch (err) {
    next(err);
  }
}

export async function deleteMaterial(req, res, next) {
  try {
    const { materialId } = req.params;

    const material = await Material.findByIdAndDelete(materialId).lean();

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    await deleteMaterialStoredFile(material);

    await logAdminAction(req.adminAuth?.id, 'DELETE_MATERIALS', {
      materialId,
      title: material.title,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function getStudentMaterials(req, res, next) {
  try {
    const studentId = req.auth?.sub;

    if (!studentId) {
      return res.status(401).json({
        message: 'Student authentication required',
      });
    }

    const student = await Student.findById(studentId).lean();

    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
      });
    }

    const effectiveCourse = canonicalCourse(req.auth?.course || student.course || '');

    if (!effectiveCourse) {
      return res.json({
        materials: [],
        materialsByWeek: [],
        message: 'Your course is not assigned. Please contact administration.',
      });
    }

    const materials = await Material.find({
      isActive: { $ne: false },
    })
      .sort({ weekNumber: 1, createdAt: -1 })
      .select(
        'title description fileName fileType fileSize createdAt category week module weekNumber course content downloadCount branchId intakeId batchId uploadedByName isActive'
      )
      .lean();

    const filteredMaterials = materials.filter((material) => {
      const materialCourse = canonicalCourse(material.course);
      return materialCourse === effectiveCourse;
    });

    const mapped = filteredMaterials.map((material) => ({
      id: material._id,
      _id: material._id,
      title: material.title,
      description: material.description || '',
      fileName: material.fileName,
      fileType: material.fileType,
      fileSize: material.fileSize || 0,
      uploadedAt: material.createdAt,
      createdAt: material.createdAt,
      uploadedBy: material.uploadedByName || 'Admin',
      category: material.category || 'Study Material',
      week: material.week,
      weekNumber: material.weekNumber,
      module: material.module,
      course: material.course || '',
      content: material.content || '',
      downloadCount: material.downloadCount || 0,
      branchId: material.branchId || '',
      intakeId: material.intakeId || '',
      batchId: material.batchId || '',
      branchName: material.branchId || '',
      intakeName: material.intakeId || '',
      batchName: material.batchId || '',
    }));

    const materialsByWeekMap = new Map();

    for (const item of mapped) {
      const key = Number(item.weekNumber) || 0;

      if (!materialsByWeekMap.has(key)) {
        materialsByWeekMap.set(key, []);
      }

      materialsByWeekMap.get(key).push(item);
    }

    const materialsByWeek = Array.from(materialsByWeekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([weekNumber, items]) => ({
        weekNumber,
        items,
      }));

    return res.json({
      materials: mapped,
      materialsByWeek,
      filters: {
        course: effectiveCourse,
      },
      debug: {
        totalMaterialsBeforeCourseFilter: materials.length,
        totalMaterialsAfterCourseFilter: mapped.length,
        studentId,
        course: effectiveCourse,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadMaterial(req, res, next) {
  try {
    const { materialId } = req.params;
    const studentId = req.auth?.sub;

    const resolved = await getAuthorizedStudentMaterial(materialId, studentId, req.auth || {});

    if (resolved.status) {
      return res.status(resolved.status).json(resolved.body);
    }

    const { material } = resolved;

    await Material.findByIdAndUpdate(materialId, {
      $inc: { downloadCount: 1 },
    });

    return res.json({
      downloadUrl: `/api/materials/student/download/${materialId}/content`,
      fileName: material.fileName,
      fileSize: material.fileSize,
    });
  } catch (err) {
    next(err);
  }
}

export async function streamStudentMaterialContent(req, res, next) {
  try {
    const { materialId } = req.params;

    const resolved = await getAuthorizedStudentMaterial(
      materialId,
      req.auth?.sub,
      req.auth || {}
    );

    if (resolved.status) {
      return res.status(resolved.status).json(resolved.body);
    }

    const { material } = resolved;

    if (material.fileAssetId) {
      const asset = await getFileAssetInfo(material.fileAssetId);

      if (!asset) {
        return res.status(404).json({
          message: 'Material file not found',
        });
      }

      const stream = openFileDownloadStream(material.fileAssetId);

      if (!stream) {
        return res.status(404).json({
          message: 'Material file not found',
        });
      }

      res.setHeader(
        'Content-Type',
        asset.contentType || material.fileType || 'application/octet-stream'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${material.fileName || asset.filename || 'material'}"`
      );

      stream.on('error', next);
      stream.pipe(res);
      return;
    }

    const absPath = path.resolve(material.fileUrl);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({
        message: 'Material file not found',
      });
    }

    res.download(absPath, material.fileName || path.basename(absPath));
  } catch (err) {
    next(err);
  }
}

export async function getAdminMaterials(req, res, next) {
  try {
    const { branchId, intakeId, batchId, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (branchId) filter.branchId = branchId;
    if (intakeId) filter.intakeId = intakeId;
    if (batchId) filter.batchId = batchId;

    const pageNum = Math.max(1, Number.parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit, 10)));

    const materials = await Material.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Material.countDocuments(filter);

    res.json({
      materials: materials.map(toAdminMaterialItem),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}