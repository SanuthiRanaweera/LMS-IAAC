import mongoose from 'mongoose';

const { Schema } = mongoose;

const RecordingSchema = new Schema(
  {
    branchId: { type: String, required: true, trim: true, maxlength: 64, index: true },
    intakeId: { type: String, required: true, trim: true, maxlength: 64, index: true },
    batchId:  { type: String, required: true, trim: true, maxlength: 64, index: true },

    title:       { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },

    // Either a stored file OR an external video link
    filePath:  { type: String, trim: true, maxlength: 500, default: '' }, // relative server path
    fileAssetId: { type: String, trim: true, maxlength: 64, default: '' },
    fileName:  { type: String, trim: true, maxlength: 255, default: '' },
    fileSize:  { type: Number, default: 0 },
    fileMime:  { type: String, trim: true, maxlength: 100, default: '' },
    videoLink: { type: String, trim: true, maxlength: 1000, default: '' }, // YouTube/Vimeo/Drive

    uploadedBy:     { type: String, required: true, trim: true, maxlength: 64 },
    uploadedByName: { type: String, required: true, trim: true, maxlength: 120 },
    uploadedByRole: { type: String, trim: true, maxlength: 30, default: 'lecturer' },
  },
  { timestamps: true }
);

RecordingSchema.index({ branchId: 1, intakeId: 1, batchId: 1, createdAt: -1 });
RecordingSchema.index({ uploadedBy: 1, createdAt: -1 });

export const Recording = mongoose.models.Recording || mongoose.model('Recording', RecordingSchema);
