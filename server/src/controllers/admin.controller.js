import bcrypt from 'bcryptjs';
import { AppData } from '../models/AppData.js';
import { Student } from '../models/Student.js';
import { Admin } from '../models/Admin.js';
import { logAdminAction } from '../middleware/adminAuth.js';

function safeTrim(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isSafeKey(key) {
  return typeof key === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(key);
}

function toStudentListItem(student) {
  return {
    id: String(student._id),
    fullName: student.fullName,
    email: student.email,
    studentId: student.studentId,
    course: student.course,
    phoneNumber: student.phoneNumber,
    whatsappNumber: student.whatsappNumber,
    intakeId: student.intakeId,
    createdAt: student.createdAt,
  };
}

function toAdminListItem(admin) {
  const role = admin?.role ? String(admin.role) : 'staff';
  return {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    role,
    createdAt: admin.createdAt,
  };
}

export async function getAdminMetrics(req, res, next) {
  try {
    const [students, admins] = await Promise.all([
      Student.countDocuments(),
      Admin.countDocuments(),
    ]);

    const programmesDoc = await AppData.findOne({ key: 'programmes' }).lean();
    const programmes = Array.isArray(programmesDoc?.payload?.programmes)
      ? programmesDoc.payload.programmes.length
      : 0;

    res.json({
      students,
      users: admins,
      faculties: 0,
      programmes,
      totalIncome: 0,
      awaitingPayments: 0,
      pendingApproval: 0,
      rejectedPayments: 0,
    });
  } catch (err) {
    next(err);
  }
}

export async function listAdminUsers(req, res, next) {
  try {
    const items = await Admin.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.json({ users: items.map(toAdminListItem) });
  } catch (err) {
    next(err);
  }
}

export async function createStaffUser(req, res, next) {
  try {
    const { name, email, password, role, branchId, intakeId, batchId, mustChangePassword } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    const requestedRole = String(role || 'staff').trim().toLowerCase();
    const allowedRoles = new Set(['staff', 'lecturer']);
    if (!allowedRoles.has(requestedRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (!safeTrim(name)) return res.status(400).json({ message: 'Name is required' });
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ message: 'Valid email is required' });
    if (typeof password !== 'string' || password.trim().length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await Admin.findOne({ email: normalizedEmail }).lean();
    if (existing) return res.status(409).json({ message: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password.trim(), 12);
    const created = await Admin.create({
      name: safeTrim(name),
      email: normalizedEmail,
      passwordHash,
      role: requestedRole,
      branchId: typeof branchId === 'string' ? branchId.trim() : '',
      intakeId: typeof intakeId === 'string' ? intakeId.trim() : '',
      batchId:  typeof batchId  === 'string' ? batchId.trim()  : '',
      mustChangePassword: mustChangePassword === true,
    });

    // Log the action
    await logAdminAction(req.adminAuth?.id, 'CREATE_STAFF_ADMIN', {
      staffAdminId: created._id,
      staffAdminEmail: normalizedEmail,
      staffAdminName: safeTrim(name),
      role: requestedRole,
    });

    res.status(201).json({ user: toAdminListItem(created) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    next(err);
  }
}

export async function listStudents(req, res, next) {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const q = safeTrim(req.query.q);
    const intakeId = safeTrim(req.query.intakeId);

    const filter = {
      ...(q
        ? {
            $or: [
              { fullName: { $regex: q, $options: 'i' } },
              { email: { $regex: q, $options: 'i' } },
              { studentId: { $regex: q, $options: 'i' } },
            ],
          }
        : {}),
      ...(intakeId ? { intakeId } : {}),
    };

    const items = await Student.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ students: items.map(toStudentListItem) });
  } catch (err) {
    next(err);
  }
}

export async function createStudentByAdmin(req, res, next) {
  try {
    const {
      fullName,
      email,
      studentId,
      nic,
      course,
      whatsappNumber,
      phoneNumber,
      address,
      guardianName,
      guardianPhoneNumber,
      password,
    } = req.body || {};

    const normalizedEmail = normalizeEmail(email);

    if (!safeTrim(fullName)) return res.status(400).json({ message: 'Name is required' });
    if (!safeTrim(studentId)) return res.status(400).json({ message: 'Student ID is required' });
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ message: 'Valid email is required' });
    if (typeof password !== 'string' || password.trim().length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await Student.findOne({
      $or: [{ email: normalizedEmail }, { studentId: safeTrim(studentId) }],
    }).lean();

    if (existing) return res.status(409).json({ message: 'Email or Student ID already exists' });

    const passwordHash = await bcrypt.hash(password.trim(), 12);

    const created = await Student.create({
      fullName: safeTrim(fullName),
      email: normalizedEmail,
      studentId: safeTrim(studentId),
      nic: safeTrim(nic),
      course: safeTrim(course),
      whatsappNumber: safeTrim(whatsappNumber),
      phoneNumber: safeTrim(phoneNumber),
      address: safeTrim(address),
      guardianName: safeTrim(guardianName),
      guardianPhoneNumber: safeTrim(guardianPhoneNumber),
      passwordHash,
    });

    res.status(201).json({ student: toStudentListItem(created) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Email or Student ID already exists' });
    }
    next(err);
  }
}

export async function deleteStudentByAdmin(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Student ID is required' });

    const student = await Student.findById(id).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    await Student.findByIdAndDelete(id);

    await logAdminAction(req.adminAuth?.id, 'DELETE_STUDENT', {
      studentId: id,
      studentEmail: student.email,
      studentStudentId: student.studentId,
      studentName: student.fullName,
    });

    return res.json({ message: 'Student account deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function listAppDataKeys(req, res, next) {
  try {
    const keys = await AppData.find({}, { key: 1, _id: 0 }).sort({ key: 1 }).lean();
    res.json({ keys: keys.map((d) => d.key) });
  } catch (err) {
    next(err);
  }
}

export async function getAppDataByKey(req, res, next) {
  try {
    const { key } = req.params;
    if (!isSafeKey(key)) return res.status(400).json({ message: 'Invalid key' });

    const doc = await AppData.findOne({ key }).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });

    res.json({ key: doc.key, payload: doc.payload, updatedAt: doc.updatedAt });
  } catch (err) {
    next(err);
  }
}

export async function upsertAppDataByKey(req, res, next) {
  try {
    const { key } = req.params;
    if (!isSafeKey(key)) return res.status(400).json({ message: 'Invalid key' });

    const { payload } = req.body || {};
    if (payload === undefined) return res.status(400).json({ message: 'payload is required' });

    const updated = await AppData.findOneAndUpdate(
      { key },
      { $set: { key, payload } },
      { upsert: true, new: true }
    ).lean();

    res.json({ key: updated.key, payload: updated.payload, updatedAt: updated.updatedAt });
  } catch (err) {
    next(err);
  }
}

// Edit staff admin (superadmin only)
export async function editStaffUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body || {};
    
    if (!id) return res.status(400).json({ message: 'Admin ID is required' });
    
    const admin = await Admin.findById(id).lean();
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    
    // Prevent editing superadmin accounts (only staff can be edited)
    if (admin.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot edit superadmin accounts' });
    }

    const updateData = {};
    
    if (name && safeTrim(name)) {
      updateData.name = safeTrim(name);
    }
    
    if (email) {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: 'Valid email is required' });
      }
      
      // Check if email is already used by another admin
      const existing = await Admin.findOne({ 
        email: normalizedEmail, 
        _id: { $ne: id } 
      }).lean();
      if (existing) {
        return res.status(409).json({ message: 'Email already exists' });
      }
      
      updateData.email = normalizedEmail;
    }
    
    if (password && typeof password === 'string' && password.trim().length >= 8) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 12);
    }

    const updated = await Admin.findByIdAndUpdate(id, updateData, { new: true }).lean();
    
    // Log the action
    await logAdminAction(req.adminAuth?.id, 'EDIT_STAFF_ADMIN', {
      staffAdminId: id,
      changes: Object.keys(updateData),
      staffAdminEmail: updated.email
    });

    res.json({ user: toAdminListItem(updated) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    next(err);
  }
}

// Delete staff admin (superadmin only)
export async function deleteStaffUser(req, res, next) {
  try {
    const { id } = req.params;
    
    if (!id) return res.status(400).json({ message: 'Admin ID is required' });
    
    const admin = await Admin.findById(id).lean();
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    
    // Prevent deleting superadmin accounts
    if (admin.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete superadmin accounts' });
    }
    
    // Prevent self-deletion
    if (String(admin._id) === String(req.adminAuth?.id)) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }

    await Admin.findByIdAndDelete(id);
    
    // Log the action
    await logAdminAction(req.adminAuth?.id, 'DELETE_STAFF_ADMIN', {
      staffAdminId: id,
      staffAdminEmail: admin.email,
      staffAdminName: admin.name
    });

    res.json({ message: 'Admin account deleted successfully' });
  } catch (err) {
    next(err);
  }
}
