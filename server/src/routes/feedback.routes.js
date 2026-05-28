import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getStudentFeedbackHistory,
  getStudentFeedbackStatus,
  listLecturerFeedbackReports,
  submitStudentFeedback,
} from '../controllers/feedback.controller.js';

export const feedbackRouter = Router();

// Student endpoints
feedbackRouter.get('/student/history', requireAuth, getStudentFeedbackHistory);
feedbackRouter.get('/student/status', requireAuth, getStudentFeedbackStatus);
feedbackRouter.post('/student', requireAuth, submitStudentFeedback);

// Lecturer endpoints (reports inbox only)
feedbackRouter.get('/lecturer/reports', requireAuth, listLecturerFeedbackReports);
