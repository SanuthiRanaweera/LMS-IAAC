import mongoose from 'mongoose';

const { Schema } = mongoose;

const STUDENT_COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

const StudentSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
      index: true,
    },
    studentId: { type: String, required: true, trim: true, maxlength: 40, unique: true, index: true },

    nic: { type: String, trim: true, maxlength: 40 },
    course: { type: String, trim: true, enum: STUDENT_COURSES, index: true },

    whatsappNumber: { type: String, trim: true, maxlength: 30 },
    phoneNumber: { type: String, trim: true, maxlength: 30 },
    address: { type: String, trim: true, maxlength: 300 },

    guardianName: { type: String, trim: true, maxlength: 120 },
    guardianPhoneNumber: { type: String, trim: true, maxlength: 30 },

    // Academic hierarchy association
    // New structure: Branch → Intake → Batch
    branchId: { type: String, trim: true, maxlength: 64, index: true },
    intakeId: { type: String, trim: true, maxlength: 64, index: true },
    batchId: { type: String, trim: true, maxlength: 64, index: true },
    
    // Legacy structure (keep for backward compatibility)
    facultyId: { type: String, trim: true, maxlength: 64, index: true },
    programId: { type: String, trim: true, maxlength: 64, index: true },

    passwordHash: { type: String, required: true },

    // Password reset (forgot password)
    resetPasswordTokenHash: { type: String, trim: true, maxlength: 128, index: true },
    resetPasswordTokenExpiresAt: { type: Date, index: true },
    // Source of creation: 'self' = user registered, 'admin' = created by admin
    createdBy: { type: String, trim: true, maxlength: 16, default: 'self', index: true },
  },
  { timestamps: true }
);

export const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
