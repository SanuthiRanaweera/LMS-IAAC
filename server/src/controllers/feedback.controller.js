import mongoose from 'mongoose';
import { Admin } from '../models/Admin.js';
import { Student } from '../models/Student.js';
import { Feedback } from '../models/Feedback.js';
import { FeedbackRequest } from '../models/FeedbackRequest.js';
import { FeedbackSummary } from '../models/FeedbackSummary.js';
import { FeedbackReport } from '../models/FeedbackReport.js';
import { computeWeekPeriodUTC } from '../utils/weekPeriod.js';
import {
  checkBadWords,
  safeTrim,
  sanitizeText,
} from '../services/feedbackManagement.service.js';

/* =========================================================
   1. STUDENT AVAILABLE FEEDBACK REQUESTS & SUBMISSIONS
========================================================= */

/**
 * Retrieves feedback requests available to the authenticated student based on batch.
 */
export async function getAvailableStudentFeedbackRequests(req, res, next) {
  try {
    if (req.auth?.role !== 'student') {
      return res.status(403).json({ message: 'Student access required' });
    }

    const studentId = req.auth?.sub;
    const student = await Student.findById(studentId)
      .select('fullName studentId branchId batchId course')
      .lean();

    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    // Find requests matching student's batch
    const now = new Date();
    const requests = await FeedbackRequest.find({
      $or: [
        { batchId: student.batchId, targetStudents: 'all' },
        { batchId: student.batchId, targetStudents: 'specific', selectedStudentIds: student._id },
        { branchId: student.branchId, batchId: student.batchId },
      ],
      status: { $in: ['Active', 'Closed'] },
    })
      .populate('lecturer', 'name email lecturerId subject')
      .sort({ createdAt: -1 })
      .lean();

    // Map each request to display card with submission status
    const cards = await Promise.all(
      requests.map(async (reqDoc) => {
        const existing = await Feedback.findOne({
          feedbackRequest: reqDoc._id,
          student: student._id,
          status: 'active',
        }).select('_id rating ratings createdAt').lean();

        const hasSubmitted = !!existing;
        const isExpired = now > new Date(reqDoc.endDate) || reqDoc.status === 'Closed';

        let feedbackStatus = 'Not Submitted';
        if (hasSubmitted) {
          feedbackStatus = 'Submitted';
        } else if (isExpired) {
          feedbackStatus = 'Closed';
        }

        const canSubmit = !hasSubmitted && !isExpired && reqDoc.status === 'Active';

        return {
          id: String(reqDoc._id),
          lecturerName: reqDoc.lecturer?.name || 'Lecturer',
          lecturerId: reqDoc.lecturer?.lecturerId || '',
          lecturerMongoId: String(reqDoc.lecturer?._id || ''),
          moduleName: reqDoc.moduleId,
          batch: reqDoc.batchId,
          branch: reqDoc.branchId,
          feedbackWeek: reqDoc.feedbackWeek,
          startDate: reqDoc.startDate,
          submissionDeadline: reqDoc.endDate,
          feedbackStatus,
          canSubmit,
          hasSubmitted,
          submittedAt: existing?.createdAt || null,
        };
      })
    );

    return res.json({
      student: {
        name: student.fullName,
        studentId: student.studentId,
        batch: student.batchId,
      },
      requests: cards,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles professional 5-point rating across 5 categories + optional qualitative comments.
 */
export async function submitStudentFeedbackRequest(req, res, next) {
  try {
    if (req.auth?.role !== 'student') {
      return res.status(403).json({ message: 'Student access required' });
    }

    const studentId = req.auth?.sub;
    const {
      feedbackRequestId,
      ratings = {},
      positiveFeedback = '',
      improvementFeedback = '',
      learningDifficulties = '',
      concerns = '',
      suggestions = '',
    } = req.body || {};

    const cleanRequestId = safeTrim(feedbackRequestId);
    if (!cleanRequestId) {
      return res.status(400).json({ message: 'Feedback request ID is required' });
    }

    const request = await FeedbackRequest.findById(cleanRequestId)
      .populate('lecturer', 'name email lecturerId')
      .lean();

    if (!request) {
      return res.status(404).json({ message: 'Feedback request not found' });
    }

    // Verify submission period is open
    const now = new Date();
    if (request.status !== 'Active' || now > new Date(request.endDate)) {
      return res.status(400).json({ message: 'This feedback request is closed or has expired.' });
    }

    // Verify student eligibility
    const student = await Student.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    if (request.targetStudents === 'specific') {
      const isSelected = (request.selectedStudentIds || []).some(
        (id) => String(id) === String(student._id)
      );
      if (!isSelected) {
        return res.status(403).json({ message: 'You are not assigned to this feedback request.' });
      }
    } else if (request.batchId && student.batchId && request.batchId !== student.batchId) {
      return res.status(403).json({ message: 'This feedback request is for a different batch.' });
    }

    // Prevent duplicate submission
    const existing = await Feedback.findOne({
      feedbackRequest: request._id,
      student: student._id,
      status: 'active',
    });
    if (existing) {
      return res.status(409).json({ message: 'You have already submitted feedback for this request.' });
    }

    // Validate 5 rating categories (each 1 - 5)
    const {
      teachingClarity,
      subjectKnowledge,
      communication,
      studentEngagement,
      overallExperience,
    } = ratings;

    const parseRating = (val, name) => {
      const n = Number(val);
      if (!Number.isFinite(n) || n < 1 || n > 5) {
        throw new Error(`Rating for ${name} must be between 1 and 5.`);
      }
      return n;
    };

    let rClarity, rKnowledge, rComm, rEngage, rOverall;
    try {
      rClarity = parseRating(teachingClarity, 'Teaching Clarity');
      rKnowledge = parseRating(subjectKnowledge, 'Subject Knowledge');
      rComm = parseRating(communication, 'Communication');
      rEngage = parseRating(studentEngagement, 'Student Engagement');
      rOverall = parseRating(overallExperience, 'Overall Experience');
    } catch (valErr) {
      return res.status(400).json({ message: valErr.message });
    }

    const overallAvg = Math.round(((rClarity + rKnowledge + rComm + rEngage + rOverall) / 5) * 10) / 10;

    // Sanitize comment fields
    const cleanPositive = sanitizeText(positiveFeedback).slice(0, 1500);
    const cleanImprovement = sanitizeText(improvementFeedback).slice(0, 1500);
    const cleanDifficulties = sanitizeText(learningDifficulties).slice(0, 1500);
    const cleanConcerns = sanitizeText(concerns).slice(0, 1500);
    const cleanSuggestions = sanitizeText(suggestions).slice(0, 1500);

    // Check bad words across all comments
    const allText = `${cleanPositive} ${cleanImprovement} ${cleanDifficulties} ${cleanConcerns} ${cleanSuggestions}`;
    const badMatches = await checkBadWords(allText);
    const shouldFlag = badMatches.length > 0;

    const weekPeriod = computeWeekPeriodUTC(new Date());

    const created = await Feedback.create({
      student: student._id,
      lecturer: request.lecturer._id,
      feedbackRequest: request._id,
      branchId: request.branchId,
      batchId: request.batchId,
      moduleId: request.moduleId,
      weekId: weekPeriod.weekId,
      weekRef: request.feedbackWeek || weekPeriod.weekRef,
      weekStart: request.startDate || weekPeriod.weekStart,
      weekEnd: request.endDate || weekPeriod.weekEnd,
      rating: Math.round(overallAvg),
      ratings: {
        teachingClarity: rClarity,
        subjectKnowledge: rKnowledge,
        communication: rComm,
        studentEngagement: rEngage,
        overallExperience: rOverall,
      },
      comment: cleanPositive || cleanImprovement || 'Submitted feedback',
      positiveFeedback: cleanPositive,
      improvementFeedback: cleanImprovement,
      learningDifficulties: cleanDifficulties,
      concerns: cleanConcerns,
      suggestions: cleanSuggestions,
      flagged: shouldFlag,
      flaggedReasons: shouldFlag ? badMatches.map((w) => `keyword:${w}`) : [],
      flaggedAt: shouldFlag ? new Date() : undefined,
    });

    return res.status(201).json({
      message: 'Thank you! Your feedback has been submitted successfully.',
      feedbackId: String(created._id),
      submittedAt: created.createdAt,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'You have already submitted feedback for this request.' });
    }
    next(err);
  }
}

/* =========================================================
   2. LECTURER MY FEEDBACK (STRICT DATA ISOLATION)
========================================================= */

/**
 * Retrieves approved & sent feedback summaries strictly for the logged-in lecturer.
 */
export async function getLecturerFeedbackSummaries(req, res, next) {
  try {
    // Lecturer can be authenticated through JWT or session cookie
    const role = req.adminAuth?.role || req.auth?.role;
    if (role !== 'lecturer') {
      return res.status(403).json({ message: 'Lecturer access required' });
    }

    const lecturerId = req.adminAuth?.id || req.auth?.sub;
    if (!lecturerId) {
      return res.status(401).json({ message: 'Unauthenticated lecturer' });
    }

    // STRICT: Only 'Sent' summaries belonging to this exact lecturer MongoDB ID
    const summaries = await FeedbackSummary.find({
      lecturer: new mongoose.Types.ObjectId(String(lecturerId)),
      status: 'Sent',
    })
      .select('-createdBy -approvedBy -sentBy')
      .sort({ sentAt: -1 })
      .lean();

    const formatted = summaries.map((s) => ({
      id: String(s._id),
      module: s.moduleId,
      batch: s.batchId,
      branch: s.branchId,
      feedbackPeriod: s.feedbackPeriod,
      averageRating: s.averageRatings?.overall || 0,
      averageRatings: s.averageRatings,
      // If privacy protected (< 5 responses), do not expose exact count
      responsesCount: s.privacyProtected ? 'Confidential (<5)' : s.totalResponses,
      dateShared: s.sentAt,
      status: 'Official Report',
      strengths: s.strengths || [],
      improvements: s.improvements || [],
      concerns: s.concerns || [],
      recommendations: s.recommendations || '',
    }));

    return res.json({ summaries: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves an individual authorized feedback summary for the logged-in lecturer.
 */
export async function getLecturerFeedbackSummaryById(req, res, next) {
  try {
    const role = req.adminAuth?.role || req.auth?.role;
    if (role !== 'lecturer') {
      return res.status(403).json({ message: 'Lecturer access required' });
    }

    const lecturerId = req.adminAuth?.id || req.auth?.sub;
    const summaryId = safeTrim(req.params?.summaryId);

    if (!summaryId) {
      return res.status(400).json({ message: 'Summary ID is required' });
    }

    const summary = await FeedbackSummary.findById(summaryId)
      .populate('lecturer', 'name lecturerId')
      .lean();

    if (!summary) {
      return res.status(404).json({ message: 'Feedback summary not found' });
    }

    // STRICT DATA ISOLATION: Must belong to logged-in lecturer and must be 'Sent'
    if (String(summary.lecturer?._id || summary.lecturer) !== String(lecturerId)) {
      return res.status(403).json({ message: 'Access denied. You can only view your own feedback summaries.' });
    }

    if (summary.status !== 'Sent') {
      return res.status(403).json({ message: 'This feedback summary is not yet available for viewing.' });
    }

    return res.json({
      summary: {
        id: String(summary._id),
        lecturerName: summary.lecturer?.name,
        lecturerId: summary.lecturer?.lecturerId,
        module: summary.moduleId,
        batch: summary.batchId,
        branch: summary.branchId,
        feedbackPeriod: summary.feedbackPeriod,
        averageRatings: summary.averageRatings,
        responsesCount: summary.privacyProtected ? 'Confidential (<5)' : summary.totalResponses,
        strengths: summary.strengths || [],
        improvements: summary.improvements || [],
        concerns: summary.concerns || [],
        recommendations: summary.recommendations || '',
        sentAt: summary.sentAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   3. LEGACY ENDPOINTS (PRESERVED FOR COMPATIBILITY)
========================================================= */

function studentFeedbackItem(doc) {
  return {
    id: String(doc._id),
    lecturer: {
      id: String(doc.lecturer?._id || doc.lecturer),
      name: doc.lecturer?.name || '',
      lecturerId: doc.lecturer?.lecturerId || '',
    },
    weekId: doc.weekId,
    weekRef: doc.weekRef,
    rating: doc.rating,
    comment: doc.comment,
    submittedAt: doc.createdAt,
  };
}

export async function getStudentFeedbackHistory(req, res, next) {
  try {
    if (req.auth?.role !== 'student') {
      return res.status(403).json({ message: 'Student access required' });
    }
    const studentId = req.auth?.sub;
    const items = await Feedback.find({ student: studentId, status: 'active' })
      .populate('lecturer', 'name lecturerId')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ feedback: items.map(studentFeedbackItem) });
  } catch (err) {
    next(err);
  }
}

export async function getStudentFeedbackStatus(req, res, next) {
  try {
    if (req.auth?.role !== 'student') {
      return res.status(403).json({ message: 'Student access required' });
    }

    const lecturerId = safeTrim(req.query?.lecturerId);
    if (!lecturerId) return res.status(400).json({ message: 'lecturerId is required' });

    const { weekId, weekRef, weekStart, weekEnd } = computeWeekPeriodUTC(new Date());
    const studentId = req.auth?.sub;

    const existing = await Feedback.findOne({
      student: studentId,
      lecturer: lecturerId,
      weekId,
    })
      .select('_id status')
      .lean();

    const hasSubmitted = !!(existing && existing.status === 'active');

    return res.json({
      weekId,
      weekRef,
      weekStart,
      weekEnd,
      hasSubmitted,
    });
  } catch (err) {
    next(err);
  }
}

export async function submitStudentFeedback(req, res, next) {
  try {
    if (req.auth?.role !== 'student') {
      return res.status(403).json({ message: 'Student access required' });
    }

    const studentId = req.auth?.sub;
    const { lecturerId, rating, comment } = req.body || {};

    const safeLecturerId = safeTrim(lecturerId);
    const safeComment = safeTrim(comment);
    const numRating = Number(rating);

    if (!safeLecturerId) return res.status(400).json({ message: 'Lecturer is required' });
    if (!Number.isFinite(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Star rating (1 to 5) is required' });
    }
    if (!safeComment) return res.status(400).json({ message: 'Comment is required' });
    if (safeComment.length > 500) return res.status(400).json({ message: 'Comment must be 500 characters or less' });

    const lecturer = await Admin.findById(safeLecturerId).select('role name').lean();
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(400).json({ message: 'Invalid lecturer' });
    }

    const { weekId, weekRef, weekStart, weekEnd } = computeWeekPeriodUTC(new Date());

    const badWords = await checkBadWords(safeComment);
    const shouldFlag = badWords.length > 0;

    const created = await Feedback.create({
      student: new mongoose.Types.ObjectId(String(studentId)),
      lecturer: new mongoose.Types.ObjectId(String(safeLecturerId)),
      weekId,
      weekRef,
      weekStart,
      weekEnd,
      rating: numRating,
      comment: safeComment,
      flagged: shouldFlag,
      flaggedReasons: shouldFlag ? badMatches.map((w) => `keyword:${w}`) : [],
      flaggedAt: shouldFlag ? new Date() : undefined,
    });

    return res.status(201).json({
      feedback: {
        id: String(created._id),
        lecturer: { id: String(safeLecturerId), name: lecturer.name },
        weekId,
        weekRef,
        rating: created.rating,
        comment: created.comment,
        submittedAt: created.createdAt,
        flagged: created.flagged === true,
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: 'You have already submitted feedback for this lecturer this week.',
      });
    }
    next(err);
  }
}

export async function listLecturerFeedbackReports(req, res, next) {
  try {
    const role = req.adminAuth?.role || req.auth?.role;
    if (role !== 'lecturer') {
      return res.status(403).json({ message: 'Lecturer access required' });
    }

    const lecturerId = req.adminAuth?.id || req.auth?.sub;
    const reports = await FeedbackReport.find({ lecturer: lecturerId })
      .select('weekId weekRef weekStart weekEnd total averageRating entries sentAt')
      .sort({ sentAt: -1 })
      .lean();

    return res.json({ reports });
  } catch (err) {
    next(err);
  }
}
