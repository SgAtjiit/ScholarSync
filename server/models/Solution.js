import mongoose from 'mongoose';

const solutionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mode: { 
    type: String, 
    enum: ['explain', 'quiz', 'flashcards', 'draft'], 
    required: true 
  },
  // We use Mixed because quiz/flashcards are JSON, while explain/draft are HTML strings
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  version: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

const Solution = mongoose.model('Solution', solutionSchema);
export default Solution;