import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Student } from '../models/Student.js';
import { Admin } from '../models/Admin.js';
import { Otp } from '../models/Otp.js';
import { clearAuthCookie, setAuthCookie, signAuthToken } from '../middleware/auth.js';
import { DEFAULT_LMS_DATA } from '../data/defaultLmsData.js';
import { getOrCreateAppDataPayload } from '../services/appData.service.js';

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function safeTrim(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function isValidEmail(email) {
  // Simple, pragmatic validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeId(value) {
  if (value == null) return '';
  return String(value);
}

function envBool(name) {
  const v = process.env[name];
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function makeOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function makeResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function appBaseUrl() {
  const v = process.env.APP_BASE_URL;
  return typeof v === 'string' && v.trim() ? v.trim().replace(/\/$/, '') : '';
}

async function maybeSendPasswordResetEmail({ toEmail, resetUrl }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  // If SMTP is not configured, just log the URL.
  if (!host || !from || !toEmail || !resetUrl) {
    if (resetUrl) console.log(`[password-reset] ${toEmail || '(unknown)'} -> ${resetUrl}`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to: toEmail,
      subject: 'Reset your IAAC Student Portal password',
      text: `You requested a password reset.\n\nReset link (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    });
  } catch (err) {
    console.log(`[password-reset] email send failed for ${toEmail}: ${err?.message || String(err)}`);
    console.log(`[password-reset] fallback URL: ${resetUrl}`);
  }
}

function mailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const smtpFrom = process.env.SMTP_FROM;
  const smtpService = String(process.env.SMTP_SERVICE || '').trim();
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (host) {
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      }),
      from: smtpFrom || user || adminEmail || '',
    };
  }

  if (smtpService && user && pass) {
    return {
      transporter: nodemailer.createTransport({
        service: smtpService,
        auth: { user, pass },
      }),
      from: smtpFrom || user,
    };
  }

  if (user && pass && /@gmail\.com$/i.test(user)) {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      }),
      from: smtpFrom || user,
    };
  }

  if (adminEmail && adminPassword && /@gmail\.com$/i.test(adminEmail)) {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: { user: adminEmail, pass: adminPassword },
      }),
      from: smtpFrom || adminEmail,
    };
  }

  return null;
}

async function sendBrandedOtpEmail({ toEmail, otp }) {
  const mailer = mailTransport();

  const subject = 'Your IAAC Aviation LMS verification code';
  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#003580;color:#fff;border-radius:24px 24px 0 0;padding:28px 32px;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.8;">IAAC Aviation LMS</div>
          <div style="font-size:30px;font-weight:700;margin-top:8px;line-height:1.2;">Verify your registration</div>
        </div>
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 24px 24px;padding:32px;">
          <p style="margin:0 0 16px;color:#0f172a;font-size:15px;line-height:1.7;">Use the one-time password below to complete your student account registration. This code expires in 10 minutes.</p>
          <div style="margin:28px 0;text-align:center;">
            <div style="display:inline-block;min-width:220px;padding:18px 24px;border-radius:18px;background:#eff6ff;border:1px solid #bfdbfe;color:#003580;font-size:34px;font-weight:800;letter-spacing:0.28em;">${otp}</div>
          </div>
          <p style="margin:0;color:#475569;font-size:13px;line-height:1.7;">If you did not request this registration, you can safely ignore this message.</p>
        </div>
      </div>
    </div>
  `;

  const text = `IAAC Aviation LMS verification code: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, ignore this email.`;

  if (!mailer?.transporter || !mailer?.from || !toEmail) {
    console.log('[registration-otp] Mailer is not configured correctly.');
    const err = new Error('Unable to send verification code right now. Please try again shortly.');
    err.status = 503;
    throw err;
  }

  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      to: toEmail,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.log(`[registration-otp] email send failed for ${toEmail}: ${err?.message || String(err)}`);
    const mailErr = new Error('Unable to send verification code right now. Please try again shortly.');
    mailErr.status = 503;
    throw mailErr;
  }
}

async function isEmailAlreadyRegistered(email) {
  const normalizedEmail = normalizeEmail(email);
  const [student, lecturer] = await Promise.all([
    Student.findOne({ email: normalizedEmail }).lean(),
    Admin.findOne({ email: normalizedEmail }).lean(),
  ]);
  return Boolean(student || lecturer);
}

function getStudentRegistrationFields(body = {}) {
  return {
    fullName: body.fullName,
    email: body.email,
    studentId: body.studentId,
    nic: body.nic,
    course: body.course,
    whatsappNumber: body.whatsappNumber,
    phoneNumber: body.phoneNumber,
    address: body.address,
    guardianName: body.guardianName,
    guardianPhoneNumber: body.guardianPhoneNumber,
    password: body.password,
    branchId: body.branchId,
    batchId: body.batchId,
    intakeId: body.intakeId,
    inviteToken: body.inviteToken,
  };
}

export async function sendRegistrationOtp(req, res, next) {
  try {
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    if (await isEmailAlreadyRegistered(normalizedEmail)) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const otp = makeOtp();

    await Otp.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: { otp, createdAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendBrandedOtpEmail({ toEmail: normalizedEmail, otp });
    } catch (mailErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `[registration-otp] dev fallback active for ${normalizedEmail}. Reason: ${mailErr?.message || String(mailErr)}`
        );
        return res.json({
          ok: true,
          emailSent: false,
          devOtp: otp,
          message: 'Email delivery is unavailable in local mode. Use the OTP shown in the response.',
        });
      }
      throw mailErr;
    }

    return res.json({ ok: true, emailSent: true, message: 'Verification code sent' });
  } catch (err) {
    next(err);
  }
}

export async function verifyAndRegisterStudent(req, res, next) {
  try {
    const { otp } = req.body || {};
    const studentData = getStudentRegistrationFields(req.body || {});
    const normalizedEmail = normalizeEmail(studentData.email);
    const enteredOtp = String(otp || '').trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    if (!/^[0-9]{6}$/.test(enteredOtp)) {
      return res.status(400).json({ message: 'Enter the 6-digit code sent to your email' });
    }
    if (!isNonEmptyString(studentData.fullName)) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    if (!isNonEmptyString(studentData.studentId)) {
      return res.status(400).json({ message: 'Student ID is required' });
    }
    if (!isNonEmptyString(studentData.password) || studentData.password.trim().length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const pendingOtp = await Otp.findOne({ email: normalizedEmail }).lean();
    if (!pendingOtp || pendingOtp.otp !== enteredOtp) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const existing = await Student.findOne({
      $or: [{ email: normalizedEmail }, { studentId: safeTrim(studentData.studentId) }],
    }).lean();

    if (existing) {
      await Otp.deleteOne({ email: normalizedEmail });
      return res.status(409).json({ message: 'Email or Student ID already exists' });
    }

    const passwordHash = await bcrypt.hash(studentData.password.trim(), 12);
    const wantsLegacyInvite = isNonEmptyString(studentData.inviteToken);
    const wantsBranchEnrollment = isNonEmptyString(studentData.branchId) || isNonEmptyString(studentData.batchId);

    let association = null;

    if (wantsLegacyInvite) {
      const invite = await resolveInvite(studentData.intakeId, studentData.inviteToken);
      if (invite?.error) {
        return res.status(400).json({ message: invite.error });
      }
      association = invite;
    } else if (wantsBranchEnrollment) {
      const enrollment = await resolveBranchEnrollment(studentData.branchId, studentData.intakeId, studentData.batchId);
      if (enrollment?.error) {
        return res.status(400).json({ message: enrollment.error });
      }
      association = enrollment;
    }

    const created = await Student.create({
      fullName: safeTrim(studentData.fullName),
      email: normalizedEmail,
      studentId: safeTrim(studentData.studentId),
      nic: safeTrim(studentData.nic),
      course: safeTrim(studentData.course),
      whatsappNumber: safeTrim(studentData.whatsappNumber),
      phoneNumber: safeTrim(studentData.phoneNumber),
      address: safeTrim(studentData.address),
      guardianName: safeTrim(studentData.guardianName),
      guardianPhoneNumber: safeTrim(studentData.guardianPhoneNumber),
      ...(association ? association : {}),
      passwordHash,
      createdBy: 'self',
    });

    await Otp.deleteOne({ email: normalizedEmail });

    const token = signAuthToken({ sub: String(created._id) });
    setAuthCookie(res, token);

    return res.status(201).json({ student: toMePayload(created) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Email or Student ID already exists' });
    }
    next(err);
  }
}

export { verifyAndRegisterStudent as registerStudent };

// Temporary no-OTP registration (controlled via DISABLE_OTP env var)
export async function registerWithoutOtp(req, res, next) {
  try {
    const studentData = getStudentRegistrationFields(req.body || {});
    const normalizedEmail = normalizeEmail(studentData.email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    if (!isNonEmptyString(studentData.fullName)) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    if (!isNonEmptyString(studentData.studentId)) {
      return res.status(400).json({ message: 'Student ID is required' });
    }
    if (!isNonEmptyString(studentData.password) || studentData.password.trim().length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await Student.findOne({
      $or: [{ email: normalizedEmail }, { studentId: safeTrim(studentData.studentId) }],
    }).lean();

    if (existing) {
      return res.status(409).json({ message: 'Email or Student ID already exists' });
    }

    const passwordHash = await bcrypt.hash(studentData.password.trim(), 12);
    const wantsLegacyInvite = isNonEmptyString(studentData.inviteToken);
    const wantsBranchEnrollment = isNonEmptyString(studentData.branchId) || isNonEmptyString(studentData.batchId);

    let association = null;

    if (wantsLegacyInvite) {
      const invite = await resolveInvite(studentData.intakeId, studentData.inviteToken);
      if (invite?.error) {
        return res.status(400).json({ message: invite.error });
      }
      association = invite;
    } else if (wantsBranchEnrollment) {
      const enrollment = await resolveBranchEnrollment(studentData.branchId, studentData.intakeId, studentData.batchId);
      if (enrollment?.error) {
        return res.status(400).json({ message: enrollment.error });
      }
      association = enrollment;
    }

    const created = await Student.create({
      fullName: safeTrim(studentData.fullName),
      email: normalizedEmail,
      studentId: safeTrim(studentData.studentId),
      nic: safeTrim(studentData.nic),
      course: safeTrim(studentData.course),
      whatsappNumber: safeTrim(studentData.whatsappNumber),
      phoneNumber: safeTrim(studentData.phoneNumber),
      address: safeTrim(studentData.address),
      guardianName: safeTrim(studentData.guardianName),
      guardianPhoneNumber: safeTrim(studentData.guardianPhoneNumber),
      ...(association ? association : {}),
      passwordHash,
      createdBy: 'self',
    });

    const token = signAuthToken({ sub: String(created._id) });
    setAuthCookie(res, token);

    return res.status(201).json({ student: toMePayload(created) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Email or Student ID already exists' });
    }
    next(err);
  }
}

async function resolveInvite(intakeId, inviteToken) {
  const safeIntakeId = normalizeId(intakeId).trim();
  const safeToken = typeof inviteToken === 'string' ? inviteToken.trim() : '';

  if (!safeIntakeId) return null;
  if (!safeToken) return { error: 'Missing invite token' };

  const payload = await getOrCreateAppDataPayload('academics', DEFAULT_LMS_DATA.academics);
  const academics = payload && typeof payload === 'object' ? payload : DEFAULT_LMS_DATA.academics;
  const faculties = Array.isArray(academics?.faculties) ? academics.faculties : [];

  for (const faculty of faculties) {
    const facultyId = normalizeId(faculty?.id || faculty?._id || faculty?.name);
    const programs = Array.isArray(faculty?.programs) ? faculty.programs : [];
    for (const program of programs) {
      const programId = normalizeId(program?.id || program?._id || program?.name);
      const intakes = Array.isArray(program?.intakes) ? program.intakes : [];
      for (const intake of intakes) {
        const foundIntakeId = normalizeId(intake?.id || intake?._id || intake?.name);
        if (foundIntakeId !== safeIntakeId) continue;
        const expected = typeof intake?.inviteToken === 'string' ? intake.inviteToken : '';
        if (expected && expected === safeToken) {
          return { facultyId, programId, intakeId: safeIntakeId };
        }
        return { error: 'Invalid batch link' };
      }
    }
  }

  return { error: 'Invalid batch link' };
}

async function resolveBranchEnrollment(branchId, intakeId, batchId) {
  const safeBranchId = normalizeId(branchId).trim();
  const safeIntakeId = normalizeId(intakeId).trim();
  const safeBatchId = normalizeId(batchId).trim();

  if (!safeBranchId || !safeIntakeId) {
    return { error: 'Branch and intake are required' };
  }

  const payload = await getOrCreateAppDataPayload('academics', { branches: [] });
  const branches = Array.isArray(payload?.branches) ? payload.branches : [];

  const normalizedBranchId = normalizeId(safeBranchId);
  const normalizedIntakeId = normalizeId(safeIntakeId);
  const normalizedBatchId = normalizeId(safeBatchId);

  const branch = branches.find(
    (b) => normalizeId(b?.id || b?._id || b?.key || b?.code || b?.name) === normalizedBranchId
  );
  if (!branch) return { error: 'Invalid registration link' };

  const intakes = Array.isArray(branch?.intakes) ? branch.intakes : [];
  const intake = intakes.find(
    (i) => normalizeId(i?.id || i?._id || i?.key || i?.code || i?.name) === normalizedIntakeId
  );
  if (!intake) return { error: 'Invalid registration link' };

  if (safeBatchId) {
    const batches = Array.isArray(intake?.batches) ? intake.batches : [];
    const batch = batches.find(
      (b) => normalizeId(b?.id || b?._id || b?.key || b?.code || b?.name) === normalizedBatchId
    );
    if (!batch) return { error: 'Invalid registration link' };
    return { branchId: safeBranchId, intakeId: safeIntakeId, batchId: safeBatchId };
  }

  return { branchId: safeBranchId, intakeId: safeIntakeId };
}

function toMePayload(student) {
  const fullName = student.fullName;
  const firstName = fullName.split(' ')[0] || fullName;

  return {
    id: String(student._id),
    name: fullName,
    firstName,
    email: student.email,
    studentId: student.studentId,
    nic: student.nic,
    course: student.course,
    whatsappNumber: student.whatsappNumber,
    phoneNumber: student.phoneNumber,
    address: student.address,
    guardianName: student.guardianName,
    guardianPhoneNumber: student.guardianPhoneNumber,

    branchId: student.branchId,
    batchId: student.batchId,

    facultyId: student.facultyId,
    programId: student.programId,
    intakeId: student.intakeId,
  };
}

function toLecturerPayload(lecturer) {
  return {
    id: String(lecturer._id),
    name: lecturer.name,
    email: lecturer.email,
    branchId: lecturer.branchId || '',
    subject: lecturer.subject || '',
    role: 'lecturer',
  };
}

export async function loginStudent(req, res, next) {
  try {
    const { identifier, password } = req.body || {};

    if (!isNonEmptyString(identifier) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const id = identifier.trim();
    const normalizedEmail = normalizeEmail(id);

    // --- Check student first ---
    const student = await Student.findOne({
      $or: [{ email: normalizedEmail }, { studentId: id }],
    });

    if (student) {
      const ok = await bcrypt.compare(password.trim(), student.passwordHash);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

      const token = signAuthToken({ sub: String(student._id), role: 'student' });
      setAuthCookie(res, token);
      return res.json({ student: toMePayload(student) });
    }

    // --- Check lecturer ---
    const lecturer = await Admin.findOne({ email: normalizedEmail, role: 'lecturer' });

    if (lecturer) {
      const ok = await bcrypt.compare(password.trim(), lecturer.passwordHash);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

      const token = signAuthToken({ sub: String(lecturer._id), role: 'lecturer' });
      setAuthCookie(res, token);
      return res.json({
        lecturer: toLecturerPayload(lecturer),
        mustChangePassword: lecturer.mustChangePassword === true,
      });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (err) {
    next(err);
  }
}

export async function forgotStudentPassword(req, res, next) {
  try {
    const { identifier } = req.body || {};
    const id = safeTrim(identifier);
    const normalizedEmail = normalizeEmail(id);

    // Always respond 200 to avoid account enumeration.
    if (!id) return res.json({ ok: true });

    const student = await Student.findOne({
      $or: [{ email: normalizedEmail }, { studentId: id }],
    });

    if (!student) {
      return res.json({ ok: true });
    }

    const token = makeResetToken();
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    student.resetPasswordTokenHash = tokenHash;
    student.resetPasswordTokenExpiresAt = expiresAt;
    await student.save();

    const base = appBaseUrl();
    const resetUrl = base ? `${base}/reset-password?token=${encodeURIComponent(token)}` : '';
    await maybeSendPasswordResetEmail({ toEmail: student.email, resetUrl });

    const includeToken = envBool('PASSWORD_RESET_RETURN_TOKEN') || process.env.NODE_ENV !== 'production';
    if (includeToken) {
      return res.json({ ok: true, token, resetUrl });
    }

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function resetStudentPassword(req, res, next) {
  try {
    const { token, password } = req.body || {};
    const safeToken = safeTrim(token);
    const safePassword = safeTrim(password);

    if (!safeToken) return res.status(400).json({ message: 'Reset token is required' });
    if (!safePassword || safePassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const tokenHash = sha256Hex(safeToken);
    const student = await Student.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordTokenExpiresAt: { $gt: new Date() },
    });

    if (!student) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    student.passwordHash = await bcrypt.hash(safePassword, 12);
    student.resetPasswordTokenHash = undefined;
    student.resetPasswordTokenExpiresAt = undefined;
    await student.save();

    // Auto sign-in after reset for better UX.
    const authToken = signAuthToken({ sub: String(student._id), role: 'student' });
    setAuthCookie(res, authToken);
    return res.json({ student: toMePayload(student) });
  } catch (err) {
    next(err);
  }
}

export async function logoutStudent(req, res, next) {
  try {
    clearAuthCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function getAuthMe(req, res, next) {
  try {
    const id = req.auth?.sub;
    const role = req.auth?.role;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    if (role === 'lecturer') {
      const lecturer = await Admin.findById(id).lean();
      if (!lecturer || lecturer.role !== 'lecturer') {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      return res.json({ ...toLecturerPayload(lecturer), role: 'lecturer' });
    }

    const student = await Student.findById(id).lean();
    if (!student) return res.status(401).json({ message: 'Unauthorized' });

    res.json(toMePayload(student));
  } catch (err) {
    next(err);
  }
}

export async function verifyMailTransport(req, res, next) {
  try {
    const mailer = mailTransport();
    if (!mailer || !mailer.transporter) {
      return res.status(200).json({
        ok: false,
        configured: false,
        message:
          'Mail transport is not configured. Set SMTP_SERVICE/SMTP_HOST and SMTP_USER/SMTP_PASS (use Gmail App Password for Gmail accounts).',
      });
    }

    try {
      // transporter.verify() returns a Promise on modern Node/Nodemailer setups
      await mailer.transporter.verify();
      return res.json({ ok: true, configured: true, from: mailer.from || '' });
    } catch (err) {
      console.log('[mail-status] transporter.verify failed:', err?.message || String(err));
      return res.status(200).json({
        ok: false,
        configured: true,
        message:
          'Mail transporter is configured but verification failed. Check SMTP_USER/SMTP_PASS (use Gmail App Password if using Gmail).',
      });
    }
  } catch (err) {
    next(err);
  }
}

export async function updateAuthMe(req, res, next) {
  try {
    const id = req.auth?.sub;
    const role = req.auth?.role;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    // For now only student self-profile update is supported.
    if (role === 'lecturer') return res.status(403).json({ message: 'Forbidden' });

    const student = await Student.findById(id);
    if (!student) return res.status(401).json({ message: 'Unauthorized' });

    const { email, phoneNumber } = req.body || {};

    const update = {};

    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: 'Valid email is required' });
      }

      const existing = await Student.findOne({ email: normalizedEmail, _id: { $ne: id } }).lean();
      if (existing) return res.status(409).json({ message: 'Email already exists' });

      update.email = normalizedEmail;
    }

    if (phoneNumber !== undefined) {
      update.phoneNumber = safeTrim(phoneNumber);
    }

    if (Object.keys(update).length === 0) {
      return res.json(toMePayload(student));
    }

    Object.assign(student, update);
    await student.save();

    return res.json(toMePayload(student));
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    next(err);
  }
}

export async function changeStudentPassword(req, res, next) {
  try {
    const id = req.auth?.sub;
    const role = req.auth?.role;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    // Students only
    if (role === 'lecturer') return res.status(403).json({ message: 'Forbidden' });

    const { oldPassword, newPassword } = req.body || {};
    if (!isNonEmptyString(oldPassword)) {
      return res.status(400).json({ message: 'Old password is required' });
    }
    if (!isNonEmptyString(newPassword) || newPassword.trim().length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const student = await Student.findById(id);
    if (!student) return res.status(401).json({ message: 'Unauthorized' });

    const ok = await bcrypt.compare(oldPassword, student.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Old password is incorrect' });

    student.passwordHash = await bcrypt.hash(newPassword.trim(), 12);
    await student.save();

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function changeLecturerPassword(req, res, next) {
  try {
    const id = req.auth?.sub;
    const role = req.auth?.role;
    if (!id || role !== 'lecturer') return res.status(403).json({ message: 'Forbidden' });

    const { newPassword } = req.body || {};
    if (!isNonEmptyString(newPassword) || newPassword.trim().length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword.trim(), 12);
    await Admin.findByIdAndUpdate(id, { passwordHash, mustChangePassword: false });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
