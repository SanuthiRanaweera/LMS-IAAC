import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getLecturerById, listLecturers } from '../controllers/lecturers.controller.js';

export const lecturersRouter = Router();

// Student-only enforced in controller to avoid role assumptions.
lecturersRouter.get('/', requireAuth, listLecturers);
lecturersRouter.get('/:id', requireAuth, getLecturerById);
