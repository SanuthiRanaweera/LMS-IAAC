import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth, requireStudent } from '../middleware/auth.js';
import { requireAdmin, requirePermission } from '../middleware/adminAuth.js';
import { getStudentMaterials, uploadMaterial } from '../controllers/materials.controller.js';

export const studyMaterialsRouter = Router();

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
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/msword',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error(`File type ${file.mimetype} is not allowed`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});

studyMaterialsRouter.post(
  '/admin/materials',
  requireAdmin,
  requirePermission('ADD_MATERIALS'),
  upload.single('file'),
  uploadMaterial
);

studyMaterialsRouter.get('/student/materials', requireAuth, requireStudent, getStudentMaterials);
