import mongoose from 'mongoose';
import { Admin } from '../models/Admin.js';
import { Feedback } from '../models/Feedback.js';
import { FeedbackReport } from '../models/FeedbackReport.js';
import { AppData } from '../models/AppData.js';
import { computeWeekPeriodUTC } from '../utils/weekPeriod.js';

function safeTrim(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function badWordMatches(comment, words) {
  const text = String(comment || '');
  const lower = text.toLowerCase();
  const matched = [];
  for (const w of words) {
    const word = String(w || '').trim();
    if (!word) continue;
    if (lower.includes(word.toLowerCase())) matched.push(word);
  }
  return matched;
}

async function loadBadWords() {
  const doc = await AppData.findOne({ key: 'feedbackBadWords' }).lean();
  const payload = doc?.payload && typeof doc.payload === 'object' ? doc.payload : {};
  const words = Array.isArray(payload.words) ? payload.words : [];
  return words.filter((w) => typeof w === 'string' && w.trim()).map((w) => w.trim());
}

function studentFeedbackItem(doc) {
  return {
    id: String(doc._id),
    lecturer: {
      id: String(doc.lecturer?._id || doc.lecturer),
      name: doc.lecturer?.name || '',
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
      .populate('lecturer', 'name')
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

    try {
      const words = await loadBadWords();
      const matches = badWordMatches(safeComment, words);
      const shouldFlag = matches.length > 0;

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
        flaggedReasons: shouldFlag ? matches.map((w) => `keyword:${w}`) : [],
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
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

export async function listLecturerFeedbackReports(req, res, next) {
  try {
    if (req.auth?.role !== 'lecturer') {
      return res.status(403).json({ message: 'Lecturer access required' });
    }

    const lecturerId = req.auth?.sub;
    const reports = await FeedbackReport.find({ lecturer: lecturerId })
      .select('weekId weekRef weekStart weekEnd total averageRating entries sentAt')
      .sort({ sentAt: -1 })
      .lean();

    // Entries are already anonymized by design (no student fields).
    return res.json({ reports });
  } catch (err) {
    next(err);
  }
}
