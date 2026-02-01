import express from 'express';
import { 
    getAllCourses, 
    triggerScan, 
    getAssignments, 
    getAssignmentDetailsAndExtract,
    submitToClassroom,
    openInGoogleDocs,
    syncFromGoogleDocs
} from '../controllers/classroomController.js';

const router = express.Router();

router.get('/courses/:userId', getAllCourses);
router.get('/assignments/:userId', getAssignments);
router.post('/scan', triggerScan);
router.post('/assignments/:assignmentId/extract', getAssignmentDetailsAndExtract);
router.post('/submit', submitToClassroom);
router.post('/open-in-docs', openInGoogleDocs);
router.post('/sync-from-docs', syncFromGoogleDocs);

export default router;