import express from 'express';
import { 
    getAllCourses, 
    triggerScan, 
    getAssignments, 
    getStats,
    getAssignmentDetailsAndExtract,
    submitToClassroom,
    openInGoogleDocs,
    syncFromGoogleDocs,
    createDraftDoc,
    submitDoc,
    createManualAssignment,
    uploadManualFiles
} from '../controllers/classroomController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/courses/:userId', protect, getAllCourses);
router.get('/assignments/:userId', protect, getAssignments);
router.get('/stats/:userId', protect, getStats);
router.post('/scan', protect, triggerScan);
router.post('/assignments/:assignmentId/extract', protect, getAssignmentDetailsAndExtract);
router.post('/submit', protect, submitToClassroom);
router.post('/open-in-docs', protect, openInGoogleDocs);
router.post('/sync-from-docs', protect, syncFromGoogleDocs);
router.post('/create-draft-doc', protect, createDraftDoc);
router.post('/submit-doc', protect, submitDoc);
router.post('/assignments/manual', protect, createManualAssignment);
router.post('/assignments/:assignmentId/upload', protect, uploadManualFiles);

export default router;