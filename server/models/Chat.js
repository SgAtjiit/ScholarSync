import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'ai'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignmentId: {
        type: String,
        required: true
    },
    assignmentTitle: {
        type: String
    },
    messages: [messageSchema],
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index for faster lookups
chatSchema.index({ userId: 1, assignmentId: 1 }, { unique: true });

export default mongoose.model('Chat', chatSchema);
