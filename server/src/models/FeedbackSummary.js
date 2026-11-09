import mongoose from 'mongoose';

const { Schema } = mongoose;

const FeedbackSummarySchema = new Schema(
  {
    lecturer: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true,
    },
    feedbackRequest: {
      type: Schema.Types.ObjectId,
      ref: 'FeedbackRequest',
      required: true,
      index: true,
    },
    branchId: {
      type: String,
      trim: true,
      default: '',
    },
    batchId: {
      type: String,
      trim: true,
      default: '',
    },
    moduleId: {
      type: String,
      trim: true,
      default: '',
    },
    feedbackPeriod: {
      type: String,
      required: true,
      trim: true,
    },
    totalEligible: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalResponses: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    responseRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    averageRatings: {
      teachingClarity: { type: Number, default: 0, min: 0, max: 5 },
      subjectKnowledge: { type: Number, default: 0, min: 0, max: 5 },
      communication: { type: Number, default: 0, min: 0, max: 5 },
      studentEngagement: { type: Number, default: 0, min: 0, max: 5 },
      overallExperience: { type: Number, default: 0, min: 0, max: 5 },
      overall: { type: Number, default: 0, min: 0, max: 5 },
    },
    strengths: {
      type: [String],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
    concerns: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: String,
      trim: true,
      default: '',
    },
    privacyProtected: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['Draft', 'Under Review', 'Approved', 'Sent'],
      default: 'Draft',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

FeedbackSummarySchema.index({ lecturer: 1, status: 1, sentAt: -1 });
FeedbackSummarySchema.index({ feedbackRequest: 1, lecturer: 1 });

export const FeedbackSummary =
  mongoose.models.FeedbackSummary ||
  mongoose.model('FeedbackSummary', FeedbackSummarySchema);
