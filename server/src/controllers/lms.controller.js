import { DEFAULT_LMS_DATA } from '../data/defaultLmsData.js';
import { Material } from '../models/Material.js';
import { Student } from '../models/Student.js';
import { getOrCreateAppDataPayload } from '../services/appData.service.js';

function canonicalCourse(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return '';
  if (v === 'cabin crew' || v === 'cabin' || v === 'crew') return 'Cabin Crew';
  if (v === 'ground operations' || v === 'ground ops' || v === 'ground operation' || v === 'ground') {
    return 'Ground Operations';
  }
  if (v === 'ticketing & reservations' || v === 'ticketing and reservations' || v === 'ticketing' || v === 'reservations') {
    return 'Ticketing & Reservations';
  }
  if (v === 'air cargo' || v === 'cargo') return 'Air Cargo';
  return String(value || '').trim();
}

export async function getStudentMe(req, res, next) {
  try {
    const id = req.auth?.sub;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const student = await Student.findById(id).lean();
    if (!student) return res.status(401).json({ message: 'Unauthorized' });

    const fullName = student.fullName;
    const firstName = fullName.split(' ')[0] || fullName;

    res.json({
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
    });
  } catch (err) {
    next(err);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const payload = await getOrCreateAppDataPayload('dashboard', DEFAULT_LMS_DATA.dashboard);
    const studentId = req.auth?.sub;
    const student = studentId ? await Student.findById(studentId).lean() : null;
    const progress = payload?.progress && typeof payload.progress === 'object' ? { ...payload.progress } : {};

    let activeMaterial = payload?.activeMaterial || null;
    if (student?.branchId && student?.course && (student?.batchId || student?.intakeId)) {
      const filter = {
        branchId: student.branchId,
        course: canonicalCourse(student.course),
        isActive: true,
      };

      if (student.batchId) {
        filter.batchId = student.batchId;
      } else if (student.intakeId) {
        filter.intakeId = student.intakeId;
        filter.$or = [{ batchId: '' }, { batchId: { $exists: false } }, { batchId: null }];
      }

      const latestMaterial = await Material.findOne(filter)
        .sort({ weekNumber: -1, createdAt: -1 })
        .lean();

      if (latestMaterial) {
        activeMaterial = {
          name: latestMaterial.title,
          type: String(latestMaterial.fileType || '').startsWith('video/') ? 'Video' : 'Material',
          courseTitle: latestMaterial.course || student.course || '',
          resumeHref: '/materials',
          progressPct: 0,
          moduleTitle: latestMaterial.description || '',
          lastSeen: latestMaterial.weekNumber ? `Week ${latestMaterial.weekNumber}` : '',
        };
      }
    }

    if (!progress.courseTitle && student?.course) {
      progress.courseTitle = student.course;
    }

    res.json({
      ...payload,
      progress,
      activeMaterial,
      student: student
        ? {
            id: String(student._id),
            name: student.fullName,
            firstName: student.fullName?.split(' ')[0] || student.fullName,
            course: student.course,
          }
        : undefined,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCourses(req, res, next) {
  try {
    const payload = await getOrCreateAppDataPayload('courses', DEFAULT_LMS_DATA.courses);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getMaterials(req, res, next) {
  try {
    const payload = await getOrCreateAppDataPayload('materials', DEFAULT_LMS_DATA.materials);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getKnowledgeHub(req, res, next) {
  try {
    const payload = await getOrCreateAppDataPayload('knowledge-hub', DEFAULT_LMS_DATA['knowledge-hub']);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getSchedule(req, res, next) {
  try {
    const payload = await getOrCreateAppDataPayload('schedule', DEFAULT_LMS_DATA.schedule);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getRecordings(req, res, next) {
  try {
    const payload = await getOrCreateAppDataPayload('recordings', DEFAULT_LMS_DATA.recordings);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getResults(req, res, next) {
  try {
    const payload = await getOrCreateAppDataPayload('results', DEFAULT_LMS_DATA.results);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getPolicy(req, res, next) {
  try {
    const payload = await getOrCreateAppDataPayload('policy', DEFAULT_LMS_DATA.policy);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    const payload = await getOrCreateAppDataPayload('profile', DEFAULT_LMS_DATA.profile);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getHelp(req, res, next) {
  try {
    const payload = await getOrCreateAppDataPayload('help', DEFAULT_LMS_DATA.help);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}
