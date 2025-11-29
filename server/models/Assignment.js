import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  googleClassroomAssignmentId: { type: String, required: true },
  courseId: { type: String, required: true },
  courseName: { type: String }, // Human-readable course name
  title: { type: String, required: true },
  description: String, // The instructions in the post body
  dueDate: Date,
  alternateLink: String, // Link to view in Classroom
  status: {
    type: String,
    enum: ['detected', 'processing', 'ready', 'submitted'],
    default: 'detected'
  },

  // Attachments found - Using Mixed type to preserve Google Classroom API structure exactly
  materials: [mongoose.Schema.Types.Mixed],

  // The AI Fuel: All text extracted from attachments + description
  extractedContent: {
    fullText: String, // Combined text for the AI
    extractionMethod: [String] // e.g., ['pdf-parse', 'mammoth']
  },

  // Submission tracking
  submissionInfo: {
    submittedAt: Date,
    driveFileId: String,
    driveFileLink: String,
    driveFolderLink: String
  },

  createdAt: { type: Date, default: Date.now }
});

// Prevent duplicates
assignmentSchema.index({ userId: 1, googleClassroomAssignmentId: 1 }, { unique: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;