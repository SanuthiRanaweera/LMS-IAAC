import mongoose from 'mongoose';
import { Feedback } from '../models/Feedback.js';
import { FeedbackReport } from '../models/FeedbackReport.js';
import { FeedbackModerationEvent } from '../models/FeedbackModerationEvent.js';
import { AppData } from '../models/AppData.js';
import { Admin } from '../models/Admin.js';
import { computeWeekPeriodUTC } from '../utils/weekPeriod.js';

function safeTrim(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function adminListFeedback(req, res, next) {
  try {
    const lecturerId = safeTrim(req.query?.lecturerId);
    const weekId = safeTrim(req.query?.weekId);
    const status = safeTrim(req.query?.status) || 'active';
    const ratingMin = toNumberOrNull(req.query?.ratingMin);
    const ratingMax = toNumberOrNull(req.query?.ratingMax);

    const q = {};

    if (lecturerId) q.lecturer = lecturerId;
    if (weekId) q.weekId = weekId;
    if (status === 'all') {
      // no-op
    } else {
      q.status = status;
    }
    if (ratingMin != null || ratingMax != null) {
      q.rating = {};
      if (ratingMin != null) q.rating.$gte = ratingMin;
      if (ratingMax != null) q.rating.$lte = ratingMax;
    }

    const items = await Feedback.find(q)
      .populate('student', 'fullName studentId')
      .populate('lecturer', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const feedback = items.map((f) => ({
      id: String(f._id),
      student: {
        id: String(f.student?._id || ''),
        name: f.student?.fullName || '',
        studentId: f.student?.studentId || '',
      },
      lecturer: {
        id: String(f.lecturer?._id || ''),
        name: f.lecturer?.name || '',
      },
      weekId: f.weekId,
      weekRef: f.weekRef,
      rating: f.rating,
      comment: f.comment,
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
      .populate({ path: 'feedback', populate: [{ path: 'student', select: 'fullName studentId' }, { path: 'lecturer', select: 'name' }] })
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

    const lecturer = await Admin.findById(safeLecturerId).select('role name').lean();
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(400).json({ message: 'Invalid lecturer' });
    }

    // Week boundaries are derived from current time if weekId matches current week.
    // For past weeks, we rely on stored weekStart/weekEnd from feedback records.
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
        lecturer: { id: safeLecturerId, name: lecturer.name },
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
