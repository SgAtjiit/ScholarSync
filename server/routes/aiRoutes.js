import express from 'express';
import { generateAiSolution, getSolution, chatWithPDF } from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate', generateAiSolution);
router.get('/solutions/:assignmentId', getSolution);
router.post('/chat-pdf', chatWithPDF);

export default router;