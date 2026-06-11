import mongoose from 'mongoose';

const { Schema } = mongoose;

export const STUDY_MATERIAL_COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

const MaterialSchema = new Schema(
  {
    // Academic hierarchy targeting
    branchId: { type: String, required: true, trim: true, maxlength: 64, index: true },
    intakeId: { type: String, required: true, trim: true, maxlength: 64, index: true },
    batchId: { type: String, required: true, trim: true, maxlength: 64, index: true },
    course: { type: String, enum: STUDY_MATERIAL_COURSES, required: true, index: true },
    weekNumber: { type: Number, required: true, min: 1, max: 52, index: true },
    
    // Material details
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    
    // File information
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    fileUrl: { type: String, trim: true, maxlength: 500, default: '' },
    content: { type: String, trim: true, maxlength: 2000, default: '' },
    imageAssetId: { type: String, trim: true, maxlength: 64, default: '' },
    fileSize: { type: Number }, // in bytes
    fileType: { type: String, trim: true, maxlength: 50 }, // PDF, DOCX, PPTX, MP4, etc.
    
    // Upload metadata
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    uploadedByName: { type: String, required: true, trim: true, maxlength: 120 }, // admin name for logging
    
    // Additional metadata
    isActive: { type: Boolean, default: true },
    downloadCount: { type: Number, default: 0 },
    
    // Optional categorization
    category: { type: String, trim: true, maxlength: 100 }, // Lecture Notes, Assignment, Project, etc.
    week: { type: Number }, // Legacy week field
    module: { type: Number }, // Module number if applicable
  },
  { 
    timestamps: true,
    // Create compound index for efficient batch-based queries
    index: { branchId: 1, intakeId: 1, batchId: 1, createdAt: -1 }
  }
);

// Compound index for student access queries (most common use case)
MaterialSchema.index({ branchId: 1, batchId: 1, course: 1, weekNumber: 1, isActive: 1, createdAt: -1 });

// Index for admin management queries
MaterialSchema.index({ uploadedBy: 1, createdAt: -1 });

export const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);
export const StudyMaterial = Material;