import mongoose from 'mongoose';

const { Schema } = mongoose;

const LecturerInvitationSchema = new Schema(
  {
    linkName: { type: String, required: true, trim: true, maxlength: 120 },
    tokenHash: { type: String, required: true, unique: true, index: true },
    tokenPrefix: { type: String, trim: true, default: '' },
    maxUses: { type: Number, required: true, default: 1, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['Active', 'Used', 'Expired', 'Revoked'],
      default: 'Active',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    createdByName: { type: String, trim: true, default: 'Super Admin' },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    registeredLecturers: [
      {
        lecturerId: { type: Schema.Types.ObjectId, ref: 'Admin' },
        name: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        registeredAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const LecturerInvitation =
  mongoose.models.LecturerInvitation ||
  mongoose.model('LecturerInvitation', LecturerInvitationSchema);
