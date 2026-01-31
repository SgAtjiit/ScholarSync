import express from 'express';
import { generateAiSolution, getSolution, chatWithAssignment, explainConceptHandler } from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate', generateAiSolution);
router.post('/explain', explainConceptHandler);
router.get('/solution/:assignmentId', getSolution);
router.get('/solutions/:assignmentId', getSolution); // Alias for frontend compatibility
router.post('/chat', chatWithAssignment);

export default router;