import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAdminRole } from '../middleware/adminAuth.js';
import { requireAuth, requireLecturer } from '../middleware/auth.js';
import {
  listMyHubItems,
  studentDownloadResource,
  streamHubImage,
  lecturerAddHubItem,
  lecturerDeleteHubItem,
  adminListHubItems,
  adminAddHubItem,
  adminDeleteHubItem,
} from '../controllers/knowledgehub.controller.js';

const hubStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/knowledgehub/'),
  filename: (req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `hub-${suffix}${path.extname(file.originalname)}`);
  },
});
const hubUpload = multer({
  storage: hubStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

export const knowledgeHubRouter      = Router();
export const knowledgeHubAdminRouter = Router();

// ─── Student + Lecturer routes ────────────────────────────────────────────────
knowledgeHubRouter.get('/', requireAuth, listMyHubItems);
knowledgeHubRouter.get('/download/:id', requireAuth, studentDownloadResource);
knowledgeHubRouter.get('/media/:id/:index', streamHubImage);

// ─── Lecturer-only routes ─────────────────────────────────────────────────────
knowledgeHubRouter.post('/lecturer', requireAuth, requireLecturer, hubUpload.single('file'), lecturerAddHubItem);
knowledgeHubRouter.delete('/lecturer/:id', requireAuth, requireLecturer, lecturerDeleteHubItem);

// ─── Admin routes (protected by requireAdmin on server.js level) ──────────────
knowledgeHubAdminRouter.get('/', adminListHubItems);
knowledgeHubAdminRouter.post(
  '/',
  requireAdminRole(['superadmin']),
  hubUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'images', maxCount: 6 },
  ]),
  adminAddHubItem
);
knowledgeHubAdminRouter.delete('/:id', requireAdminRole(['superadmin']), adminDeleteHubItem);
