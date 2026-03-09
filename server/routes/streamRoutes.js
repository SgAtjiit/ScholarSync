import express from 'express';
import { 
    streamFileFromDrive, 
    getFileMetadata, 
    checkFileAccess 
} from '../controllers/streamController.js';

const router = express.Router();

/**
 * Streaming Proxy Routes
 * These endpoints stream files from Google Drive without buffering in memory.
 */

// Stream file content directly (used by frontend for PDF parsing)
router.get('/download/:fileId', streamFileFromDrive);

// Get file metadata only (for UI display)
router.get('/metadata/:fileId', getFileMetadata);

// Pre-flight check if file is accessible
router.get('/check/:fileId', checkFileAccess);

export default router;
