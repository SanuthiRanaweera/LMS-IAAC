import { Router } from 'express';
import {
	changeLecturerPassword,
	forgotStudentPassword,
	getAuthMe,
	loginStudent,
	logoutStudent,
	registerStudent,
	resetStudentPassword,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', registerStudent);
authRouter.post('/login', loginStudent);
authRouter.post('/logout', logoutStudent);
authRouter.post('/forgot-password', forgotStudentPassword);
authRouter.post('/reset-password', resetStudentPassword);
authRouter.get('/me', requireAuth, getAuthMe);
authRouter.patch('/lecturer/change-password', requireAuth, changeLecturerPassword);
