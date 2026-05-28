import mongoose from 'mongoose';

const { Schema } = mongoose;

const FeedbackSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    lecturer: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },

    weekId: { type: String, required: true, trim: true, maxlength: 16, index: true },
    weekRef: { type: String, required: true, trim: true, maxlength: 40 },
    weekStart: { type: Date, required: true, index: true },
    weekEnd: { type: Date, required: true },

    rating: { type: Number, required: true, min: 1, max: 5, index: true },
    comment: { type: String, required: true, trim: true, maxlength: 500 },

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

FeedbackSchema.index({ student: 1, lecturer: 1, weekId: 1 }, { unique: true });

export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
