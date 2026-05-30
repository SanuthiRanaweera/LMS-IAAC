import { Router } from 'express';
import {
	changeLecturerPassword,
	changeStudentPassword,
	forgotStudentPassword,
	getAuthMe,
	updateAuthMe,
	loginStudent,
	logoutStudent,
	sendRegistrationOtp,
	verifyAndRegisterStudent,
	registerWithoutOtp,
	verifyMailTransport,
	resetStudentPassword,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/send-otp', sendRegistrationOtp);
authRouter.post('/verify-and-register', verifyAndRegisterStudent);
// POST /register uses no-OTP flow when DISABLE_OTP=true in env (temporary)
const registerHandler = (process.env.DISABLE_OTP === '1' || String(process.env.DISABLE_OTP || '').toLowerCase() === 'true')
	? registerWithoutOtp
	: verifyAndRegisterStudent;
authRouter.post('/register', registerHandler);
authRouter.get('/mail-status', verifyMailTransport);
authRouter.post('/login', loginStudent);
authRouter.post('/logout', logoutStudent);
authRouter.post('/forgot-password', forgotStudentPassword);
authRouter.post('/reset-password', resetStudentPassword);
authRouter.get('/me', requireAuth, getAuthMe);
authRouter.patch('/me', requireAuth, updateAuthMe);
authRouter.patch('/change-password', requireAuth, changeStudentPassword);
authRouter.patch('/lecturer/change-password', requireAuth, changeLecturerPassword);
