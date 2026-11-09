import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getAvailableStudentFeedbackRequests,
  submitStudentFeedbackRequest,
  getLecturerFeedbackSummaries,
  getLecturerFeedbackSummaryById,
  getStudentFeedbackHistory,
  getStudentFeedbackStatus,
  listLecturerFeedbackReports,
  submitStudentFeedback,
} from '../controllers/feedback.controller.js';

export const feedbackRouter = Router();

/* =========================================================
   STUDENT FEEDBACK ENDPOINTS
========================================================= */

// Available weekly feedback requests for student's batch
feedbackRouter.get('/student/available', requireAuth, getAvailableStudentFeedbackRequests);

// Submit structured 5-category feedback + comments
feedbackRouter.post('/student/submit-request', requireAuth, submitStudentFeedbackRequest);

// Student feedback history
feedbackRouter.get('/student/history', requireAuth, getStudentFeedbackHistory);

// Status check for specific lecturer (legacy)
feedbackRouter.get('/student/status', requireAuth, getStudentFeedbackStatus);

// Legacy single-rating submission
feedbackRouter.post('/student', requireAuth, submitStudentFeedback);

/* =========================================================
   LECTURER FEEDBACK PORTAL (STRICT DATA ISOLATION)
========================================================= */

// Approved & shared feedback summaries for logged-in lecturer
feedbackRouter.get('/lecturer/my-feedback', requireAuth, getLecturerFeedbackSummaries);

// Specific authorized summary detail
feedbackRouter.get('/lecturer/my-feedback/:summaryId', requireAuth, getLecturerFeedbackSummaryById);

// Legacy reports inbox
feedbackRouter.get('/lecturer/reports', requireAuth, listLecturerFeedbackReports);
