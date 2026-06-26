import express from 'express';
import { googleAuth, connectClassroom, disconnectClassroom } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/google', googleAuth);
router.post('/connect-classroom', protect, connectClassroom);
router.post('/disconnect-classroom', protect, disconnectClassroom);

export default router;