import mongoose from 'mongoose';

const { Schema } = mongoose;

const FeedbackModerationEventSchema = new Schema(
  {
    feedback: { type: Schema.Types.ObjectId, ref: 'Feedback', required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 40, index: true },
    reason: { type: String, trim: true, maxlength: 300, default: '' },
    actor: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    at: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

FeedbackModerationEventSchema.index({ at: -1 });

export const FeedbackModerationEvent =
  mongoose.models.FeedbackModerationEvent ||
  mongoose.model('FeedbackModerationEvent', FeedbackModerationEventSchema);
