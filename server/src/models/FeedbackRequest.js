import mongoose from 'mongoose';

const { Schema } = mongoose;

const FeedbackRequestSchema = new Schema(
  {
    lecturer: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true,
    },
    branchId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    intakeId: {
      type: String,
      trim: true,
      default: '',
    },
    batchId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    diplomaId: {
      type: String,
      trim: true,
      default: '',
    },
    moduleId: {
      type: String,
      required: true,
      trim: true,
    },
    feedbackWeek: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    targetStudents: {
      type: String,
      enum: ['all', 'specific'],
      default: 'all',
    },
    selectedStudentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    status: {
      type: String,
      enum: ['Active', 'Closed', 'Draft'],
      default: 'Active',
      index: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringDay: {
      type: Number,
      default: 5, // 5 = Friday
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

FeedbackRequestSchema.index({ lecturer: 1, batchId: 1, feedbackWeek: 1 });
FeedbackRequestSchema.index({ status: 1, startDate: 1, endDate: 1 });

export const FeedbackRequest =
  mongoose.models.FeedbackRequest ||
  mongoose.model('FeedbackRequest', FeedbackRequestSchema);
