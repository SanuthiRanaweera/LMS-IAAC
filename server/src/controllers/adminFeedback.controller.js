import mongoose from 'mongoose';
import { Feedback } from '../models/Feedback.js';
import { FeedbackRequest } from '../models/FeedbackRequest.js';
import { FeedbackSummary } from '../models/FeedbackSummary.js';
import { FeedbackReport } from '../models/FeedbackReport.js';
import { FeedbackModerationEvent } from '../models/FeedbackModerationEvent.js';
import { AppData } from '../models/AppData.js';
import { Admin } from '../models/Admin.js';
import { Student } from '../models/Student.js';
import { DEFAULT_LMS_DATA } from '../data/defaultLmsData.js';
import { computeWeekPeriodUTC } from '../utils/weekPeriod.js';
import {
  generateOrUpdateFeedbackSummary,
  safeTrim,
  sanitizeText,
} from '../services/feedbackManagement.service.js';

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Applies branch restriction for staff admins.
 */
function getBranchFilter(req) {
  if (req.adminAuth?.role === 'staff' && req.adminAuth?.branchId) {
    return { branchId: req.adminAuth.branchId };
  }
  return {};
}

/* =========================================================
   1. DASHBOARD KPI STATS
========================================================= */
export async function adminGetFeedbackStats(req, res, next) {
  try {
    const branchFilter = getBranchFilter(req);

    const totalRequests = await FeedbackRequest.countDocuments(branchFilter);
    const submissions = await Feedback.find({ status: 'active', ...branchFilter })
      .select('rating ratings')
      .lean();

    const responsesReceived = submissions.length;
    let sumRating = 0;
    for (const sub of submissions) {
      const overall = sub.ratings?.overallExperience || sub.rating || 5;
      sumRating += overall;
    }
    const averageRating = responsesReceived > 0
      ? Math.round((sumRating / responsesReceived) * 10) / 10
      : 0;

    const pendingReviews = await FeedbackSummary.countDocuments({
      status: { $in: ['Draft', 'Under Review'] },
      ...branchFilter,
    });

    return res.json({
      totalRequests,
      responsesReceived,
      averageRating,
      pendingReviews,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   1.1 ACADEMIC HIERARCHY OPTIONS (BRANCH, INTAKE, BATCH, MODULE)
========================================================= */
export async function adminGetAcademicOptions(req, res, next) {
  try {
    const branchId = safeTrim(req.query?.branchId);
    const intakeId = safeTrim(req.query?.intakeId);

    // 1. Load academic branches from AppData or default fallback
    let branches = [];
    try {
      const doc = await AppData.findOne({ key: 'academics' }).lean();
      if (doc?.payload?.branches && Array.isArray(doc.payload.branches)) {
        branches = doc.payload.branches;
      }
    } catch {}

    if (branches.length === 0 && DEFAULT_LMS_DATA?.academics?.branches) {
      branches = DEFAULT_LMS_DATA.academics.branches;
    }

    // Also include any branch names from Student collection
    const studentBranches = await Student.distinct('branchId');
    for (const sb of studentBranches) {
      if (sb && !branches.some((b) => (b.name || b.id || '').toLowerCase() === sb.toLowerCase())) {
        branches.push({ id: sb, name: sb, intakes: [] });
      }
    }

    // 2. Resolve selected branch if requested
    let selectedBranch = null;
    if (branchId) {
      selectedBranch = branches.find(
        (b) =>
          (b.id && b.id.toLowerCase() === branchId.toLowerCase()) ||
          (b.name && b.name.toLowerCase() === branchId.toLowerCase())
      );
    }

    // 3. Intakes for branch
    let intakes = [];
    if (selectedBranch && Array.isArray(selectedBranch.intakes)) {
      intakes = selectedBranch.intakes.map((i) => ({
        id: i.id || i.name,
        name: i.name || i.id,
      }));
    } else if (!branchId) {
      // If no branch filter, collect all intakes across branches
      for (const b of branches) {
        if (Array.isArray(b.intakes)) {
          for (const i of b.intakes) {
            if (!intakes.some((it) => it.id === (i.id || i.name))) {
              intakes.push({ id: i.id || i.name, name: i.name || i.id });
            }
          }
        }
      }
    }

    // Also include distinct intakes from Student collection
    const studentIntakeQuery = branchId ? { branchId: { $regex: new RegExp(`^${branchId}$`, 'i') } } : {};
    const dbIntakes = await Student.distinct('intakeId', studentIntakeQuery);
    for (const dbi of dbIntakes) {
      if (dbi && !intakes.some((it) => it.id.toLowerCase() === dbi.toLowerCase() || it.name.toLowerCase() === dbi.toLowerCase())) {
        intakes.push({ id: dbi, name: dbi });
      }
    }

    // 4. Batches
    let batches = [];
    if (selectedBranch) {
      if (intakeId) {
        const foundIntake = selectedBranch.intakes?.find(
          (i) =>
            (i.id && i.id.toLowerCase() === intakeId.toLowerCase()) ||
            (i.name && i.name.toLowerCase() === intakeId.toLowerCase())
        );
        if (foundIntake && Array.isArray(foundIntake.batches)) {
          batches = foundIntake.batches.map((b) => ({
            id: b.id || b.name,
            name: b.name || b.id,
          }));
        }
      } else {
        // Collect batches across all intakes of this branch
        if (Array.isArray(selectedBranch.intakes)) {
          for (const i of selectedBranch.intakes) {
            if (Array.isArray(i.batches)) {
              for (const b of i.batches) {
                if (!batches.some((bt) => bt.id === (b.id || b.name))) {
                  batches.push({ id: b.id || b.name, name: b.name || b.id });
                }
              }
            }
          }
        }
      }
    }

    // Also include distinct batches from Student collection matching the branch / intake
    const studentBatchQuery = {};
    if (branchId) studentBatchQuery.branchId = { $regex: new RegExp(`^${branchId}$`, 'i') };
    if (intakeId) studentBatchQuery.intakeId = { $regex: new RegExp(`^${intakeId}$`, 'i') };
    const dbBatches = await Student.distinct('batchId', studentBatchQuery);
    for (const dbb of dbBatches) {
      if (dbb && !batches.some((b) => b.id.toLowerCase() === dbb.toLowerCase() || b.name.toLowerCase() === dbb.toLowerCase())) {
        batches.push({ id: dbb, name: dbb });
      }
    }

    // If still no batches (e.g. no branch selected yet), return all student batches
    if (batches.length === 0) {
      const allStudentBatches = await Student.distinct('batchId');
      for (const b of allStudentBatches) {
        if (b && !batches.some((bt) => bt.id.toLowerCase() === b.toLowerCase())) {
          batches.push({ id: b, name: b });
        }
      }
    }

    // 5. Available modules / subjects
    const lecturerSubjects = await Admin.distinct('subject', { role: 'lecturer', subject: { $ne: '' } });
    const studentCourses = await Student.distinct('course');
    const defaultModules = [
      'Aviation Safety Management',
      'Airport Operations',
      'Flight Operations & Dispatch',
      'Cabin Crew Professional Training',
      'Ticketing & Reservations',
      'Air Cargo & Logistics',
      'Aviation Security & Dangerous Goods',
      'Customer Service & Passenger Handling',
    ];
    const modules = Array.from(new Set([...defaultModules, ...lecturerSubjects, ...studentCourses])).filter(Boolean);

    return res.json({
      branches: branches.map((b) => ({
        id: b.id || b.name,
        name: b.name || b.id,
      })),
      intakes,
      batches,
      modules,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   2. FEEDBACK REQUEST MANAGEMENT
========================================================= */
export async function adminCreateFeedbackRequest(req, res, next) {
  try {
    const {
      branchId,
      intakeId = '',
      batchId,
      diplomaId = '',
      moduleId,
      lecturerId,
      feedbackWeek,
      startDate,
      endDate,
      targetStudents = 'all',
      selectedStudentIds = [],
      isRecurring = false,
      recurringDay = 5,
    } = req.body || {};

    const cleanBranchId = safeTrim(branchId);
    const cleanBatchId = safeTrim(batchId);
    const cleanModuleId = safeTrim(moduleId);
    const cleanLecturerId = safeTrim(lecturerId);
    const cleanWeek = safeTrim(feedbackWeek);

    if (!cleanBranchId) return res.status(400).json({ message: 'Branch is required' });
    if (!cleanBatchId) return res.status(400).json({ message: 'Batch is required' });
    if (!cleanModuleId) return res.status(400).json({ message: 'Module/Subject is required' });
    if (!cleanLecturerId) return res.status(400).json({ message: 'Lecturer is required' });
    if (!cleanWeek) return res.status(400).json({ message: 'Feedback week is required' });
    if (!startDate || !endDate) return res.status(400).json({ message: 'Start and Closing dates are required' });

    // Staff admin branch restriction check
    if (req.adminAuth?.role === 'staff' && req.adminAuth?.branchId) {
      if (cleanBranchId !== req.adminAuth.branchId) {
        return res.status(403).json({ message: 'You can only create feedback requests for your assigned branch' });
      }
    }

    // Verify lecturer exists and has role 'lecturer'
    const lecturer = await Admin.findById(cleanLecturerId).lean();
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(400).json({ message: 'Selected lecturer does not exist or is not a valid lecturer account.' });
    }

    // Check academic assignment warning
    let assignmentWarning = null;
    if (lecturer.batchId && lecturer.batchId !== cleanBatchId) {
      assignmentWarning = `Lecturer is assigned to batch "${lecturer.batchId}", but this request is for "${cleanBatchId}".`;
    }
    if (lecturer.subject && lecturer.subject.toLowerCase() !== cleanModuleId.toLowerCase()) {
      assignmentWarning = assignmentWarning
        ? `${assignmentWarning} Also lecturer subject is "${lecturer.subject}".`
        : `Lecturer's registered subject is "${lecturer.subject}".`;
    }

    const created = await FeedbackRequest.create({
      branchId: cleanBranchId,
      intakeId: safeTrim(intakeId),
      batchId: cleanBatchId,
      diplomaId: safeTrim(diplomaId),
      moduleId: cleanModuleId,
      lecturer: lecturer._id,
      feedbackWeek: cleanWeek,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      targetStudents: targetStudents === 'specific' ? 'specific' : 'all',
      selectedStudentIds: Array.isArray(selectedStudentIds)
        ? selectedStudentIds.map((id) => new mongoose.Types.ObjectId(String(id)))
        : [],
      isRecurring: Boolean(isRecurring),
      recurringDay: Number(recurringDay) || 5,
      status: 'Active',
      createdBy: new mongoose.Types.ObjectId(String(req.adminAuth?.id)),
    });

    const populated = await FeedbackRequest.findById(created._id)
      .populate('lecturer', 'name email lecturerId')
      .lean();

    return res.status(201).json({
      request: populated,
      warning: assignmentWarning,
      message: 'Feedback request created successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export async function adminListFeedbackRequests(req, res, next) {
  try {
    const branchFilter = getBranchFilter(req);
    const {
      branchId,
      intakeId,
      batchId,
      moduleId,
      lecturerId,
      status,
      feedbackWeek,
    } = req.query || {};

    const query = { ...branchFilter };

    if (branchId) query.branchId = safeTrim(branchId);
    if (intakeId) query.intakeId = safeTrim(intakeId);
    if (batchId) query.batchId = safeTrim(batchId);
    if (moduleId) query.moduleId = { $regex: safeTrim(moduleId), $options: 'i' };
    if (lecturerId) query.lecturer = safeTrim(lecturerId);
    if (status && status !== 'all') query.status = safeTrim(status);
    if (feedbackWeek) query.feedbackWeek = safeTrim(feedbackWeek);

    const requests = await FeedbackRequest.find(query)
      .populate('lecturer', 'name email lecturerId subject batchId')
      .sort({ createdAt: -1 })
      .lean();

    // Attach response counts & average ratings dynamically
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const responseCount = await Feedback.countDocuments({
          feedbackRequest: r._id,
          status: 'active',
        });

        let eligibleCount = 0;
        if (r.targetStudents === 'specific' && Array.isArray(r.selectedStudentIds)) {
          eligibleCount = r.selectedStudentIds.length;
        } else {
          eligibleCount = await Student.countDocuments({ batchId: r.batchId });
        }

        const avgAgg = await Feedback.aggregate([
          { $match: { feedbackRequest: r._id, status: 'active' } },
          { $group: { _id: null, avg: { $avg: '$rating' } } },
        ]);
        const averageRating = avgAgg.length > 0 ? Math.round(avgAgg[0].avg * 10) / 10 : 0;

        const summary = await FeedbackSummary.findOne({ feedbackRequest: r._id })
          .select('status sentAt averageRatings')
          .lean();

        return {
          ...r,
          id: String(r._id),
          responseCount,
          eligibleCount,
          averageRating,
          summaryStatus: summary?.status || 'None',
          sentAt: summary?.sentAt || null,
        };
      })
    );

    return res.json({ requests: enriched });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateFeedbackRequestStatus(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    const { status } = req.body || {};
    if (!id) return res.status(400).json({ message: 'Request ID is required' });

    const request = await FeedbackRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Feedback request not found' });

    if (req.adminAuth?.role === 'staff' && req.adminAuth?.branchId) {
      if (request.branchId !== req.adminAuth.branchId) {
        return res.status(403).json({ message: 'Unauthorized for this branch' });
      }
    }

    if (status && ['Active', 'Closed', 'Draft'].includes(status)) {
      request.status = status;
      await request.save();
    }

    return res.json({ ok: true, status: request.status });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   3. FEEDBACK SUMMARY GENERATION, APPROVAL & DELIVERY
========================================================= */
export async function adminGenerateFeedbackSummary(req, res, next) {
  try {
    const { requestId } = req.body || {};
    const cleanRequestId = safeTrim(requestId || req.params?.requestId);

    if (!cleanRequestId) {
      return res.status(400).json({ message: 'Feedback Request ID is required' });
    }

    const summary = await generateOrUpdateFeedbackSummary(cleanRequestId, req.adminAuth?.id);
    const populated = await FeedbackSummary.findById(summary._id)
      .populate('lecturer', 'name email lecturerId subject')
      .populate('feedbackRequest')
      .lean();

    return res.json({
      summary: populated,
      message: 'Feedback summary generated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export async function adminGetFeedbackSummary(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    if (!id) return res.status(400).json({ message: 'Summary ID is required' });

    const summary = await FeedbackSummary.findById(id)
      .populate('lecturer', 'name email lecturerId subject batchId')
      .populate('feedbackRequest')
      .lean();

    if (!summary) return res.status(404).json({ message: 'Feedback summary not found' });

    if (req.adminAuth?.role === 'staff' && req.adminAuth?.branchId) {
      if (summary.branchId && summary.branchId !== req.adminAuth.branchId) {
        return res.status(403).json({ message: 'Unauthorized for this branch' });
      }
    }

    return res.json({ summary });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateFeedbackSummary(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    const { recommendations, strengths, improvements, concerns } = req.body || {};

    if (!id) return res.status(400).json({ message: 'Summary ID is required' });

    const summary = await FeedbackSummary.findById(id);
    if (!summary) return res.status(404).json({ message: 'Feedback summary not found' });

    if (req.adminAuth?.role === 'staff' && req.adminAuth?.branchId) {
      if (summary.branchId && summary.branchId !== req.adminAuth.branchId) {
        return res.status(403).json({ message: 'Unauthorized for this branch' });
      }
    }

    if (typeof recommendations === 'string') {
      summary.recommendations = sanitizeText(recommendations);
    }
    if (Array.isArray(strengths)) {
      summary.strengths = strengths.map(sanitizeText).filter(Boolean);
    }
    if (Array.isArray(improvements)) {
      summary.improvements = improvements.map(sanitizeText).filter(Boolean);
    }
    if (Array.isArray(concerns)) {
      summary.concerns = concerns.map(sanitizeText).filter(Boolean);
    }

    summary.status = 'Under Review';
    await summary.save();

    return res.json({ summary, message: 'Summary updated successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function adminApproveFeedbackSummary(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    if (!id) return res.status(400).json({ message: 'Summary ID is required' });

    const summary = await FeedbackSummary.findById(id).populate('lecturer', 'name email lecturerId');
    if (!summary) return res.status(404).json({ message: 'Feedback summary not found' });

    if (req.adminAuth?.role === 'staff' && req.adminAuth?.branchId) {
      if (summary.branchId && summary.branchId !== req.adminAuth.branchId) {
        return res.status(403).json({ message: 'Unauthorized for this branch' });
      }
    }

    summary.status = 'Approved';
    summary.approvedBy = new mongoose.Types.ObjectId(String(req.adminAuth?.id));
    summary.approvedAt = new Date();
    await summary.save();

    return res.json({
      summary,
      message: `Summary approved for ${summary.lecturer?.name} (${summary.lecturer?.lecturerId}). Ready to send.`,
    });
  } catch (err) {
    next(err);
  }
}

export async function adminSendFeedbackSummary(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    if (!id) return res.status(400).json({ message: 'Summary ID is required' });

    const summary = await FeedbackSummary.findById(id).populate('lecturer', 'name email lecturerId');
    if (!summary) return res.status(404).json({ message: 'Feedback summary not found' });

    if (summary.status !== 'Approved' && summary.status !== 'Sent') {
      return res.status(400).json({
        message: 'Feedback summary must be approved by an administrator before sending to the lecturer.',
      });
    }

    summary.status = 'Sent';
    summary.sentBy = new mongoose.Types.ObjectId(String(req.adminAuth?.id));
    summary.sentAt = new Date();
    await summary.save();

    return res.json({
      summary,
      recipient: {
        name: summary.lecturer?.name,
        lecturerId: summary.lecturer?.lecturerId,
        email: summary.lecturer?.email,
      },
      message: `Feedback summary successfully delivered to ${summary.lecturer?.name} (${summary.lecturer?.lecturerId}).`,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   4. SUBMISSIONS & MODERATION (PRESERVED & ENHANCED)
========================================================= */
export async function adminListFeedback(req, res, next) {
  try {
    const branchFilter = getBranchFilter(req);
    const lecturerId = safeTrim(req.query?.lecturerId);
    const requestId = safeTrim(req.query?.requestId);
    const batchId = safeTrim(req.query?.batchId);
    const weekId = safeTrim(req.query?.weekId);
    const status = safeTrim(req.query?.status) || 'active';
    const ratingMin = toNumberOrNull(req.query?.ratingMin);
    const ratingMax = toNumberOrNull(req.query?.ratingMax);

    const q = { ...branchFilter };

    if (lecturerId) q.lecturer = lecturerId;
    if (requestId) q.feedbackRequest = requestId;
    if (batchId) q.batchId = batchId;
    if (weekId) q.weekId = weekId;
    if (status !== 'all') {
      q.status = status;
    }
    if (ratingMin != null || ratingMax != null) {
      q.rating = {};
      if (ratingMin != null) q.rating.$gte = ratingMin;
      if (ratingMax != null) q.rating.$lte = ratingMax;
    }

    const items = await Feedback.find(q)
      .populate('student', 'fullName studentId branchId batchId course')
      .populate('lecturer', 'name email lecturerId')
      .populate('feedbackRequest', 'feedbackWeek moduleId batchId branchId')
      .sort({ createdAt: -1 })
      .lean();

    const feedback = items.map((f) => ({
      id: String(f._id),
      student: {
        id: String(f.student?._id || ''),
        name: f.student?.fullName || '',
        studentId: f.student?.studentId || '',
        batchId: f.student?.batchId || '',
      },
      lecturer: {
        id: String(f.lecturer?._id || ''),
        name: f.lecturer?.name || '',
        lecturerId: f.lecturer?.lecturerId || '',
        email: f.lecturer?.email || '',
      },
      feedbackRequest: f.feedbackRequest
        ? {
            id: String(f.feedbackRequest._id),
            week: f.feedbackRequest.feedbackWeek,
            module: f.feedbackRequest.moduleId,
            batchId: f.feedbackRequest.batchId,
          }
        : null,
      weekId: f.weekId,
      weekRef: f.weekRef || f.feedbackRequest?.feedbackWeek || '',
      rating: f.rating,
      ratings: f.ratings || {
        teachingClarity: f.rating,
        subjectKnowledge: f.rating,
        communication: f.rating,
        studentEngagement: f.rating,
        overallExperience: f.rating,
      },
      comment: f.comment,
      positiveFeedback: f.positiveFeedback || '',
      improvementFeedback: f.improvementFeedback || '',
      learningDifficulties: f.learningDifficulties || '',
      concerns: f.concerns || '',
      suggestions: f.suggestions || '',
      submittedAt: f.createdAt,
      flagged: f.flagged === true,
      flaggedReasons: Array.isArray(f.flaggedReasons) ? f.flaggedReasons : [],
      status: f.status,
      removedAt: f.removedAt || null,
      removedReason: f.removedReason || '',
    }));

    return res.json({ feedback });
  } catch (err) {
    next(err);
  }
}

export async function adminFlagFeedback(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    const { flagged, reason } = req.body || {};
    if (!id) return res.status(400).json({ message: 'Feedback id is required' });

    const setFlag = flagged === true;
    const feedback = await Feedback.findById(id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    feedback.flagged = setFlag;
    feedback.flaggedAt = setFlag ? new Date() : undefined;
    feedback.flaggedBy = setFlag ? new mongoose.Types.ObjectId(String(req.adminAuth?.id)) : undefined;

    const safeReason = safeTrim(reason);
    if (setFlag && safeReason) {
      const reasons = Array.isArray(feedback.flaggedReasons) ? feedback.flaggedReasons : [];
      feedback.flaggedReasons = Array.from(new Set([...reasons, `manual:${safeReason}`]));
    }

    await feedback.save();

    await FeedbackModerationEvent.create({
      feedback: feedback._id,
      action: setFlag ? 'FLAG' : 'UNFLAG',
      reason: safeReason,
      actor: new mongoose.Types.ObjectId(String(req.adminAuth?.id)),
      at: new Date(),
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function adminRemoveFeedback(req, res, next) {
  try {
    const id = safeTrim(req.params?.id);
    const reason = (req.body && typeof req.body === 'object' ? req.body.reason : undefined) ?? req.query?.reason;
    if (!id) return res.status(400).json({ message: 'Feedback id is required' });

    const feedback = await Feedback.findById(id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    if (feedback.status === 'removed') return res.json({ ok: true });

    const safeReason = safeTrim(reason);
    feedback.status = 'removed';
    feedback.removedAt = new Date();
    feedback.removedBy = new mongoose.Types.ObjectId(String(req.adminAuth?.id));
    feedback.removedReason = safeReason;
    await feedback.save();

    await FeedbackModerationEvent.create({
      feedback: feedback._id,
      action: 'REMOVE',
      reason: safeReason,
      actor: new mongoose.Types.ObjectId(String(req.adminAuth?.id)),
      at: new Date(),
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function adminModerationLog(req, res, next) {
  try {
    const items = await FeedbackModerationEvent.find({})
      .populate('actor', 'name email role')
      .populate({
        path: 'feedback',
        populate: [
          { path: 'student', select: 'fullName studentId' },
          { path: 'lecturer', select: 'name lecturerId' },
        ],
      })
      .sort({ at: -1 })
      .limit(500)
      .lean();

    const events = items.map((e) => ({
      id: String(e._id),
      at: e.at,
      action: e.action,
      reason: e.reason || '',
      actor: {
        id: String(e.actor?._id || ''),
        name: e.actor?.name || '',
        role: e.actor?.role || '',
      },
      feedback: e.feedback
        ? {
            id: String(e.feedback._id),
            student: {
              name: e.feedback.student?.fullName || '',
              studentId: e.feedback.student?.studentId || '',
            },
            lecturer: {
              name: e.feedback.lecturer?.name || '',
              lecturerId: e.feedback.lecturer?.lecturerId || '',
            },
            weekRef: e.feedback.weekRef,
            rating: e.feedback.rating,
            comment: e.feedback.comment,
          }
        : null,
    }));

    return res.json({ events });
  } catch (err) {
    next(err);
  }
}

export async function adminGetBadWords(req, res, next) {
  try {
    const doc = await AppData.findOne({ key: 'feedbackBadWords' }).lean();
    const payload = doc?.payload && typeof doc.payload === 'object' ? doc.payload : { words: [] };
    const words = Array.isArray(payload.words) ? payload.words : [];
    return res.json({ words });
  } catch (err) {
    next(err);
  }
}

export async function adminSetBadWords(req, res, next) {
  try {
    const { words } = req.body || {};
    if (!Array.isArray(words)) return res.status(400).json({ message: 'words must be an array' });
    const normalized = words
      .filter((w) => typeof w === 'string')
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, 500);

    await AppData.updateOne(
      { key: 'feedbackBadWords' },
      { $set: { key: 'feedbackBadWords', payload: { words: normalized } } },
      { upsert: true }
    );

    return res.json({ ok: true, words: normalized });
  } catch (err) {
    next(err);
  }
}

export async function adminSendWeeklyReport(req, res, next) {
  try {
    const { lecturerId, weekId } = req.body || {};
    const safeLecturerId = safeTrim(lecturerId);
    const safeWeekId = safeTrim(weekId);

    if (!safeLecturerId) return res.status(400).json({ message: 'lecturerId is required' });
    if (!safeWeekId) return res.status(400).json({ message: 'weekId is required' });

    const lecturer = await Admin.findById(safeLecturerId).select('role name lecturerId').lean();
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(400).json({ message: 'Invalid lecturer' });
    }

    const sample = await Feedback.findOne({ lecturer: safeLecturerId, weekId: safeWeekId })
      .select('weekRef weekStart weekEnd')
      .lean();
    const fallback = computeWeekPeriodUTC(new Date());
    const weekRef = sample?.weekRef || fallback.weekRef;
    const weekStart = sample?.weekStart || fallback.weekStart;
    const weekEnd = sample?.weekEnd || fallback.weekEnd;

    const items = await Feedback.find({ lecturer: safeLecturerId, weekId: safeWeekId, status: 'active' })
      .select('rating comment')
      .sort({ createdAt: 1 })
      .lean();

    const total = items.length;
    const sum = items.reduce((acc, it) => acc + (Number(it.rating) || 0), 0);
    const averageRating = total === 0 ? 0 : Math.round((sum / total) * 100) / 100;

    const report = await FeedbackReport.create({
      lecturer: new mongoose.Types.ObjectId(String(safeLecturerId)),
      weekId: safeWeekId,
      weekRef,
      weekStart,
      weekEnd,
      total,
      averageRating,
      entries: items.map((it) => ({ rating: it.rating, comment: it.comment })),
      sentBy: new mongoose.Types.ObjectId(String(req.adminAuth?.id)),
      sentAt: new Date(),
    });

    return res.status(201).json({
      report: {
        id: String(report._id),
        lecturer: { id: safeLecturerId, name: lecturer.name, lecturerId: lecturer.lecturerId },
        weekId: safeWeekId,
        weekRef,
        total,
        averageRating,
        sentAt: report.sentAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
