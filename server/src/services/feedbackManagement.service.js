import mongoose from 'mongoose';
import { Feedback } from '../models/Feedback.js';
import { FeedbackRequest } from '../models/FeedbackRequest.js';
import { FeedbackSummary } from '../models/FeedbackSummary.js';
import { Student } from '../models/Student.js';
import { Admin } from '../models/Admin.js';
import { AppData } from '../models/AppData.js';

export function safeTrim(v) {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Strips potential HTML/script tags from comments to prevent XSS.
 */
export function sanitizeText(text) {
  return String(text || '')
    .replace(/<[^>]*>?/gm, '')
    .trim();
}

/**
 * Checks comment text against stored bad-words list.
 */
export async function checkBadWords(text) {
  try {
    const doc = await AppData.findOne({ key: 'feedbackBadWords' }).lean();
    const payload = doc?.payload && typeof doc.payload === 'object' ? doc.payload : {};
    const words = Array.isArray(payload.words) ? payload.words : [];
    const lower = String(text || '').toLowerCase();
    const matches = [];
    for (const w of words) {
      const word = String(w || '').trim();
      if (word && lower.includes(word.toLowerCase())) {
        matches.push(word);
      }
    }
    return matches;
  } catch {
    return [];
  }
}

/**
 * Computes multi-category rating statistics and extracts recurring feedback themes.
 */
export function computeFeedbackStats(submissions = []) {
  const activeItems = submissions.filter((s) => s.status === 'active');
  const count = activeItems.length;

  if (count === 0) {
    return {
      total: 0,
      averageRatings: {
        teachingClarity: 0,
        subjectKnowledge: 0,
        communication: 0,
        studentEngagement: 0,
        overallExperience: 0,
        overall: 0,
      },
      strengths: [],
      improvements: [],
      concerns: [],
      recommendations: 'No feedback submissions received yet for this session.',
      privacyProtected: true,
    };
  }

  let sumClarity = 0;
  let sumKnowledge = 0;
  let sumComm = 0;
  let sumEngage = 0;
  let sumExperience = 0;
  let sumOverall = 0;

  const strengthsList = [];
  const improvementsList = [];
  const concernsList = [];

  for (const item of activeItems) {
    const r = item.ratings || {};
    const clarity = Number(r.teachingClarity) || Number(item.rating) || 5;
    const knowledge = Number(r.subjectKnowledge) || Number(item.rating) || 5;
    const comm = Number(r.communication) || Number(item.rating) || 5;
    const engage = Number(r.studentEngagement) || Number(item.rating) || 5;
    const exp = Number(r.overallExperience) || Number(item.rating) || 5;
    const overall = (clarity + knowledge + comm + engage + exp) / 5;

    sumClarity += clarity;
    sumKnowledge += knowledge;
    sumComm += comm;
    sumEngage += engage;
    sumExperience += exp;
    sumOverall += overall;

    if (item.positiveFeedback) strengthsList.push(sanitizeText(item.positiveFeedback));
    if (item.improvementFeedback) improvementsList.push(sanitizeText(item.improvementFeedback));
    if (item.learningDifficulties) concernsList.push(sanitizeText(item.learningDifficulties));
    if (item.concerns) concernsList.push(sanitizeText(item.concerns));
    if (item.comment && !item.positiveFeedback) {
      if (item.rating >= 4) strengthsList.push(sanitizeText(item.comment));
      else improvementsList.push(sanitizeText(item.comment));
    }
  }

  const round2 = (n) => Math.round((n / count) * 10) / 10;

  const averageRatings = {
    teachingClarity: round2(sumClarity),
    subjectKnowledge: round2(sumKnowledge),
    communication: round2(sumComm),
    studentEngagement: round2(sumEngage),
    overallExperience: round2(sumExperience),
    overall: round2(sumOverall),
  };

  // Privacy threshold: if responses < 5, protect privacy by generalizing comments
  const privacyProtected = count < 5;

  let finalStrengths = [];
  let finalImprovements = [];
  let finalConcerns = [];

  if (privacyProtected) {
    finalStrengths = strengthsList.length > 0
      ? ['Students expressed appreciation for the lecturer’s subject knowledge and lecture delivery.']
      : ['General positive feedback on lecture delivery.'];
    finalImprovements = improvementsList.length > 0
      ? ['Students suggested further interactive examples and paced explanations.']
      : [];
    finalConcerns = concernsList.length > 0
      ? ['Minor student learning queries noted for review during practical sessions.']
      : [];
  } else {
    // Unique top mentions
    finalStrengths = Array.from(new Set(strengthsList.filter(Boolean))).slice(0, 6);
    finalImprovements = Array.from(new Set(improvementsList.filter(Boolean))).slice(0, 6);
    finalConcerns = Array.from(new Set(concernsList.filter(Boolean))).slice(0, 5);
  }

  // Construct recommendations based on lowest category rating
  const lowestCat = Object.entries(averageRatings)
    .filter(([k]) => k !== 'overall')
    .sort((a, b) => a[1] - b[1])[0];

  let recommendations = 'Maintain strong teaching performance and continue engaging students.';
  if (lowestCat && lowestCat[1] < 3.5) {
    const catName = lowestCat[0].replace(/([A-Z])/g, ' $1').toLowerCase();
    recommendations = `Focus on improving ${catName} through more interactive demonstrations, structured checkpoints, and open student Q&A segments.`;
  } else if (averageRatings.overall >= 4.5) {
    recommendations = 'Outstanding student feedback. Continue the commendable teaching methodology and subject delivery.';
  }

  return {
    total: count,
    averageRatings,
    strengths: finalStrengths,
    improvements: finalImprovements,
    concerns: finalConcerns,
    recommendations,
    privacyProtected,
  };
}

/**
 * Generates or updates a structured feedback summary for a given feedback request.
 */
export async function generateOrUpdateFeedbackSummary(requestId, adminUserId) {
  const request = await FeedbackRequest.findById(requestId)
    .populate('lecturer', 'name email lecturerId')
    .lean();

  if (!request) {
    throw new Error('Feedback request not found.');
  }

  // Count eligible students in the batch
  let totalEligible = 0;
  if (request.targetStudents === 'specific' && Array.isArray(request.selectedStudentIds)) {
    totalEligible = request.selectedStudentIds.length;
  } else {
    totalEligible = await Student.countDocuments({
      batchId: request.batchId,
      status: { $ne: 'inactive' },
    });
  }

  // Fetch all active submissions for this request
  const submissions = await Feedback.find({
    feedbackRequest: request._id,
    status: 'active',
  }).lean();

  const stats = computeFeedbackStats(submissions);
  const responseRate = totalEligible > 0
    ? Math.round((stats.total / totalEligible) * 1000) / 10
    : 0;

  const feedbackPeriod = `${request.feedbackWeek} (${new Date(request.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(request.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;

  let summary = await FeedbackSummary.findOne({ feedbackRequest: request._id });

  if (summary) {
    summary.totalEligible = totalEligible;
    summary.totalResponses = stats.total;
    summary.responseRate = responseRate;
    summary.averageRatings = stats.averageRatings;
    summary.strengths = stats.strengths;
    summary.improvements = stats.improvements;
    summary.concerns = stats.concerns;
    summary.recommendations = stats.recommendations;
    summary.privacyProtected = stats.privacyProtected;
    summary.feedbackPeriod = feedbackPeriod;
    if (summary.status === 'Sent') {
      // Keep as Sent or mark as updated
    } else {
      summary.status = 'Draft';
    }
    await summary.save();
  } else {
    summary = await FeedbackSummary.create({
      lecturer: request.lecturer._id,
      feedbackRequest: request._id,
      branchId: request.branchId,
      batchId: request.batchId,
      moduleId: request.moduleId,
      feedbackPeriod,
      totalEligible,
      totalResponses: stats.total,
      responseRate,
      averageRatings: stats.averageRatings,
      strengths: stats.strengths,
      improvements: stats.improvements,
      concerns: stats.concerns,
      recommendations: stats.recommendations,
      privacyProtected: stats.privacyProtected,
      status: 'Draft',
      createdBy: new mongoose.Types.ObjectId(String(adminUserId)),
    });
  }

  return summary;
}
