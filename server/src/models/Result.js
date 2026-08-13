import mongoose from 'mongoose';

const { Schema } = mongoose;

const StudentResultSchema = new Schema(
  {
    // MongoDB Student reference
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },

    // Keep these values as snapshots.
    // Even if the student's name changes later,
    // the result sheet keeps the original information.
    studentId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },

    studentName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    marks: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    grade: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },

    status: {
      type: String,
      enum: ['PASS', 'FAIL', 'ABSENT', 'PENDING'],
      default: 'PENDING',
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
  },
  {
    _id: false,
  }
);

const ResultSchema = new Schema(
  {
    // =========================
    // Result identification
    // =========================

    resultTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    resultDate: {
      type: Date,
      default: Date.now,
    },

    // =========================
    // Student filtering
    // =========================

    branchId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      index: true,
    },

    batchId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      index: true,
    },

    // Diploma in your current Student model = course
    course: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    // Optional intake if you later want it
    intakeId: {
      type: String,
      trim: true,
      maxlength: 64,
      index: true,
    },

    // =========================
    // Student Results
    // =========================

    results: {
      type: [StudentResultSchema],
      default: [],
    },

    // =========================
    // Publishing
    // =========================

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    // =========================
    // Admin information
    // =========================

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    createdByRole: {
      type: String,
      enum: ['superadmin', 'staff'],
      default: 'staff',
    },
  },
  {
    timestamps: true,
  }
);

// Helps Result listing/filtering
ResultSchema.index({
  branchId: 1,
  batchId: 1,
  course: 1,
});

// Prevent accidental duplicate result titles
// for the same batch/course.
ResultSchema.index(
  {
    branchId: 1,
    batchId: 1,
    course: 1,
    resultTitle: 1,
  },
  {
    unique: true,
  }
);

export const Result =
  mongoose.models.Result ||
  mongoose.model('Result', ResultSchema);