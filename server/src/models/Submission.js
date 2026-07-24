import mongoose from 'mongoose';

const { Schema } = mongoose;

const SubmissionSchema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    oneDriveUrl: { type: String, required: true, trim: true, maxlength: 1500 },
    oneDriveFileId: { type: String, required: true, trim: true, maxlength: 255 },
    status: { type: String, required: true, enum: ['Submitted', 'Late'], index: true },
  },
  { timestamps: true }
);

SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
SubmissionSchema.index({ assignmentId: 1, status: 1, updatedAt: -1 });
SubmissionSchema.index({ studentId: 1, updatedAt: -1 });

export const Submission = mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);