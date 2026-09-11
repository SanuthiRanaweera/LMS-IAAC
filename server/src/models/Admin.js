import mongoose from 'mongoose';

const { Schema } = mongoose;

const AdminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      trim: true,
      enum: ['superadmin', 'staff', 'lecturer'],
      default: 'staff',
    },
    branchId: { type: String, trim: true, default: '' },
    intakeId: { type: String, trim: true, default: '' },
    batchId:  { type: String, trim: true, default: '' },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
