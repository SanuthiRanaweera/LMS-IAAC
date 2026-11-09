import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin.js';
import { Student } from '../models/Student.js';

export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Generates a unique Lecturer ID in the standard format IAAC-LEC-0001
 */
export async function generateLecturerId() {
  const lecturers = await Admin.find({
    role: 'lecturer',
    lecturerId: { $regex: /^IAAC-LEC-\d+$/i },
  })
    .select('lecturerId')
    .lean();

  let maxNum = 0;
  for (const l of lecturers) {
    const match = String(l.lecturerId || '').match(/IAAC-LEC-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  if (maxNum === 0) {
    const count = await Admin.countDocuments({ role: 'lecturer' });
    maxNum = count;
  }

  let nextNum = maxNum + 1;
  let candidate = `IAAC-LEC-${String(nextNum).padStart(4, '0')}`;

  while (await Admin.exists({ lecturerId: candidate })) {
    nextNum += 1;
    candidate = `IAAC-LEC-${String(nextNum).padStart(4, '0')}`;
  }

  return candidate;
}

/**
 * Shared backend service to create lecturer accounts consistently
 * across Super Admin creation and self-registration link workflows.
 */
export async function createLecturerAccount({
  fullName,
  name,
  email,
  password,
  lecturerId,
  registrationMethod = 'super_admin',
  accountStatus,
  branchId = '',
  intakeId = '',
  batchId = '',
  subject = '',
  canUpdateResults = false,
  mustChangePassword,
  invitationId = null,
  createdBy = null,
}) {
  const cleanName = safeTrim(fullName || name);
  if (!cleanName || cleanName.length < 2) {
    const err = new Error('Please enter your full name (minimum 2 characters).');
    err.statusCode = 400;
    throw err;
  }

  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail)) {
    const err = new Error('Please enter a valid email address.');
    err.statusCode = 400;
    throw err;
  }

  if (typeof password !== 'string' || password.trim().length < 8) {
    const err = new Error('Your password does not meet the minimum security requirements (minimum 8 characters).');
    err.statusCode = 400;
    throw err;
  }

  // Enforce unique email check across Admin (admins, staff, lecturers) and Student collections
  const existingAdmin = await Admin.findOne({ email: cleanEmail }).lean();
  if (existingAdmin) {
    const err = new Error('An account with this email address already exists.');
    err.statusCode = 409;
    throw err;
  }

  const existingStudent = await Student.findOne({ email: cleanEmail }).lean();
  if (existingStudent) {
    const err = new Error('An account with this email address already exists as a student.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password.trim(), 12);

  // Default status:
  // - Self-registration -> 'Pending Approval'
  // - Super Admin creation -> 'Active'
  const finalStatus =
    accountStatus ||
    (registrationMethod === 'self_registration' ? 'Pending Approval' : 'Active');

  const finalMustChangePassword =
    typeof mustChangePassword === 'boolean'
      ? mustChangePassword
      : (registrationMethod === 'super_admin');

  let finalLecturerId = safeTrim(lecturerId);
  if (!finalLecturerId) {
    finalLecturerId = await generateLecturerId();
  }

  const createdLecturer = await Admin.create({
    lecturerId: finalLecturerId,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role: 'lecturer',
    accountStatus: finalStatus,
    registrationMethod,
    branchId: safeTrim(branchId),
    intakeId: safeTrim(intakeId),
    batchId: safeTrim(batchId),
    subject: safeTrim(subject),
    canUpdateResults: Boolean(canUpdateResults),
    mustChangePassword: finalMustChangePassword,
    invitationId: invitationId || null,
    approvedBy: finalStatus === 'Active' && createdBy ? createdBy : null,
    approvedAt: finalStatus === 'Active' && createdBy ? new Date() : null,
  });

  return createdLecturer;
}
