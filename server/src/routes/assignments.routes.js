import { Router } from 'express';
import multer from 'multer';
import {
  createAssignment,
  getStudentAssignments,
  listAdminAssignments,
  submitAssignment,
} from '../controllers/assignments.controller.js';
import { requirePermission } from '../middleware/adminAuth.js';
import { requireAuth, requireStudent } from '../middleware/auth.js';

const referenceFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error('Reference document must be a PDF, Word, PowerPoint, or image file.'), false);
};

const adminUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: referenceFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const studentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const adminAssignmentsRouter = Router();
export const studentAssignmentsRouter = Router();

adminAssignmentsRouter.get('/', requirePermission('VIEW_ASSIGNMENTS'), listAdminAssignments);
adminAssignmentsRouter.post(
  '/',
  requirePermission('ADD_ASSIGNMENTS'),
  adminUpload.single('referenceDocument'),
  createAssignment
);

studentAssignmentsRouter.get('/', requireAuth, requireStudent, getStudentAssignments);
studentAssignmentsRouter.post(
  '/submit',
  requireAuth,
  requireStudent,
  studentUpload.single('file'),
  submitAssignment
);