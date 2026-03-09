import express from 'express';
import { 
    generateAiSolution, 
    getSolution, 
    chatWithAssignment, 
    chatWithAssignmentStream, 
    explainConceptHandler, 
    getChatHistory, 
    saveChatMessage, 
    clearChatHistory,
    saveClientSolution,
    saveExtractedContent
} from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate', generateAiSolution);
router.post('/explain', explainConceptHandler);
router.get('/solution/:assignmentId', getSolution);
router.get('/solutions/:assignmentId', getSolution); // Alias for frontend compatibility
router.post('/chat', chatWithAssignment);
router.post('/chat-stream', chatWithAssignmentStream);

// Chat history routes
router.get('/chat-history/:assignmentId', getChatHistory);
router.post('/chat-history', saveChatMessage);
router.delete('/chat-history/:assignmentId', clearChatHistory);

// Client-side AI persistence routes
router.post('/save-solution', saveClientSolution);
router.post('/save-extracted', saveExtractedContent);

export default router;