import express from 'express';
import { 
    getAllCourses, 
    triggerScan, 
    getAssignments, 
    getAssignmentDetailsAndExtract 
} from '../controllers/classroomController.js';

const router = express.Router();

router.get('/courses/:userId', getAllCourses);
router.get('/assignments/:userId', getAssignments);
router.post('/scan', triggerScan);
router.post('/assignments/:assignmentId/extract', getAssignmentDetailsAndExtract);

export default router;