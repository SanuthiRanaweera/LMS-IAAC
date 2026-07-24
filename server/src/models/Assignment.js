import mongoose from 'mongoose';
import { STUDY_MATERIAL_COURSES } from './Material.js';

const { Schema } = mongoose;

const AssignmentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    referenceDocumentUrl: { type: String, trim: true, maxlength: 1000, default: '' },
    deadline: { type: Date, required: true, index: true },
    branchId: { type: String, required: true, trim: true, maxlength: 64, index: true },
    batchId: { type: String, required: true, trim: true, maxlength: 64, index: true },
    course: { type: String, required: true, trim: true, enum: STUDY_MATERIAL_COURSES, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

AssignmentSchema.index({ branchId: 1, batchId: 1, course: 1, isActive: 1, deadline: 1, createdAt: -1 });
AssignmentSchema.index({ adminId: 1, createdAt: -1 });

export const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);