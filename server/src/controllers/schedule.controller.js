import { Admin } from '../models/Admin.js';
import { Schedule } from '../models/Schedule.js';
import { Student } from '../models/Student.js';

function normalizeId(v) {
  return v == null ? '' : String(v).trim();
}

function safeStr(v, max = 200) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function toScheduleItem(s) {
  return {
    id: String(s._id),
    branchId: s.branchId,
    intakeId: s.intakeId,
    batchId: s.batchId,
    subject: s.subject,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    room: s.room,
    notes: s.notes || '',
    lecturerName: s.lecturerName || '',
    lecturerId: s.lecturerId || '',
    addedBy: s.addedBy,
    addedByName: s.addedByName,
    addedByRole: s.addedByRole,
    createdAt: s.createdAt,
  };
}

function buildVisibilityFilter(user) {
  const filter = {};
  if (user?.batchId) filter.batchId = normalizeId(user.batchId);
  if (user?.intakeId) filter.intakeId = normalizeId(user.intakeId);
  if (user?.branchId) filter.branchId = normalizeId(user.branchId);
  return filter;
}

async function resolveAdminIdentity(adminAuth) {
  const id = normalizeId(adminAuth?.sub || adminAuth?.id);
  if (!id) return { id: '', name: 'Admin', role: 'staff' };
  const admin = await Admin.findById(id).select('name role').lean();
  return {
    id,
    name: admin?.name || 'Admin',
    role: admin?.role || 'staff',
  };
}

// ─── ADMIN: list schedules ────────────────────────────────────────────────────
export async function adminListSchedules(req, res, next) {
  try {
    const { branchId, intakeId, batchId } = req.query;
    const filter = {};
    if (branchId) filter.branchId = normalizeId(branchId);
    if (intakeId) filter.intakeId = normalizeId(intakeId);
    if (batchId)  filter.batchId  = normalizeId(batchId);

    const items = await Schedule.find(filter).sort({ date: 1, startTime: 1 }).lean();
    res.json({ schedules: items.map(toScheduleItem) });
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: create schedule (superadmin + staff) ──────────────────────────────
export async function adminCreateSchedule(req, res, next) {
  try {
    const {
      branchId, intakeId, batchId,
      subject, date, startTime, endTime,
      room, notes, lecturerName, lecturerId,
    } = req.body || {};

    if (!normalizeId(branchId)) return res.status(400).json({ message: 'Branch is required' });
    if (!normalizeId(intakeId)) return res.status(400).json({ message: 'Intake is required' });
    if (!normalizeId(batchId))  return res.status(400).json({ message: 'Batch is required' });
    if (!safeStr(subject))      return res.status(400).json({ message: 'Subject is required' });
    if (!safeStr(date, 20))     return res.status(400).json({ message: 'Date is required' });
    if (!safeStr(startTime, 10)) return res.status(400).json({ message: 'Start time is required' });
    if (!safeStr(endTime, 10))   return res.status(400).json({ message: 'End time is required' });
    if (!safeStr(room))         return res.status(400).json({ message: 'Room/location is required' });
    if (!safeStr(lecturerName)) return res.status(400).json({ message: 'Assigned lecturer is required' });

    // Validate endTime > startTime
    if (endTime <= startTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const adminIdentity = await resolveAdminIdentity(req.adminAuth);

    const created = await Schedule.create({
      branchId: normalizeId(branchId),
      intakeId: normalizeId(intakeId),
      batchId:  normalizeId(batchId),
      subject:  safeStr(subject),
      date:     safeStr(date, 20),
      startTime: safeStr(startTime, 10),
      endTime:   safeStr(endTime, 10),
      room:      safeStr(room),
      notes:     safeStr(notes || '', 1000),
      lecturerName: safeStr(lecturerName, 120),
      lecturerId:   normalizeId(lecturerId),
      addedBy:     adminIdentity.id,
      addedByName: adminIdentity.name,
      addedByRole: adminIdentity.role,
    });

    res.status(201).json({ schedule: toScheduleItem(created) });
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: update schedule (superadmin only) ─────────────────────────────────
export async function adminUpdateSchedule(req, res, next) {
  try {
    const id = req.params.id;
    const {
      subject, date, startTime, endTime,
      room, notes, lecturerName, lecturerId,
    } = req.body || {};

    const existing = await Schedule.findById(id);
    if (!existing) return res.status(404).json({ message: 'Schedule not found' });

    if (safeStr(subject))    existing.subject  = safeStr(subject);
    if (safeStr(date, 20))   existing.date     = safeStr(date, 20);
    if (safeStr(startTime, 10)) existing.startTime = safeStr(startTime, 10);
    if (safeStr(endTime, 10))   existing.endTime   = safeStr(endTime, 10);
    if (safeStr(room))       existing.room     = safeStr(room);
    if (typeof notes === 'string') existing.notes = safeStr(notes, 1000);
    if (safeStr(lecturerName, 120)) existing.lecturerName = safeStr(lecturerName, 120);
    if (normalizeId(lecturerId))    existing.lecturerId   = normalizeId(lecturerId);

    if (existing.endTime <= existing.startTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    await existing.save();
    res.json({ schedule: toScheduleItem(existing) });
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: delete schedule (superadmin only) ─────────────────────────────────
export async function adminDeleteSchedule(req, res, next) {
  try {
    const deleted = await Schedule.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Schedule not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: get lecturers for a branch ───────────────────────────────────────
export async function adminGetBranchLecturers(req, res, next) {
  try {
    const branchId = normalizeId(req.query.branchId);
    const filter = { role: 'lecturer' };
    if (branchId) filter.branchId = branchId;

    const lecturers = await Admin.find(filter)
      .select('_id name email branchId intakeId batchId')
      .lean();

    res.json({
      lecturers: lecturers.map((l) => ({
        id: String(l._id),
        name: l.name,
        email: l.email,
        branchId: l.branchId || '',
        intakeId: l.intakeId || '',
        batchId: l.batchId || '',
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ─── STUDENT / LECTURER: view schedule (filtered by batch) ───────────────────
export async function getMySchedule(req, res, next) {
  try {
    const role = req.auth?.role;
    const userId = req.auth?.sub;

    let batchId, intakeId, branchId;

    if (role === 'lecturer') {
      // Lecturer sees their assigned batch
      const lecturer = await Admin.findById(userId).lean();
      if (!lecturer || lecturer.role !== 'lecturer') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      batchId  = lecturer.batchId;
      intakeId = lecturer.intakeId;
      branchId = lecturer.branchId;
    } else {
      // Student sees their own batch
      const student = await Student.findById(userId).lean();
      if (!student) return res.status(401).json({ message: 'Unauthorized' });
      batchId  = student.batchId;
      intakeId = student.intakeId;
      branchId = student.branchId;
    }

    const filter = batchId
      ? { batchId: normalizeId(batchId), ...(intakeId ? { intakeId: normalizeId(intakeId) } : {}), ...(branchId ? { branchId: normalizeId(branchId) } : {}) }
      : buildVisibilityFilter({ batchId, intakeId, branchId });

    if (!filter.batchId && !filter.intakeId && !filter.branchId) {
      return res.json({ schedules: [] });
    }

    const items = await Schedule.find(filter).sort({ date: 1, startTime: 1 }).lean();
    res.json({ schedules: items.map(toScheduleItem) });
  } catch (err) {
    next(err);
  }
}
