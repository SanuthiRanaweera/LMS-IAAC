import { Router } from 'express';
import { requireAdmin, requireAdminRole } from '../middleware/adminAuth.js';
import {
  adminFlagFeedback,
  adminGetBadWords,
  adminListFeedback,
  adminModerationLog,
  adminRemoveFeedback,
  adminSendWeeklyReport,
  adminSetBadWords,
} from '../controllers/adminFeedback.controller.js';

export const adminFeedbackRouter = Router();

// Super Admin only.
adminFeedbackRouter.use(requireAdmin);
adminFeedbackRouter.use(requireAdminRole('superadmin'));

adminFeedbackRouter.get('/', adminListFeedback);
adminFeedbackRouter.patch('/:id/flag', adminFlagFeedback);
adminFeedbackRouter.delete('/:id', adminRemoveFeedback);

adminFeedbackRouter.get('/moderation/log', adminModerationLog);

adminFeedbackRouter.get('/bad-words', adminGetBadWords);
adminFeedbackRouter.put('/bad-words', adminSetBadWords);

adminFeedbackRouter.post('/reports', adminSendWeeklyReport);
