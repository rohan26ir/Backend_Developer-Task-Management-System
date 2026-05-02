// server.js

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

// Routes
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import projectRoutes from './src/routes/project.routes.js';
import taskRoutes from './src/routes/task.routes.js';
import teamRoutes from './src/routes/team.routes.js';
import commentRoutes from './src/routes/comment.routes.js';
import attachmentRoutes from './src/routes/attachment.routes.js';
import notificationRoutes from './src/routes/notification.routes.js';
import milestoneRoutes from './src/routes/milestone.routes.js';
import activityRoutes from './src/routes/activity.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';

// Middleware
import { errorHandler } from './src/middleware/errorHandler.js';
import { logger } from './src/middleware/logger.js';

const app = express();

// ================= RATE LIMIT =================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// ================= MIDDLEWARE =================
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined', {
  stream: { write: msg => logger.info(msg.trim()) }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// ================= ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ================= HEALTH =================
app.get('/', (req, res) => {
  res.send('API is running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ================= ERROR HANDLER =================
app.use(errorHandler);

// ================= DB CONNECTION (SAFE) =================
let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected) return;

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing in env");
    }

    const db = await mongoose.connect(process.env.MONGO_URI);
    isConnected = db.connections[0].readyState;

    logger.info('MongoDB connected');
  } catch (err) {
    logger.error(err.message);
  }
};

// SAFE INIT (NOT top-level await)
connectDB();

// ================= EXPORT =================
export default app;