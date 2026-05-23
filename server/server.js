import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import streamRoutes from './routes/streamRoutes.js';
import cacheRoutes from './routes/cacheRoutes.js';

dotenv.config();
connectDB();

const app = express();

// Simple request logger to help diagnose cron / 404 issues
app.use((req, res, next) => {
  const origin = req.headers.origin || req.get('origin') || 'no-origin';
  console.log(`[REQ] ${new Date().toISOString()} - ${req.method} ${req.originalUrl} - origin: ${origin} - ip: ${req.ip}`);
  next();
});

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser tools and server-to-server requests.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

// Increased payload limit for large assignments/PDFs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.get('/', (req, res) => res.send('ScholarSync API is running...'));

// Health endpoint for uptime checks (cron-job.org / ping services)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/classroom', classroomRoutes); // Handles Courses & Assignments
app.use('/api/ai', aiRoutes);               // Handles Generation & Solutions
app.use('/api/stream', streamRoutes);       // File streaming proxy (memory-efficient)
app.use('/api/cache', cacheRoutes);         // Extraction & generation caching

const PORT = process.env.PORT || 5000;

// Only listen if not running on Vercel (Vercel exports the app)
// if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
// }

export default app;