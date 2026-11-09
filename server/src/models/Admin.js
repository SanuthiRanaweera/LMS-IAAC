import mongoose from 'mongoose';

const { Schema } = mongoose;

const AdminSchema = new Schema(
  {
    lecturerId: { type: String, trim: true, default: '', index: true, sparse: true },
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
    subject:  { type: String, trim: true, default: '' },
    accountStatus: {
      type: String,
      enum: ['Active', 'Pending Approval', 'Disabled', 'Rejected'],
      default: 'Active',
      index: true,
    },
    registrationMethod: {
      type: String,
      enum: ['self_registration', 'super_admin'],
      default: 'super_admin',
      index: true,
    },
    invitationId: { type: Schema.Types.ObjectId, ref: 'LecturerInvitation', default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: '' },
    canUpdateResults: { type: Boolean, default: false },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
