import express from 'express';
import { 
    streamFileFromDrive, 
    getFileMetadata, 
    checkFileAccess 
} from '../controllers/streamController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Streaming Proxy Routes
 * These endpoints stream files from Google Drive without buffering in memory.
 */

// Stream file content directly (used by frontend for PDF parsing)
router.get('/download/:fileId', protect, streamFileFromDrive);

// Get file metadata only (for UI display)
router.get('/metadata/:fileId', protect, getFileMetadata);

// Pre-flight check if file is accessible
router.get('/check/:fileId', protect, checkFileAccess);

export default router;
