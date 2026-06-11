import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Material, STUDY_MATERIAL_COURSES } from '../models/Material.js';
import { Student } from '../models/Student.js';
import { DEFAULT_LMS_DATA } from '../data/defaultLmsData.js';
import { getOrCreateAppDataPayload } from '../services/appData.service.js';
import { logAdminAction } from '../middleware/adminAuth.js';
import {
  deleteImageAsset,
  getImageAssetInfo,
  openImageDownloadStream,
  storeImageUpload,
} from '../services/imageStore.service.js';

function normalizeId(value) {
  if (value == null) return '';
  return String(value);
}

function normalizeName(value) {
  return typeof value === 'string' ? value : '';
}

function canonicalCourse(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return '';
  if (v === 'cabin crew') return 'Cabin Crew';
  if (v === 'ground operations' || v === 'ground ops') return 'Ground Operations';
  if (v === 'ticketing & reservations' || v === 'ticketing and reservations' || v === 'ticketing') {
    return 'Ticketing & Reservations';
  }
  if (v === 'air cargo') return 'Air Cargo';
  return String(value || '').trim();
}

function buildAbsoluteUrl(req, value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(String(value))) return String(value);
  return `${req.protocol}://${req.get('host')}/${String(value).replace(/^\/+/, '')}`;
}

function removeUploadedFile(file) {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
}

function toOption(node) {
  const id = normalizeId(node?.id || node?._id || node?.key || node?.code || node?.name);
  const name = normalizeName(node?.name || node?.title || node?.label);
  return { id, name };
}

function getFallbackBranches() {
  return Array.isArray(DEFAULT_LMS_DATA?.academics?.branches) ? DEFAULT_LMS_DATA.academics.branches : [];
}

async function loadAcademicBranches() {
  if (mongoose.connection.readyState !== 1) {
    return getFallbackBranches();
  }

  try {
    const payload = await getOrCreateAppDataPayload('academics', { branches: getFallbackBranches() });
    return Array.isArray(payload?.branches) ? payload.branches : getFallbackBranches();
  } catch {
    return getFallbackBranches();
  }
}

async function getAuthorizedStudentMaterial(materialId, studentId) {
  if (!studentId) {
    return { status: 401, body: { message: 'Student authentication required' } };
  }

  const student = await Student.findById(studentId).lean();
  if (!student) {
    return { status: 404, body: { message: 'Student not found' } };
  }

  const material = await Material.findOne({ _id: materialId, isActive: true }).lean();
  if (!material) {
    return { status: 404, body: { message: 'Material not found' } };
  }

  if (
    material.branchId !== student.branchId ||
    material.batchId !== student.batchId ||
    (material.course && canonicalCourse(material.course) !== canonicalCourse(student.course)) ||
    (material.intakeId && student.intakeId && material.intakeId !== student.intakeId)
  ) {
    return {
      status: 403,
      body: { message: 'Access denied. This material is not available for your enrollment.' },
    };
  }

  return { student, material };
}

// Validation helpers
function validateMaterialTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Material title is required' };
  }
  
  const trimmed = title.trim();
  
  if (trimmed.length < 5) {
    return { valid: false, error: 'Material title must be at least 5 characters long' };
  }
  
  // Check for generic placeholder names
  const invalidNames = [
    'file1', 'file2', 'file3', 'document', 'upload', 'material', 
    'test', 'example', 'sample', 'untitled', 'new', 'doc1', 'doc2'
  ];
  
  if (invalidNames.includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'Please provide a descriptive title. Generic names like "file1" or "document" are not allowed' };
  }
  
  // Check for proper format (Week N or Module N)
  const formatRegex = /^(Week|Module)\s+\d+\s*—\s*.+/i;
  if (!formatRegex.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Title should follow format "Week N — Topic Name" or "Module N — Topic Name". Example: "Week 4 — HTML Forms Notes"' 
    };
  }
  
  return { valid: true };
}

function validateUploadFields(body) {
  const { branchId, batchId, title, course, weekNumber } = body;
  const errors = [];
  
  if (!branchId?.trim()) {
    errors.push('Please select a branch');
  }
  
  if (!batchId?.trim()) {
    errors.push('Please select a batch');
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

// Get academic hierarchy for dropdowns
export async function getAcademicHierarchy(req, res, next) {
  try {
    const branches = await loadAcademicBranches();
    
    // Return the hierarchy structure for frontend dropdowns
    res.json({
      branches
    });
  } catch (err) {
    next(err);
  }
}

// Get branches for the first dropdown
export async function getBranches(req, res, next) {
  try {
    const branches = await loadAcademicBranches();
    
    res.json({ 
      branches: branches.map((b) => toOption(b)).filter((b) => b.id && b.name)
    });
  } catch (err) {
    next(err);
  }
}

// Get intakes for a specific branch
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
      intakes: intakes.map((i) => toOption(i)).filter((i) => i.id && i.name)
    });
  } catch (err) {
    next(err);
  }
}

// Get batches for a specific branch and intake
export async function getBatches(req, res, next) {
  try {
    const { branchId, intakeId } = req.params;
    
    if (!branchId || !intakeId) {
      return res.status(400).json({ message: 'Branch ID and Intake ID are required' });
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
    const resolvedBatches = batches.length > 0
      ? batches
      : [{ id: normalizeId(intake?.id || intake?.name), name: normalizeName(intake?.name || intake?.id), studentCount: 0 }];
    
    res.json({ 
      batches: resolvedBatches.map((b) => ({ ...toOption(b), studentCount: Number(b?.studentCount || 0) }))
    });
  } catch (err) {
    next(err);
  }
}

// Upload material (admin only)
export async function uploadMaterial(req, res, next) {
  try {
    const { branchId, intakeId, batchId, title, description, category, course, weekNumber, content } = req.body;
    const adminAuth = req.adminAuth;
    
    // Validate required fields
    const validationErrors = validateUploadFields(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Upload validation failed', 
        errors: validationErrors 
      });
    }
    
    // Allow either a file upload or link/text content.
    if (!req.file && !String(content || '').trim()) {
      return res.status(400).json({ message: 'Please upload a file or provide material content/link' });
    }
    
    // Extract week/module number from title for categorization
    const parsedWeekNumber = Number.parseInt(weekNumber, 10);
    const normalizedCourse = canonicalCourse(course);
    const moduleMatch = title.match(/Module\s+(\d+)/i);
    const isImageUpload = Boolean(req.file) && String(req.file.mimetype || '').startsWith('image/');
    let imageAssetId = '';
    
    try {
      if (isImageUpload) {
        imageAssetId = await storeImageUpload(req.file, {
          scope: 'materials',
          title: title.trim(),
          branchId: branchId.trim(),
          intakeId: intakeId?.trim() || '',
          batchId: batchId.trim(),
        });
      }

      // Create material record
      const material = new Material({
        branchId: branchId.trim(),
        intakeId: intakeId?.trim() || '',
        batchId: batchId.trim(),
        course: normalizedCourse,
        weekNumber: parsedWeekNumber,
        title: title.trim(),
        description: description?.trim() || '',
        content: String(content || '').trim(),
        fileName: req.file?.originalname || `${title.trim()}.link`,
        fileUrl: req.file
          ? (isImageUpload ? 'api/materials/student/download/content/pending' : (req.file.path || req.file.filename))
          : '',
        imageAssetId,
        fileSize: req.file?.size,
        fileType: req.file?.mimetype || 'text/link',
        uploadedBy: adminAuth.id,
        uploadedByName: adminAuth.name || 'Admin',
        category: category?.trim() || 'Study Material',
        week: parsedWeekNumber,
        module: moduleMatch ? parseInt(moduleMatch[1]) : null,
      });

      const saved = await material.save();
    
      // Log the action for audit trail
      await logAdminAction(adminAuth.id, 'UPLOAD_MATERIAL', {
        materialId: saved._id,
        title: title.trim(),
        branchId,
        batchId,
        intakeId: intakeId?.trim() || '',
        course: normalizedCourse,
        weekNumber: parsedWeekNumber,
        fileSize: req.file?.size || 0,
        storedInMongo: isImageUpload,
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
        }
      });
    } catch (err) {
      if (imageAssetId) {
        await deleteImageAsset(imageAssetId);
      }
      removeUploadedFile(req.file);
      throw err;
    }

    if (isImageUpload) {
      removeUploadedFile(req.file);
    }
    
  } catch (err) {
    next(err);
  }
}

// Get materials for students (filtered by their batch)
export async function getStudentMaterials(req, res, next) {
  try {
    const studentId = req.auth?.sub;
    if (!studentId) {
      return res.status(401).json({ message: 'Student authentication required' });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const effectiveBranchId = String(req.auth?.branchId || student.branchId || '').trim();
    const effectiveBatchId = String(req.auth?.batchId || student.batchId || '').trim();
    const effectiveCourse = canonicalCourse(req.auth?.course || student.course || '');

    if (!effectiveBranchId || !effectiveBatchId || !effectiveCourse) {
      return res.json({ 
        materials: [], 
        materialsByWeek: [],
        message: 'Your enrollment is incomplete (branch, batch, or course). Please contact administration.' 
      });
    }

    // Get academic hierarchy to resolve names
    const payload = await getOrCreateAppDataPayload('academics', { branches: [] });
    const branches = Array.isArray(payload?.branches) ? payload.branches : [];
    
    // Find the branch, intake, and batch names
    const branch = branches.find(b => b.id === effectiveBranchId);
    const intake = branch?.intakes?.find(i => i.id === student.intakeId);
    const batch = intake?.batches?.find(b => b.id === effectiveBatchId);
    
    const branchName = branch?.name || 'Unknown Branch';
    const intakeName = intake?.name || 'Unknown Intake';
    const batchName = batch?.name || 'Unknown Batch';
    
    // Get materials for student's batch
    const materials = await Material.find({
      branchId: effectiveBranchId,
      batchId: effectiveBatchId,
      course: effectiveCourse,
      isActive: true
    })
    .sort({ weekNumber: 1, createdAt: -1 })
    .select('title description fileName fileType fileSize createdAt category week module weekNumber course content downloadCount')
    .lean();

    const mapped = materials.map(material => ({
      id: material._id,
      title: material.title,
      description: material.description,
      fileName: material.fileName,
      fileType: material.fileType,
      fileSize: material.fileSize,
      uploadedAt: material.createdAt,
      category: material.category,
      week: material.week,
      weekNumber: material.weekNumber,
      module: material.module,
      course: material.course,
      content: material.content,
      downloadCount: material.downloadCount,
      branchName,
      intakeName,
      batchName,
      branchId: effectiveBranchId,
      intakeId: student.intakeId || '',
      batchId: effectiveBatchId,
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
      .map(([weekNumber, items]) => ({ weekNumber, items }));
    
    res.json({ 
      materials: mapped,
      materialsByWeek,
      filters: {
        branchId: effectiveBranchId,
        batchId: effectiveBatchId,
        course: effectiveCourse,
      },
    });
    
  } catch (err) {
    next(err);
  }
}

// Download material (students only see their batch materials)
export async function downloadMaterial(req, res, next) {
  try {
    const { materialId } = req.params;
    const studentId = req.auth?.sub;
    const resolved = await getAuthorizedStudentMaterial(materialId, studentId);
    if (resolved.status) {
      return res.status(resolved.status).json(resolved.body);
    }
    const { material } = resolved;
    
    // Increment download count
    await Material.findByIdAndUpdate(materialId, { 
      $inc: { downloadCount: 1 } 
    });
    
    res.json({
      downloadUrl: buildAbsoluteUrl(req, `api/materials/student/download/${materialId}/content`),
      fileName: material.fileName,
      fileSize: material.fileSize
    });
    
  } catch (err) {
    next(err);
  }
}

export async function streamStudentMaterialContent(req, res, next) {
  try {
    const { materialId } = req.params;
    const resolved = await getAuthorizedStudentMaterial(materialId, req.auth?.sub);
    if (resolved.status) {
      return res.status(resolved.status).json(resolved.body);
    }

    const { material } = resolved;

    if (material.imageAssetId) {
      const asset = await getImageAssetInfo(material.imageAssetId);
      if (!asset) {
        return res.status(404).json({ message: 'Material file not found' });
      }

      const stream = openImageDownloadStream(material.imageAssetId);
      if (!stream) {
        return res.status(404).json({ message: 'Material file not found' });
      }

      res.setHeader('Content-Type', asset.contentType || material.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${material.fileName || asset.filename || 'material'}"`);
      stream.on('error', next);
      stream.pipe(res);
      return;
    }

    const absPath = path.resolve(material.fileUrl);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ message: 'Material file not found' });
    }

    res.download(absPath, material.fileName || path.basename(absPath));
  } catch (err) {
    next(err);
  }
}

// Admin: Get all materials with filters
export async function getAdminMaterials(req, res, next) {
  try {
    const { branchId, intakeId, batchId, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (intakeId) filter.intakeId = intakeId;
    if (batchId) filter.batchId = batchId;
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    
    const materials = await Material.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();
    
    const total = await Material.countDocuments(filter);
    
    res.json({
      materials: materials.map(material => ({
        id: material._id,
        title: material.title,
        fileName: material.fileName,
        fileType: material.fileType,
        fileSize: material.fileSize,
        branchId: material.branchId,
        intakeId: material.intakeId,
        batchId: material.batchId,
        course: material.course || '',
        weekNumber: material.weekNumber || null,
        uploadedBy: material.uploadedByName,
        uploadedAt: material.createdAt,
        downloadCount: material.downloadCount,
        isActive: material.isActive
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (err) {
    next(err);
  }
}