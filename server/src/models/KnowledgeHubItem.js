import mongoose from 'mongoose';

const { Schema } = mongoose;

const KnowledgeHubItemSchema = new Schema(
  {
    branchId: { type: String, required: true, trim: true, maxlength: 64, index: true },
    intakeId: { type: String, required: true, trim: true, maxlength: 64, index: true },
    batchId:  { type: String, required: true, trim: true, maxlength: 64, index: true },

    // file | link | video | note | gallery
    resourceType: {
      type: String,
      required: true,
      trim: true,
      enum: ['file', 'link', 'video', 'note', 'gallery'],
    },

    title:       { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },

    // file uploads
    filePath:  { type: String, trim: true, maxlength: 500, default: '' },
    fileName:  { type: String, trim: true, maxlength: 255, default: '' },
    fileSize:  { type: Number, default: 0 },
    fileMime:  { type: String, trim: true, maxlength: 100, default: '' },

    // gallery images
    imagePaths: { type: [String], default: [] },
    imageNames: { type: [String], default: [] },

    // external link or video link
    contentUrl: { type: String, trim: true, maxlength: 1000, default: '' },

    // inline note text (markdown supported)
    textContent: { type: String, trim: true, maxlength: 20000, default: '' },

    addedBy:     { type: String, required: true, trim: true, maxlength: 64 },
    addedByName: { type: String, required: true, trim: true, maxlength: 120 },
    addedByRole: { type: String, trim: true, maxlength: 30, default: 'lecturer' },
  },
  { timestamps: true }
);

KnowledgeHubItemSchema.index({ branchId: 1, intakeId: 1, batchId: 1, createdAt: -1 });
KnowledgeHubItemSchema.index({ addedBy: 1, createdAt: -1 });

export const KnowledgeHubItem =
  mongoose.models.KnowledgeHubItem || mongoose.model('KnowledgeHubItem', KnowledgeHubItemSchema);
