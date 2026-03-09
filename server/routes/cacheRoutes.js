import express from 'express';
import {
  getCachedExtraction,
  saveExtraction,
  saveGeneratedContent,
  clearCache,
  getCacheStats
} from '../controllers/cacheController.js';

const router = express.Router();

// Get cached extraction for a file
router.get('/extraction/:fileId', getCachedExtraction);

// Save extracted content to cache
router.post('/extraction', saveExtraction);

// Save generated content (quiz, flashcards, etc.) to cache
router.patch('/extraction/:fileId/generated', saveGeneratedContent);

// Clear cache (specific file or all)
router.delete('/extraction/:fileId', clearCache);

// Get cache stats for user
router.get('/stats', getCacheStats);

export default router;
