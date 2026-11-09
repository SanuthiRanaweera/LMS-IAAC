import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Admin } from '../models/Admin.js';
import { Student } from '../models/Student.js';
import { LecturerInvitation } from '../models/LecturerInvitation.js';
import { Schedule } from '../models/Schedule.js';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { Result } from '../models/Result.js';
import { Material } from '../models/Material.js';
import { logAdminAction } from '../middleware/adminAuth.js';
import {
  createLecturerAccount,
  normalizeEmail,
  isValidEmail,
  safeTrim,
} from '../services/lecturerAccount.service.js';

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ''));
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
}

function toLecturerListItem(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    subject: doc.subject || '',
    branchId: doc.branchId || '',
    accountStatus: doc.accountStatus || 'Active',
  };
}

function toAdminLecturerPayload(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role || 'lecturer',
    branchId: doc.branchId || '',
    intakeId: doc.intakeId || '',
    batchId: doc.batchId || '',
    subject: doc.subject || '',
    accountStatus: doc.accountStatus || 'Active',
    registrationMethod: doc.registrationMethod || 'super_admin',
    canUpdateResults: Boolean(doc.canUpdateResults),
    mustChangePassword: Boolean(doc.mustChangePassword),
    invitationId: doc.invitationId ? String(doc.invitationId) : null,
    approvedAt: doc.approvedAt || null,
    approvedBy: doc.approvedBy ? String(doc.approvedBy) : null,
    rejectionReason: doc.rejectionReason || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toInvitationPayload(doc) {
  const isExpired = new Date() > new Date(doc.expiresAt);
  const effectiveStatus =
    doc.status === 'Revoked'
      ? 'Revoked'
      : doc.usedCount >= doc.maxUses
      ? 'Used'
      : isExpired
      ? 'Expired'
      : doc.status || 'Active';

  return {
    id: String(doc._id),
    linkName: doc.linkName,
    tokenPrefix: doc.tokenPrefix || '',
    maxUses: doc.maxUses,
    usedCount: doc.usedCount || 0,
    remainingUses: Math.max(0, doc.maxUses - (doc.usedCount || 0)),
    expiresAt: doc.expiresAt,
    status: effectiveStatus,
    createdByName: doc.createdByName || 'Super Admin',
    createdAt: doc.createdAt,
    revokedAt: doc.revokedAt || null,
    registeredCount: Array.isArray(doc.registeredLecturers) ? doc.registeredLecturers.length : 0,
  };
}

/* =========================================================
   PUBLIC: VALIDATE REGISTRATION INVITATION
========================================================= */

export async function validateInvitationToken(req, res, next) {
  try {
    const rawToken = safeTrim(req.query.token);
    if (!rawToken) {
      return res.status(400).json({
        valid: false,
        message: 'A valid registration invitation token is required to register as a lecturer.',
      });
    }

    const tokenHash = hashToken(rawToken);
    const invitation = await LecturerInvitation.findOne({ tokenHash });

    if (!invitation) {
      return res.status(404).json({
        valid: false,
        message: 'This registration link is invalid or no longer available.',
      });
    }

    if (invitation.status === 'Revoked') {
      return res.status(400).json({
        valid: false,
        message: 'This registration link has been revoked by the administrator.',
      });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      if (invitation.status === 'Active') {
        invitation.status = 'Expired';
        await invitation.save();
      }
      return res.status(400).json({
        valid: false,
        message: 'This registration link has expired. Please contact the administrator.',
      });
    }

    if (invitation.usedCount >= invitation.maxUses) {
      if (invitation.status === 'Active') {
        invitation.status = 'Used';
        await invitation.save();
      }
      return res.status(400).json({
        valid: false,
        message: 'This registration link has reached its maximum permitted usage limit.',
      });
    }

    return res.json({
      valid: true,
      linkName: invitation.linkName,
      expiresAt: invitation.expiresAt,
      remainingUses: Math.max(0, invitation.maxUses - invitation.usedCount),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   PUBLIC: LECTURER SELF-REGISTRATION (INVITATION LINK)
========================================================= */

export async function registerLecturerPublic(req, res, next) {
  try {
    const { token, fullName, email, password, confirmPassword } = req.body || {};

    const cleanToken = safeTrim(token);
    if (!cleanToken) {
      return res.status(400).json({
        message: 'A valid invitation token is required for lecturer self-registration.',
      });
    }

    const cleanName = safeTrim(fullName);
    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ message: 'Please enter your full name.' });
    }

    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (typeof password !== 'string' || password.trim().length < 8) {
      return res.status(400).json({
        message: 'Your password does not meet the minimum security requirements (at least 8 characters).',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // Verify invitation validity
    const tokenHash = hashToken(cleanToken);
    const invitation = await LecturerInvitation.findOne({ tokenHash });

    if (!invitation) {
      return res.status(404).json({
        message: 'This registration link is invalid or no longer available.',
      });
    }

    if (invitation.status === 'Revoked') {
      return res.status(400).json({
        message: 'This registration link has been revoked by the administrator.',
      });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      if (invitation.status === 'Active') {
        invitation.status = 'Expired';
        await invitation.save();
      }
      return res.status(400).json({
        message: 'This registration link has expired. Please contact the administrator.',
      });
    }

    if (invitation.usedCount >= invitation.maxUses) {
      if (invitation.status === 'Active') {
        invitation.status = 'Used';
        await invitation.save();
      }
      return res.status(400).json({
        message: 'This registration link has reached its maximum permitted usage limit.',
      });
    }

    // Create lecturer using shared service
    const lecturer = await createLecturerAccount({
      name: cleanName,
      email: cleanEmail,
      password,
      registrationMethod: 'self_registration',
      accountStatus: 'Pending Approval',
      mustChangePassword: false,
      invitationId: invitation._id,
    });

    // Increment invitation usage
    invitation.usedCount = (invitation.usedCount || 0) + 1;
    invitation.registeredLecturers.push({
      lecturerId: lecturer._id,
      name: lecturer.name,
      email: lecturer.email,
      registeredAt: new Date(),
    });

    if (invitation.usedCount >= invitation.maxUses) {
      invitation.status = 'Used';
    }
    await invitation.save();

    return res.status(201).json({
      success: true,
      message:
        'Lecturer account registered successfully. Your account is pending Super Admin approval before you can access the LMS.',
      lecturer: {
        id: String(lecturer._id),
        name: lecturer.name,
        email: lecturer.email,
        accountStatus: lecturer.accountStatus,
        registrationMethod: lecturer.registrationMethod,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email address already exists.' });
    }
    next(err);
  }
}

/* =========================================================
   SUPER ADMIN: LIST LECTURERS (WITH STATS & FILTERS)
========================================================= */

export async function listAdminLecturers(req, res, next) {
  try {
    const { search, registrationMethod, accountStatus, branchId } = req.query || {};

    const query = { role: 'lecturer' };

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
      ];
    }

    if (registrationMethod && registrationMethod !== 'ALL') {
      query.registrationMethod = registrationMethod;
    }

    if (accountStatus && accountStatus !== 'ALL') {
      if (accountStatus === 'Active') {
        query.$or = [{ accountStatus: 'Active' }, { accountStatus: { $exists: false } }];
      } else {
        query.accountStatus = accountStatus;
      }
    }

    if (branchId && branchId.trim()) {
      query.branchId = branchId.trim();
    }

    const items = await Admin.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Summary statistics across all lecturers
    const allLecturers = await Admin.find({ role: 'lecturer' }).select('accountStatus registrationMethod').lean();
    const stats = {
      total: allLecturers.length,
      active: allLecturers.filter((l) => (l.accountStatus || 'Active') === 'Active').length,
      pending: allLecturers.filter((l) => l.accountStatus === 'Pending Approval').length,
      disabled: allLecturers.filter((l) => l.accountStatus === 'Disabled').length,
      rejected: allLecturers.filter((l) => l.accountStatus === 'Rejected').length,
      selfRegistered: allLecturers.filter((l) => l.registrationMethod === 'self_registration').length,
      superAdmin: allLecturers.filter((l) => (l.registrationMethod || 'super_admin') === 'super_admin').length,
    };

    return res.json({
      count: items.length,
      lecturers: items.map(toAdminLecturerPayload),
      stats,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   SUPER ADMIN: CREATE LECTURER ACCOUNT
========================================================= */

export async function createLecturerByAdmin(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      branchId,
      intakeId,
      batchId,
      subject,
      canUpdateResults,
      mustChangePassword,
    } = req.body || {};

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const lecturer = await createLecturerAccount({
      name,
      email,
      password,
      registrationMethod: 'super_admin',
      accountStatus: 'Active',
      branchId,
      intakeId,
      batchId,
      subject,
      canUpdateResults: Boolean(canUpdateResults),
      mustChangePassword: mustChangePassword !== false,
      createdBy: req.adminAuth?.id || req.adminAuth?.sub,
    });

    await logAdminAction(req.adminAuth?.id, 'CREATE_LECTURER', {
      lecturerId: lecturer._id,
      email: lecturer.email,
      name: lecturer.name,
      registrationMethod: 'super_admin',
    });

    return res.status(201).json({
      success: true,
      message: 'Lecturer account created successfully.',
      lecturer: toAdminLecturerPayload(lecturer),
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email address already exists.' });
    }
    next(err);
  }
}

/* =========================================================
   SUPER ADMIN: UPDATE LECTURER
========================================================= */

export async function updateLecturerByAdmin(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: 'Valid lecturer ID is required.' });
    }

    const lecturer = await Admin.findById(id);
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(404).json({ message: 'Lecturer not found.' });
    }

    const {
      name,
      email,
      branchId,
      intakeId,
      batchId,
      subject,
      canUpdateResults,
      password,
    } = req.body || {};

    if (name !== undefined) {
      const cleanName = safeTrim(name);
      if (!cleanName || cleanName.length < 2) {
        return res.status(400).json({ message: 'Full name must be at least 2 characters.' });
      }
      lecturer.name = cleanName;
    }

    if (email !== undefined) {
      const cleanEmail = normalizeEmail(email);
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
      }

      if (cleanEmail !== lecturer.email) {
        const existing = await Admin.findOne({ email: cleanEmail, _id: { $ne: lecturer._id } }).lean();
        if (existing) {
          return res.status(409).json({ message: 'An account with this email address already exists.' });
        }
        const existingStudent = await Student.findOne({ email: cleanEmail }).lean();
        if (existingStudent) {
          return res.status(409).json({ message: 'An account with this email address already exists as a student.' });
        }
        lecturer.email = cleanEmail;
      }
    }

    if (branchId !== undefined) lecturer.branchId = safeTrim(branchId);
    if (intakeId !== undefined) lecturer.intakeId = safeTrim(intakeId);
    if (batchId !== undefined) lecturer.batchId = safeTrim(batchId);
    if (subject !== undefined) lecturer.subject = safeTrim(subject);
    if (canUpdateResults !== undefined) lecturer.canUpdateResults = Boolean(canUpdateResults);

    if (password && typeof password === 'string' && password.trim().length > 0) {
      if (password.trim().length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
      }
      lecturer.passwordHash = await bcrypt.hash(password.trim(), 12);
      lecturer.mustChangePassword = true;
    }

    await lecturer.save();

    await logAdminAction(req.adminAuth?.id, 'UPDATE_LECTURER', {
      lecturerId: lecturer._id,
      email: lecturer.email,
    });

    return res.json({
      success: true,
      message: 'Lecturer profile updated successfully.',
      lecturer: toAdminLecturerPayload(lecturer),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   SUPER ADMIN: APPROVE LECTURER REGISTRATION
========================================================= */

export async function approveLecturerRegistration(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: 'Valid lecturer ID is required.' });
    }

    const lecturer = await Admin.findById(id);
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(404).json({ message: 'Lecturer not found.' });
    }

    lecturer.accountStatus = 'Active';
    lecturer.approvedBy = req.adminAuth?.id || req.adminAuth?.sub || null;
    lecturer.approvedAt = new Date();
    lecturer.rejectionReason = '';

    await lecturer.save();

    await logAdminAction(req.adminAuth?.id, 'APPROVE_LECTURER', {
      lecturerId: lecturer._id,
      email: lecturer.email,
      name: lecturer.name,
    });

    return res.json({
      success: true,
      message: `Lecturer ${lecturer.name} has been approved. The lecturer can now log in to the LMS.`,
      lecturer: toAdminLecturerPayload(lecturer),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   SUPER ADMIN: REJECT LECTURER REGISTRATION
========================================================= */

export async function rejectLecturerRegistration(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: 'Valid lecturer ID is required.' });
    }

    const lecturer = await Admin.findById(id);
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(404).json({ message: 'Lecturer not found.' });
    }

    const { reason } = req.body || {};
    lecturer.accountStatus = 'Rejected';
    lecturer.rejectionReason = safeTrim(reason) || 'Registration rejected by administrator.';

    await lecturer.save();

    await logAdminAction(req.adminAuth?.id, 'REJECT_LECTURER', {
      lecturerId: lecturer._id,
      email: lecturer.email,
      reason: lecturer.rejectionReason,
    });

    return res.json({
      success: true,
      message: `Lecturer registration for ${lecturer.name} has been rejected.`,
      lecturer: toAdminLecturerPayload(lecturer),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   SUPER ADMIN: UPDATE LECTURER STATUS (ACTIVATE / DEACTIVATE)
========================================================= */

export async function updateLecturerStatus(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: 'Valid lecturer ID is required.' });
    }

    const { status } = req.body || {};
    if (!['Active', 'Disabled'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either Active or Disabled.' });
    }

    const lecturer = await Admin.findById(id);
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(404).json({ message: 'Lecturer not found.' });
    }

    lecturer.accountStatus = status;
    await lecturer.save();

    await logAdminAction(req.adminAuth?.id, 'UPDATE_LECTURER_STATUS', {
      lecturerId: lecturer._id,
      email: lecturer.email,
      newStatus: status,
    });

    return res.json({
      success: true,
      message: `Lecturer account ${status === 'Active' ? 'activated' : 'deactivated'} successfully.`,
      lecturer: toAdminLecturerPayload(lecturer),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   SUPER ADMIN: RESET LECTURER PASSWORD
========================================================= */

export async function resetLecturerPassword(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: 'Valid lecturer ID is required.' });
    }

    const { newPassword } = req.body || {};
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    const lecturer = await Admin.findById(id);
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(404).json({ message: 'Lecturer not found.' });
    }

    lecturer.passwordHash = await bcrypt.hash(newPassword.trim(), 12);
    lecturer.mustChangePassword = true;
    await lecturer.save();

    await logAdminAction(req.adminAuth?.id, 'RESET_LECTURER_PASSWORD', {
      lecturerId: lecturer._id,
      email: lecturer.email,
    });

    return res.json({
      success: true,
      message: `Password for ${lecturer.name} has been reset successfully.`,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   SUPER ADMIN: GENERATE REGISTRATION INVITATION LINK
========================================================= */

export async function generateRegistrationInvitation(req, res, next) {
  try {
    const { linkName, maxUses, expiresAt } = req.body || {};

    const cleanLinkName = safeTrim(linkName);
    if (!cleanLinkName || cleanLinkName.length < 2) {
      return res.status(400).json({
        message: 'Please provide a descriptive link name (minimum 2 characters).',
      });
    }

    const numUses = Number(maxUses);
    if (!Number.isInteger(numUses) || numUses < 1) {
      return res.status(400).json({
        message: 'Maximum registrations must be a positive integer of at least 1.',
      });
    }

    let parsedExpiry = null;
    if (expiresAt) {
      parsedExpiry = new Date(expiresAt);
      if (Number.isNaN(parsedExpiry.getTime())) {
        return res.status(400).json({ message: 'Invalid expiration date.' });
      }
      if (parsedExpiry <= new Date()) {
        return res.status(400).json({ message: 'Expiration date must be in the future.' });
      }
    } else {
      // Default: 14 days from now
      parsedExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }

    // Cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = rawToken.slice(0, 8);

    const adminId = req.adminAuth?.id || req.adminAuth?.sub;
    const adminUser = adminId ? await Admin.findById(adminId).select('name').lean() : null;

    const invitation = await LecturerInvitation.create({
      linkName: cleanLinkName,
      tokenHash,
      tokenPrefix,
      maxUses: numUses,
      usedCount: 0,
      expiresAt: parsedExpiry,
      status: 'Active',
      createdBy: adminId,
      createdByName: adminUser?.name || 'Super Admin',
    });

    // Determine client base URL
    const clientOrigin =
      process.env.CLIENT_ORIGIN?.split(',')[0]?.trim() ||
      `${req.protocol}://${req.get('host')}`;
    const registrationUrl = `${clientOrigin}/lecturer/register?token=${rawToken}`;

    await logAdminAction(adminId, 'GENERATE_LECTURER_INVITATION', {
      invitationId: invitation._id,
      linkName: cleanLinkName,
      maxUses: numUses,
      expiresAt: parsedExpiry,
    });

    return res.status(201).json({
      success: true,
      message: 'Lecturer registration invitation created successfully.',
      rawToken,
      registrationUrl,
      invitation: toInvitationPayload(invitation),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   SUPER ADMIN: LIST REGISTRATION INVITATIONS
========================================================= */

export async function listRegistrationInvitations(req, res, next) {
  try {
    const invitations = await LecturerInvitation.find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      count: invitations.length,
      invitations: invitations.map(toInvitationPayload),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   SUPER ADMIN: REVOKE REGISTRATION INVITATION
========================================================= */

export async function revokeRegistrationInvitation(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: 'Valid invitation ID is required.' });
    }

    const invitation = await LecturerInvitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ message: 'Registration invitation not found.' });
    }

    invitation.status = 'Revoked';
    invitation.revokedAt = new Date();
    invitation.revokedBy = req.adminAuth?.id || req.adminAuth?.sub || null;
    await invitation.save();

    await logAdminAction(req.adminAuth?.id, 'REVOKE_LECTURER_INVITATION', {
      invitationId: invitation._id,
      linkName: invitation.linkName,
    });

    return res.json({
      success: true,
      message: 'Registration invitation link revoked successfully.',
      invitation: toInvitationPayload(invitation),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   STUDENT: LIST LECTURERS & GET BY ID
========================================================= */

export async function listLecturers(req, res, next) {
  try {
    if (req.auth?.role !== 'student') {
      return res.status(403).json({ message: 'Student access required' });
    }

    // Only return Active lecturers to students
    const lecturers = await Admin.find({
      role: 'lecturer',
      $or: [{ accountStatus: 'Active' }, { accountStatus: { $exists: false } }],
    })
      .select('name email subject branchId role accountStatus')
      .sort({ name: 1 })
      .lean();

    return res.json({ lecturers: lecturers.map(toLecturerListItem) });
  } catch (err) {
    next(err);
  }
}

export async function getLecturerById(req, res, next) {
  try {
    if (req.auth?.role !== 'student') {
      return res.status(403).json({ message: 'Student access required' });
    }

    const id = String(req.params?.id || '').trim();
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: 'Lecturer id is required' });
    }

    const lecturer = await Admin.findById(id)
      .select('name email subject branchId role accountStatus')
      .lean();

    if (!lecturer || lecturer.role !== 'lecturer' || (lecturer.accountStatus && lecturer.accountStatus !== 'Active')) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }

    return res.json({ lecturer: toLecturerListItem(lecturer) });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   LECTURER PORTAL: DASHBOARD OVERVIEW & STATISTICS
========================================================= */

export async function getLecturerDashboardOverview(req, res, next) {
  try {
    const lecturerId = req.auth?.sub || req.auth?.id || req.adminAuth?.sub || req.adminAuth?.id;
    if (!lecturerId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const lecturer = await Admin.findById(lecturerId).lean();
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(403).json({ message: 'Forbidden. Lecturer portal access only.' });
    }

    const normalizedBatch = String(lecturer.batchId || '').trim();
    const normalizedBranch = String(lecturer.branchId || '').trim();

    // 1. Classes / Schedules
    const scheduleQuery = {
      $or: [
        { lecturerId: String(lecturer._id) },
        ...(lecturer.name ? [{ lecturerName: new RegExp(`^${lecturer.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : []),
        ...(normalizedBatch ? [{ batchId: normalizedBatch }] : []),
      ],
    };
    const allSchedules = await Schedule.find(scheduleQuery).sort({ date: 1, startTime: 1 }).lean();

    // 2. Study Materials count
    const materialQuery = {
      $or: [
        { uploadedBy: lecturer._id },
        ...(normalizedBatch ? [{ batchId: normalizedBatch }] : []),
      ],
    };
    const materialsCount = await Material.countDocuments(materialQuery);

    // 3. Assignments
    const assignmentQuery = {
      $or: [
        { adminId: lecturer._id },
        ...(normalizedBatch ? [{ batchId: normalizedBatch }] : []),
      ],
    };
    const assignments = await Assignment.find(assignmentQuery).sort({ deadline: -1 }).lean();

    // Submissions count for these assignments
    const assignmentIds = assignments.map((a) => a._id);
    const submissionsCount =
      assignmentIds.length > 0
        ? await Submission.countDocuments({ assignmentId: { $in: assignmentIds } })
        : 0;

    // Today's Date in YYYY-MM-DD
    const todayStr = new Date().toISOString().slice(0, 10);

    // Today's / Upcoming classes
    const todayClasses = allSchedules.filter((s) => s.date === todayStr);
    const upcomingClasses = allSchedules.filter((s) => s.date >= todayStr).slice(0, 5);

    return res.json({
      lecturer: toAdminLecturerPayload(lecturer),
      stats: {
        classesCount: allSchedules.length,
        materialsCount,
        assignmentsCount: assignments.length,
        submissionsCount,
      },
      todayActivities: {
        todayClasses,
        upcomingClasses,
        recentAssignments: assignments.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   LECTURER PORTAL: STUDENTS LIST
========================================================= */

export async function getLecturerStudents(req, res, next) {
  try {
    const lecturerId = req.auth?.sub || req.auth?.id || req.adminAuth?.sub || req.adminAuth?.id;
    if (!lecturerId) return res.status(401).json({ message: 'Unauthorized' });

    const lecturer = await Admin.findById(lecturerId).lean();
    if (!lecturer || lecturer.role !== 'lecturer') return res.status(403).json({ message: 'Forbidden' });

    const { q, batchId, course } = req.query || {};
    const query = {};

    if (batchId) {
      query.batchId = String(batchId).trim();
    } else if (lecturer.batchId) {
      query.batchId = lecturer.batchId;
    }

    if (course) {
      query.course = String(course).trim();
    }
    if (lecturer.branchId) {
      query.branchId = lecturer.branchId;
    }

    if (q && String(q).trim()) {
      const searchTerm = String(q).trim();
      query.$or = [
        { fullName: { $regex: searchTerm, $options: 'i' } },
        { studentId: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    const students = await Student.find(query)
      .select('studentId fullName email phone course batchId branchId intakeId academicStatus')
      .sort({ studentId: 1, fullName: 1 })
      .collation({ locale: 'en', numericOrdering: true, strength: 2 })
      .lean();

    return res.json({
      count: students.length,
      students: students.map((s) => ({
        id: String(s._id),
        studentId: s.studentId,
        fullName: s.fullName,
        email: s.email,
        phone: s.phone || '',
        course: s.course,
        batchId: s.batchId,
        branchId: s.branchId,
        intakeId: s.intakeId || '',
        academicStatus: s.academicStatus || 'Active',
      })),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   LECTURER PORTAL: PROFILE & PASSWORD UPDATE
========================================================= */

export async function updateLecturerProfile(req, res, next) {
  try {
    const lecturerId = req.auth?.sub || req.auth?.id || req.adminAuth?.sub || req.adminAuth?.id;
    if (!lecturerId) return res.status(401).json({ message: 'Unauthorized' });

    const lecturer = await Admin.findById(lecturerId);
    if (!lecturer || lecturer.role !== 'lecturer') return res.status(403).json({ message: 'Forbidden' });

    const { name, currentPassword, newPassword } = req.body || {};

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      lecturer.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password.' });
      }
      const ok = await bcrypt.compare(currentPassword.trim(), lecturer.passwordHash);
      if (!ok) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
      if (newPassword.trim().length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
      }
      lecturer.passwordHash = await bcrypt.hash(newPassword.trim(), 12);
      lecturer.mustChangePassword = false;
    }

    await lecturer.save();
    return res.json({
      message: 'Profile updated successfully.',
      lecturer: toAdminLecturerPayload(lecturer),
    });
  } catch (err) {
    next(err);
  }
}
