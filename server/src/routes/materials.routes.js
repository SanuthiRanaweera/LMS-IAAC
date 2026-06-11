import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requirePermission } from '../middleware/adminAuth.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getAcademicHierarchy,
  getBranches,
  getIntakes,
  getBatches,
  uploadMaterial,
  getStudentMaterials,
  downloadMaterial,
  streamStudentMaterialContent,
  getAdminMaterials,
} from '../controllers/materials.controller.js';

export const materialsRouter = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // You can customize this path
    cb(null, 'uploads/materials/');
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `material-${uniqueSuffix}${extension}`);
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    'video/mp4',
    'video/avi',
    'video/mov',
    'application/zip',
    'application/x-rar-compressed',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Please upload PDF, DOCX, PPTX, MP4, ZIP, or image files.`), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Academic hierarchy endpoints (for dropdowns)
materialsRouter.get('/hierarchy', getBranches); // Get all branches
materialsRouter.get('/hierarchy/full', getAcademicHierarchy); // Get full hierarchy
materialsRouter.get('/branches/:branchId/intakes', getIntakes); // Get intakes for branch
materialsRouter.get('/branches/:branchId/intakes/:intakeId/batches', getBatches); // Get batches for intake

// Admin endpoints (require appropriate permissions)
materialsRouter.post(
  '/upload', 
  requirePermission('ADD_MATERIALS'),
  upload.single('file'),
  uploadMaterial
);

materialsRouter.get(
  '/admin',
  requirePermission('VIEW_STUDENTS'), // Admins who can view students can also view materials
  getAdminMaterials
);

// Student endpoints (require student auth)
materialsRouter.get('/student', requireAuth, getStudentMaterials);
materialsRouter.get('/student/download/:materialId', requireAuth, downloadMaterial);
materialsRouter.get('/student/download/:materialId/content', requireAuth, streamStudentMaterialContent);

export default materialsRouter;