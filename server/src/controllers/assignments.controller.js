import mongoose from 'mongoose';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { Student } from '../models/Student.js';
import { STUDY_MATERIAL_COURSES } from '../models/Material.js';
import { DEFAULT_LMS_DATA } from '../data/defaultLmsData.js';
import { getOrCreateAppDataPayload } from '../services/appData.service.js';
import { resolveAssignmentFileUrl, uploadAssignmentFileToR2 } from '../services/r2Assignments.service.js';

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeId(value) {
  return value == null ? '' : String(value).trim();
}

function canonicalCourse(value) {
  const normalized = safeTrim(value).toLowerCase();
  if (!normalized) return '';
  if (normalized === 'cabin crew' || normalized === 'cabin' || normalized === 'crew') return 'Cabin Crew';
  if (normalized === 'ground operations' || normalized === 'ground ops' || normalized === 'ground') return 'Ground Operations';
  if (normalized === 'ticketing & reservations' || normalized === 'ticketing and reservations' || normalized === 'ticketing') {
    return 'Ticketing & Reservations';
  }
  if (normalized === 'air cargo' || normalized === 'cargo') return 'Air Cargo';
  return safeTrim(value);
}

function courseKeywords(course) {
  const normalized = canonicalCourse(course).toLowerCase();
  if (normalized === 'cabin crew') return ['cabin crew', 'cabin', 'crew'];
  if (normalized === 'ground operations') return ['ground operations', 'ground ops', 'ground'];
  if (normalized === 'ticketing & reservations') return ['ticketing & reservations', 'ticketing', 'reservation', 'reservations'];
  if (normalized === 'air cargo') return ['air cargo', 'cargo'];
  return [normalized].filter(Boolean);
}

function batchMatchesCourse(batchName, course) {
  const normalizedBatchName = safeTrim(batchName).toLowerCase();
  if (!normalizedBatchName) return false;
  return courseKeywords(course).some((keyword) => normalizedBatchName.includes(keyword));
}

function findBatchInBranches(branches, branchId, batchId) {
  const branch = branches.find((item) => normalizeId(item?.id || item?.name) === normalizeId(branchId));
  if (!branch) return null;

  for (const intake of Array.isArray(branch?.intakes) ? branch.intakes : []) {
    for (const batch of Array.isArray(intake?.batches) ? intake.batches : []) {
      if (normalizeId(batch?.id || batch?.name) === normalizeId(batchId)) {
        return {
          branch,
          intake,
          batch,
        };
      }
    }
  }

  return null;
}

async function loadAcademicBranches() {
  const payload = await getOrCreateAppDataPayload('academics', {
    branches: DEFAULT_LMS_DATA?.academics?.branches || [],
  });
  return Array.isArray(payload?.branches) ? payload.branches : [];
}

async function resolveStudentTargeting(studentId, auth = {}) {
  const student = await Student.findById(studentId)
    .select('branchId intakeId batchId course')
    .lean();

  if (!student) {
    return { error: { status: 404, message: 'Student not found.' } };
  }

  const branchId = normalizeId(auth.branchId || student.branchId);
  const intakeId = normalizeId(student.intakeId);
  const course = canonicalCourse(auth.course || student.course);
  let batchId = normalizeId(auth.batchId || student.batchId);

  if (!batchId && branchId && intakeId && course) {
    const branches = await loadAcademicBranches();
    const branch = branches.find(
      (item) => normalizeId(item?.id || item?.name) === branchId
    );
    const intake = Array.isArray(branch?.intakes)
      ? branch.intakes.find((item) => normalizeId(item?.id || item?.name) === intakeId)
      : null;
    const derivedBatch = Array.isArray(intake?.batches)
      ? intake.batches.find((item) => batchMatchesCourse(item?.name || item?.id, course))
      : null;

    if (derivedBatch?.id) {
      batchId = normalizeId(derivedBatch.id);
      await Student.updateOne({ _id: studentId }, { $set: { batchId } });
    }
  }

  return {
    student,
    branchId,
    batchId,
    course,
  };
}

async function assignmentListItem(assignment, submissions = []) {
  const deadline = assignment.deadline instanceof Date ? assignment.deadline : new Date(assignment.deadline);
  const referenceDocumentUrl = await resolveAssignmentFileUrl(assignment.referenceDocumentUrl || '');
  return {
    id: String(assignment._id),
    title: assignment.title,
    description: assignment.description,
    referenceDocumentUrl,
    deadline,
    branchId: assignment.branchId,
    batchId: assignment.batchId,
    course: assignment.course,
    adminId: String(assignment.adminId),
    createdAt: assignment.createdAt,
    submissions,
    submissionCount: submissions.length,
    lateSubmissionCount: submissions.filter((item) => item.status === 'Late').length,
  };
}

async function submissionListItem(submission) {
  const student = submission.studentId || {};
  const oneDriveUrl = await resolveAssignmentFileUrl(submission.oneDriveUrl || '');
  return {
    id: String(submission._id),
    assignmentId: String(submission.assignmentId),
    studentId: typeof student === 'object' && student?._id ? String(student._id) : String(submission.studentId),
    studentName: student.fullName || '',
    studentCode: student.studentId || '',
    studentEmail: student.email || '',
    fileName: submission.fileName,
    oneDriveUrl,
    oneDriveFileId: submission.oneDriveFileId,
    status: submission.status,
    submittedAt: submission.updatedAt,
  };
}

function validateAssignmentPayload(body = {}) {
  const errors = [];
  const title = safeTrim(body.title);
  const description = safeTrim(body.description);
  const branchId = normalizeId(body.branchId);
  const batchId = normalizeId(body.batchId);
  const course = canonicalCourse(body.course);
  const deadline = body.deadline ? new Date(body.deadline) : null;

  if (title.length < 3) errors.push('Assignment title must be at least 3 characters long.');
  if (description.length < 10) errors.push('Assignment description must be at least 10 characters long.');
  if (!branchId) errors.push('Branch is required.');
  if (!batchId) errors.push('Batch is required.');
  if (!STUDY_MATERIAL_COURSES.includes(course)) {
    errors.push(`Course must be one of: ${STUDY_MATERIAL_COURSES.join(', ')}.`);
  }
  if (!(deadline instanceof Date) || Number.isNaN(deadline.getTime())) {
    errors.push('A valid assignment deadline is required.');
  }

  return {
    errors,
    normalized: { title, description, branchId, batchId, course, deadline },
  };
}

export async function createAssignment(req, res, next) {
  try {
    const { errors, normalized } = validateAssignmentPayload(req.body || {});
    const branches = errors.length === 0 ? await loadAcademicBranches() : [];
    const batchContext = errors.length === 0
      ? findBatchInBranches(branches, normalized.branchId, normalized.batchId)
      : null;

    if (batchContext?.batch?.name && !batchMatchesCourse(batchContext.batch.name, normalized.course)) {
      errors.push(`Selected batch is associated with ${batchContext.batch.name}, not ${normalized.course}.`);
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    let referenceDocumentUrl = safeTrim(req.body?.referenceDocumentUrl);

    if (req.file?.buffer && req.file?.originalname) {
      const upload = await uploadAssignmentFileToR2({
        folder: 'assignments/reference-documents',
        fileName: req.file.originalname,
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
        metadata: {
          branchid: normalized.branchId,
          batchid: normalized.batchId,
          course: normalized.course,
        },
      });

      referenceDocumentUrl = upload.storageUri;
    }

    const assignment = await Assignment.create({
      ...normalized,
      referenceDocumentUrl,
      adminId: req.adminAuth?.id,
    });

    return res.status(201).json({
      assignment: await assignmentListItem(assignment.toObject(), []),
    });
  } catch (err) {
    next(err);
  }
}

export async function listAdminAssignments(req, res, next) {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const filter = { isActive: { $ne: false } };

    const assignments = await Assignment.find(filter)
      .sort({ deadline: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    const assignmentIds = assignments.map((item) => item._id);
    const submissions = assignmentIds.length > 0
      ? await Submission.find({ assignmentId: { $in: assignmentIds } })
          .populate('studentId', 'fullName studentId email')
          .sort({ updatedAt: -1 })
          .lean()
      : [];

    const submissionsByAssignment = new Map();

    for (const submission of submissions) {
      const key = String(submission.assignmentId);
      const bucket = submissionsByAssignment.get(key) || [];
      bucket.push(await submissionListItem(submission));
      submissionsByAssignment.set(key, bucket);
    }

    const assignmentItems = await Promise.all(
      assignments.map((assignment) =>
        assignmentListItem(assignment, submissionsByAssignment.get(String(assignment._id)) || [])
      )
    );

    res.json({
      assignments: assignmentItems,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentAssignments(req, res, next) {
  try {
    const authStudentId = req.auth?.sub;
    if (!authStudentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const targeting = await resolveStudentTargeting(authStudentId, req.auth || {});
    if (targeting.error) {
      return res.status(targeting.error.status).json({ message: targeting.error.message });
    }

    const authBranchId = targeting.branchId;
    const authBatchId = targeting.batchId;
    const authCourse = targeting.course;

    if (!authBranchId || !authBatchId || !authCourse) {
      return res.status(400).json({ message: 'Student academic profile is incomplete.' });
    }

    const [assignments, submissions] = await Promise.all([
      Assignment.find({
        branchId: authBranchId,
        batchId: authBatchId,
        course: authCourse,
        isActive: { $ne: false },
      })
        .sort({ deadline: 1, createdAt: -1 })
        .lean(),
      Submission.find({ studentId: authStudentId }).lean(),
    ]);

    const submissionsByAssignment = new Map(
      submissions.map((submission) => [String(submission.assignmentId), submission])
    );

    const assignmentItems = await Promise.all(
      assignments.map(async (assignment) => {
        const submission = submissionsByAssignment.get(String(assignment._id));
        return {
          id: String(assignment._id),
          title: assignment.title,
          description: assignment.description,
          referenceDocumentUrl: await resolveAssignmentFileUrl(assignment.referenceDocumentUrl || ''),
          deadline: assignment.deadline,
          branchId: assignment.branchId,
          batchId: assignment.batchId,
          course: assignment.course,
          status: submission?.status || null,
          submission: submission
            ? {
                id: String(submission._id),
                fileName: submission.fileName,
                oneDriveUrl: await resolveAssignmentFileUrl(submission.oneDriveUrl || ''),
                oneDriveFileId: submission.oneDriveFileId,
                status: submission.status,
                submittedAt: submission.updatedAt,
              }
            : null,
        };
      })
    );

    res.json({ assignments: assignmentItems });
  } catch (err) {
    next(err);
  }
}

export async function submitAssignment(req, res, next) {
  try {
    const assignmentId = normalizeId(req.body?.assignmentId);
    const authStudentId = req.auth?.sub;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ message: 'A valid assignment is required.' });
    }

    if (!req.file?.buffer || !req.file?.originalname) {
      return res.status(400).json({ message: 'Please choose a file to upload.' });
    }

    const [assignment, student] = await Promise.all([
      Assignment.findOne({ _id: assignmentId, isActive: { $ne: false } }).lean(),
      Student.findById(authStudentId).lean(),
    ]);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const targeting = await resolveStudentTargeting(authStudentId, req.auth || {});
    if (targeting.error) {
      return res.status(targeting.error.status).json({ message: targeting.error.message });
    }

    const studentCourse = targeting.course;
    const studentBranchId = targeting.branchId;
    const studentBatchId = targeting.batchId;

    const isTargetMatch =
      studentBranchId === assignment.branchId &&
      studentBatchId === assignment.batchId &&
      studentCourse === assignment.course;

    if (!isTargetMatch) {
      return res.status(403).json({ message: 'This assignment is not available for your cohort.' });
    }

    const now = new Date();
    const status = now > new Date(assignment.deadline) ? 'Late' : 'Submitted';
    const upload = await uploadAssignmentFileToR2({
      folder: `assignments/submissions/${assignment.course}/${assignment.batchId}`,
      fileName: req.file.originalname,
      fileBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      metadata: {
        assignmentid: String(assignment._id),
        studentid: student.studentId || String(student._id),
        course: assignment.course,
        batchid: assignment.batchId,
      },
    });

    const submission = await Submission.findOneAndUpdate(
      { assignmentId: assignment._id, studentId: student._id },
      {
        $set: {
          fileName: req.file.originalname,
          oneDriveUrl: upload.storageUri,
          oneDriveFileId: upload.objectKey,
          status,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.status(201).json({
      submission: {
        id: String(submission._id),
        assignmentId: String(submission.assignmentId),
        status: submission.status,
        fileName: submission.fileName,
        oneDriveUrl: await resolveAssignmentFileUrl(submission.oneDriveUrl || ''),
        oneDriveFileId: submission.oneDriveFileId,
        submittedAt: submission.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}