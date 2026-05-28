import mongoose from 'mongoose';

const { Schema } = mongoose;

const FeedbackReportEntrySchema = new Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const FeedbackReportSchema = new Schema(
  {
    lecturer: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    weekId: { type: String, required: true, trim: true, maxlength: 16, index: true },
    weekRef: { type: String, required: true, trim: true, maxlength: 40 },
    weekStart: { type: Date, required: true, index: true },
    weekEnd: { type: Date, required: true },

    total: { type: Number, required: true, min: 0 },
    averageRating: { type: Number, required: true, min: 0, max: 5 },
    entries: { type: [FeedbackReportEntrySchema], default: [] },

    sentBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    sentAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

FeedbackReportSchema.index({ lecturer: 1, weekId: 1, sentAt: -1 });

export const FeedbackReport =
  mongoose.models.FeedbackReport || mongoose.model('FeedbackReport', FeedbackReportSchema);
