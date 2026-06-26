import express from 'express';
import { 
    getSolution, 
    saveClientSolution,
    saveExtractedContent,
    compilePdf
} from '../controllers/aiController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/solution/:assignmentId', protect, getSolution);
router.get('/solutions/:assignmentId', protect, getSolution); // Alias for frontend compatibility

// Client-side AI persistence routes
router.post('/save-solution', protect, saveClientSolution);
router.post('/save-extracted', protect, saveExtractedContent);
router.post('/compile-pdf', protect, compilePdf);

export default router;