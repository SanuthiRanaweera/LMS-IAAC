import { Router } from 'express';

import {
  requireAuth,
  requireStudent,
} from '../middleware/auth.js';

import {
  getMyResults,
} from '../controllers/results.controller.js';

export const studentResultsRouter = Router();

studentResultsRouter.get(
  '/',
  requireAuth,
  requireStudent,
  getMyResults
);