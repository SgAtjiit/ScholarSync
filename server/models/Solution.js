import mongoose from 'mongoose';

const solutionSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // The AI interaction mode: 'explain', 'quiz', 'flashcards', 'draft'
    mode: { type: String, enum: ['explain', 'quiz', 'flashcards', 'draft'], default: 'draft' },

    // The Prompt we sent (useful for debugging)
    promptUsed: String,

    // The AI's answer (Markdown for explain/draft, JSON string for quiz/flashcards)
    content: String,

    // User-edited content (only for draft mode, before submission)
    editedContent: String,

    version: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now }
});

const Solution = mongoose.model('Solution', solutionSchema);
export default Solution;