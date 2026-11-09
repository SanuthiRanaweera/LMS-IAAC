import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getLecturerById,
  getLecturerDashboardOverview,
  getLecturerStudents,
  listLecturers,
  registerLecturerPublic,
  updateLecturerProfile,
  validateInvitationToken,
} from '../controllers/lecturers.controller.js';

export const lecturersRouter = Router();

/* =========================================================
   PUBLIC REGISTRATION & TOKEN VALIDATION
========================================================= */

// Validate registration invitation token
lecturersRouter.get('/invitations/validate', validateInvitationToken);

// Self-register with invitation token
lecturersRouter.post('/register', registerLecturerPublic);

/* =========================================================
   LECTURER PORTAL (AUTHENTICATED LECTURER)
   NOTE: Keep before /:id route
========================================================= */

lecturersRouter.get('/me/dashboard', requireAuth, getLecturerDashboardOverview);
lecturersRouter.get('/me/students', requireAuth, getLecturerStudents);
lecturersRouter.put('/me/profile', requireAuth, updateLecturerProfile);

/* =========================================================
   STUDENT VIEW: LIST ACTIVE LECTURERS & GET BY ID
========================================================= */

// Student-only enforced in controller to avoid role assumptions
lecturersRouter.get('/', requireAuth, listLecturers);
lecturersRouter.get('/:id', requireAuth, getLecturerById);
