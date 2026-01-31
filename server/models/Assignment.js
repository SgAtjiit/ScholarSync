import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  googleClassroomAssignmentId: { type: String, required: true },
  courseId: { type: String, required: true },
  courseName: { type: String },
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  alternateLink: String,
  status: {
    type: String,
    enum: ['detected', 'processing', 'completed', 'submitted', 'assigned', 'missing','ready'],
    default: 'detected'
  },

  materials: [mongoose.Schema.Types.Mixed],

  // --- UPDATED SECTION ---
  extractedContent: {
    // structuredData will now store the JSON: { questions: {...}, importantInfo: "" }
    structuredData: { type: mongoose.Schema.Types.Mixed }, 
    extractionMethod: [String],
    processedAt: { type: Date },
    aiModelUsed: { type: String, default: "mixtral-8x7b-32768" }
  },

  submissionInfo: {
    submittedAt: Date,
    driveFileId: String,
    driveFileLink: String,
    driveFolderLink: String
  },

  createdAt: { type: Date, default: Date.now }
});

assignmentSchema.index({ userId: 1, googleClassroomAssignmentId: 1 }, { unique: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;