import { Router } from 'express';
import { requireAdmin, requireAdminRole } from '../middleware/adminAuth.js';
import {
  adminCreateFeedbackRequest,
  adminListFeedbackRequests,
  adminUpdateFeedbackRequestStatus,
  adminGetFeedbackStats,
  adminGetAcademicOptions,
  adminGenerateFeedbackSummary,
  adminGetFeedbackSummary,
  adminUpdateFeedbackSummary,
  adminApproveFeedbackSummary,
  adminSendFeedbackSummary,
  adminFlagFeedback,
  adminGetBadWords,
  adminListFeedback,
  adminModerationLog,
  adminRemoveFeedback,
  adminSendWeeklyReport,
  adminSetBadWords,
} from '../controllers/adminFeedback.controller.js';

export const adminFeedbackRouter = Router();

// Both Super Admin and Staff Admin can access (with branch restrictions applied in controller)
adminFeedbackRouter.use(requireAdmin);

// Dashboard KPI stats
adminFeedbackRouter.get('/stats', adminGetFeedbackStats);

// Academic hierarchy options (Branch, Intake, Batch, Module)
adminFeedbackRouter.get('/academic-options', adminGetAcademicOptions);

// Feedback Request endpoints
adminFeedbackRouter.post('/requests', adminCreateFeedbackRequest);
adminFeedbackRouter.get('/requests', adminListFeedbackRequests);
adminFeedbackRouter.patch('/requests/:id/status', adminUpdateFeedbackRequestStatus);

// Feedback Summary generation, approval & delivery
adminFeedbackRouter.post('/summaries/generate', adminGenerateFeedbackSummary);
adminFeedbackRouter.get('/summaries/:id', adminGetFeedbackSummary);
adminFeedbackRouter.put('/summaries/:id', adminUpdateFeedbackSummary);
adminFeedbackRouter.patch('/summaries/:id/approve', adminApproveFeedbackSummary);
adminFeedbackRouter.post('/summaries/:id/send', adminSendFeedbackSummary);

// Submissions listing & moderation
adminFeedbackRouter.get('/', adminListFeedback);
adminFeedbackRouter.patch('/:id/flag', adminFlagFeedback);
adminFeedbackRouter.delete('/:id', adminRemoveFeedback);
adminFeedbackRouter.get('/moderation/log', adminModerationLog);

// Moderation dictionary (Super Admin only)
adminFeedbackRouter.get('/bad-words', requireAdminRole('superadmin'), adminGetBadWords);
adminFeedbackRouter.put('/bad-words', requireAdminRole('superadmin'), adminSetBadWords);

// Legacy report generation endpoint
adminFeedbackRouter.post('/reports', adminSendWeeklyReport);
