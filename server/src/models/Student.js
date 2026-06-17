import mongoose from 'mongoose';

const { Schema } = mongoose;

// Enum for targeted materials and strict data enforcement
const STUDENT_COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

const StudentSchema = new Schema(
  {
    // --- Personal Details ---
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
    dob: { type: Date, required: true },
    gender: { type: String, required: true, enum: ['male', 'female', 'other'], lowercase: true, trim: true },
    nic: { type: String, trim: true, maxlength: 40 },
    
    // --- Targeted Course ---
    course: { 
      type: String, 
      required: true, // Crucial for Targeted Materials
      trim: true, 
      enum: STUDENT_COURSES, 
      index: true 
    },

    // --- Contact Details ---
    whatsappNumber: { type: String, trim: true, maxlength: 30 },
    phoneNumber: { type: String, trim: true, maxlength: 30 },
    address: { type: String, trim: true, maxlength: 300 },

    // --- Educational Background ---
    school: { type: String, trim: true, maxlength: 150 },
    olResult: { type: String, trim: true, maxlength: 50 },
    olMath: { type: String, trim: true, maxlength: 20 },
    olEnglish: { type: String, trim: true, maxlength: 20 },

    // --- Emergency Contact ---
    guardianName: { type: String, trim: true, maxlength: 120 },
    guardianPhoneNumber: { type: String, trim: true, maxlength: 30 },

    // --- Academic Hierarchy Association ---
    // New structure: Branch → Intake → Batch
    branchId: { type: String, trim: true, maxlength: 64, index: true },
    intakeId: { type: String, trim: true, maxlength: 64, index: true },
    batchId: { type: String, trim: true, maxlength: 64, index: true },
    
    // Legacy structure (keep for backward compatibility)
    facultyId: { type: String, trim: true, maxlength: 64, index: true },
    programId: { type: String, trim: true, maxlength: 64, index: true },

    // --- Security ---
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