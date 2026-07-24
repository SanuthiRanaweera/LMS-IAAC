import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireStudent } from '../middleware/auth.js';
import { requireAdmin, requirePermission } from '../middleware/adminAuth.js';
import { getStudentMaterials, uploadMaterial } from '../controllers/materials.controller.js';

export const studyMaterialsRouter = Router();

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
  storage: multer.memoryStorage(),
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
