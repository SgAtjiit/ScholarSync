import express from 'express';
import { 
    triggerScan, 
    getAllCourses, 
    getAssignments, 
    getAssignmentDetailsAndExtract 
} from '../controllers/classroomController.js';
import { submitSolution } from '../controllers/aiController.js'; 

const router = express.Router();

// 1. Get All Courses Info (Specific Requirement)
router.get('/courses/:userId', getAllCourses);

// 2. Scan (Fetch metadata only, NO extraction yet)
router.post('/scan', triggerScan);

// 3. Get Assignments List (Supports filtering by mode/course)
router.get('/assignments/:userId', getAssignments);

// 4. Get Single Assignment & TRIGGER EXTRACTION (Lazy Loading)
// This route is called when the user "presses on a particular assignment"
router.post('/assignments/:assignmentId/extract', getAssignmentDetailsAndExtract);

// 5. Submit to Classroom (Technically a classroom action)
router.post('/submit', submitSolution);

export default router;