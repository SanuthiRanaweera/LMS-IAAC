import mongoose from 'mongoose';

const { Schema } = mongoose;

// Courses / Diplomas available for students
export const STUDENT_COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

const StudentSchema = new Schema(
  {
    // =========================
    // Personal Details
    // =========================
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
      index: true,
    },

    studentId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      unique: true,
      index: true,
    },

    dob: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      required: true,
      enum: ['male', 'female', 'other'],
      lowercase: true,
      trim: true,
    },

    nic: {
      type: String,
      trim: true,
      maxlength: 40,
    },

    // =========================
    // Diploma / Course
    // =========================
    course: {
      type: String,
      required: true,
      trim: true,
      enum: STUDENT_COURSES,
      index: true,
    },

    // =========================
    // Contact Details
    // =========================
    whatsappNumber: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    phoneNumber: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    address: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    // =========================
    // Educational Background
    // =========================
    school: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    olResult: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    olMath: {
      type: String,
      trim: true,
      maxlength: 20,
    },

    olEnglish: {
      type: String,
      trim: true,
      maxlength: 20,
    },

    // =========================
    // Emergency Contact
    // =========================
    guardianName: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    guardianPhoneNumber: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    // =========================
    // Academic Hierarchy
    // Branch -> Intake -> Batch
    // =========================
    branchId: {
      type: String,
      trim: true,
      maxlength: 64,
      index: true,
    },

    intakeId: {
      type: String,
      trim: true,
      maxlength: 64,
      index: true,
    },

    batchId: {
      type: String,
      trim: true,
      maxlength: 64,
      index: true,
    },

    // =========================
    // Legacy Structure
    // Keep for backward compatibility
    // =========================
    facultyId: {
      type: String,
      trim: true,
      maxlength: 64,
      index: true,
    },

    programId: {
      type: String,
      trim: true,
      maxlength: 64,
      index: true,
    },

    // =========================
    // Security
    // =========================
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    resetPasswordTokenHash: {
      type: String,
      trim: true,
      maxlength: 128,
      index: true,
      select: false,
    },

    resetPasswordTokenExpiresAt: {
      type: Date,
      index: true,
      select: false,
    },

    // =========================
    // Creation Source
    // =========================
    createdBy: {
      type: String,
      trim: true,
      maxlength: 16,
      default: 'self',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Useful compound index for result/student filtering.
//
// This makes:
// Branch + Batch + Diploma/Course
//
// searches faster.
StudentSchema.index({
  branchId: 1,
  batchId: 1,
  course: 1,
});

export const Student =
  mongoose.models.Student ||
  mongoose.model('Student', StudentSchema);