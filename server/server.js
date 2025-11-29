import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// Increased payload limit for large assignments/PDFs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.get('/', (req, res) => res.send('ScholarSync API is running...'));

app.use('/api/auth', authRoutes);
app.use('/api/classroom', classroomRoutes); // Handles Courses & Assignments
app.use('/api/ai', aiRoutes);               // Handles Generation & Solutions

const PORT = process.env.PORT || 5000;

// Only listen if not running on Vercel (Vercel exports the app)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

export default app;