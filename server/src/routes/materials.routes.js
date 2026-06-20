import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAdmin, requirePermission } from '../middleware/adminAuth.js';
import { requireAuth, requireStudent } from '../middleware/auth.js';
import {
  getAcademicHierarchy,
  getBranches,
  getIntakes,
  getBatches,
  uploadMaterial,
  updateMaterial,
  deleteMaterial,
  getStudentMaterials,
  downloadMaterial,
  streamStudentMaterialContent,
  getAdminMaterials,
} from '../controllers/materials.controller.js';

export const materialsRouter = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/materials/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `material-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/mov',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(
    new Error(
      `File type ${file.mimetype} not allowed. Please upload PDF, DOCX, PPTX, MP4, ZIP, or image files.`
    ),
    false
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

/*
  Academic hierarchy endpoints

  If mounted as app.use('/api/materials', materialsRouter):
  GET /api/materials/hierarchy
  GET /api/materials/hierarchy/full
  GET /api/materials/branches/:branchId/intakes
  GET /api/materials/branches/:branchId/intakes/:intakeId/batches
*/
materialsRouter.get('/hierarchy', getBranches);
materialsRouter.get('/hierarchy/full', getAcademicHierarchy);
materialsRouter.get('/branches/:branchId/intakes', getIntakes);
materialsRouter.get('/branches/:branchId/intakes/:intakeId/batches', getBatches);

/*
  Admin endpoints

  POST   /api/materials/upload
  GET    /api/materials/admin
  PUT    /api/materials/admin/:materialId
  DELETE /api/materials/admin/:materialId
*/
materialsRouter.post(
  '/upload',
  requireAdmin,
  requirePermission('ADD_MATERIALS'),
  upload.single('file'),
  uploadMaterial
);

materialsRouter.get(
  '/admin',
  requireAdmin,
  requirePermission('VIEW_STUDENTS'),
  getAdminMaterials
);

materialsRouter.put(
  '/admin/:materialId',
  requireAdmin,
  requirePermission('EDIT_MATERIALS'),
  upload.single('file'),
  updateMaterial
);

materialsRouter.delete(
  '/admin/:materialId',
  requireAdmin,
  requirePermission('DELETE_MATERIALS'),
  deleteMaterial
);

/*
  Student endpoints

  GET /api/materials/student
  GET /api/materials/student/download/:materialId
  GET /api/materials/student/download/:materialId/content
*/
materialsRouter.get(
  '/student',
  requireAuth,
  requireStudent,
  getStudentMaterials
);

materialsRouter.get(
  '/student/download/:materialId',
  requireAuth,
  requireStudent,
  downloadMaterial
);

materialsRouter.get(
  '/student/download/:materialId/content',
  requireAuth,
  requireStudent,
  streamStudentMaterialContent
);

export default materialsRouter;