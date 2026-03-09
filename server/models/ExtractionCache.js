import mongoose from 'mongoose';

/**
 * ExtractionCache Model
 * Caches extracted document content to avoid re-processing
 * Saves user's API calls and processing time
 */
const extractionCacheSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  fileId: { 
    type: String, 
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  },
  
  // Extracted content data
  extractedContent: {
    content: { type: String, required: true },
    pageCount: { type: Number },
    hasImages: { type: Boolean, default: false },
    tokenEstimate: { type: Number },
    pages: [{
      pageNumber: Number,
      textLength: Number,
      hasImage: Boolean,
      visionProcessed: Boolean
    }]
  },
  
  // Generated content cache (quiz, flashcards, etc.)
  generatedContent: {
    quiz: { type: mongoose.Schema.Types.Mixed },
    flashcards: { type: mongoose.Schema.Types.Mixed },
    explain: { type: String },
    draft: { type: String }
  },
  
  // Metadata
  extractionMethod: {
    type: String,
    enum: ['client-side', 'backend', 'vision'],
    default: 'client-side'
  },
  
  // Timestamps
  extractedAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: Date.now },
  
  // Version for cache invalidation
  version: { type: Number, default: 1 }
}, {
  timestamps: true
});

// Compound index for efficient lookups
extractionCacheSchema.index({ userId: 1, fileId: 1 }, { unique: true });
extractionCacheSchema.index({ userId: 1, assignmentId: 1 });

// Update lastAccessedAt on read
extractionCacheSchema.methods.touch = async function() {
  this.lastAccessedAt = new Date();
  await this.save();
};

const ExtractionCache = mongoose.model('ExtractionCache', extractionCacheSchema);
export default ExtractionCache;
