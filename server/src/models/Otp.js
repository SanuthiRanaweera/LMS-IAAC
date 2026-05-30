import mongoose from 'mongoose';

const { Schema } = mongoose;

const OtpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
      unique: true,
    },
    otp: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 10 * 60,
    },
  },
  { versionKey: false }
);

export const Otp = mongoose.models.Otp || mongoose.model('Otp', OtpSchema);