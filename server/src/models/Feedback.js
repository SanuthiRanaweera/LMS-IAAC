import mongoose from 'mongoose';

const { Schema } = mongoose;

const FeedbackRatingsSchema = new Schema(
  {
    teachingClarity: { type: Number, min: 1, max: 5, default: 5 },
    subjectKnowledge: { type: Number, min: 1, max: 5, default: 5 },
    communication: { type: Number, min: 1, max: 5, default: 5 },
    studentEngagement: { type: Number, min: 1, max: 5, default: 5 },
    overallExperience: { type: Number, min: 1, max: 5, default: 5 },
  },
  { _id: false }
);

const FeedbackSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    lecturer: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },

    feedbackRequest: {
      type: Schema.Types.ObjectId,
      ref: 'FeedbackRequest',
      index: true,
      default: null,
    },

    branchId: { type: String, trim: true, default: '' },
    batchId: { type: String, trim: true, default: '' },
    moduleId: { type: String, trim: true, default: '' },

    weekId: { type: String, trim: true, maxlength: 16, index: true },
    weekRef: { type: String, trim: true, maxlength: 40 },
    weekStart: { type: Date, index: true },
    weekEnd: { type: Date },

    // Single rating for backward compatibility
    rating: { type: Number, min: 1, max: 5, index: true, default: 5 },
    // Detailed 5-category ratings
    ratings: { type: FeedbackRatingsSchema, default: () => ({}) },

    // Single comment for backward compatibility
    comment: { type: String, trim: true, maxlength: 2000, default: '' },

    // Detailed 5 written comment fields
    positiveFeedback: { type: String, trim: true, maxlength: 1500, default: '' },
    improvementFeedback: { type: String, trim: true, maxlength: 1500, default: '' },
    learningDifficulties: { type: String, trim: true, maxlength: 1500, default: '' },
    concerns: { type: String, trim: true, maxlength: 1500, default: '' },
    suggestions: { type: String, trim: true, maxlength: 1500, default: '' },

    flagged: { type: Boolean, default: false, index: true },
    flaggedReasons: { type: [String], default: [] },
    flaggedAt: { type: Date },
    flaggedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },

    status: { type: String, trim: true, enum: ['active', 'removed'], default: 'active', index: true },
    removedAt: { type: Date },
    removedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    removedReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

// Indexes
FeedbackSchema.index({ student: 1, lecturer: 1, weekId: 1 });
FeedbackSchema.index({ feedbackRequest: 1, student: 1 }, { sparse: true });
FeedbackSchema.index({ feedbackRequest: 1, status: 1 });

export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
