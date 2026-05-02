// server.js

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

// Import routes
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

// Import middleware
import { errorHandler } from './src/middleware/errorHandler.js';
import { logger } from './src/middleware/logger.js';

const app = express();


// ================= SOCKET.IO (SAFE FOR VERCEL) =================
let io;

if (process.env.NODE_ENV !== 'production') {
  const server = http.createServer(app);

  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info('New client connected');

    socket.on('join-task-room', (taskId) => {
      socket.join(`task-${taskId}`);
      logger.info(`User joined task-${taskId}`);
    });

    socket.on('join-project-room', (projectId) => {
      socket.join(`project-${projectId}`);
      logger.info(`User joined project-${projectId}`);
    });

    socket.on('disconnect', () => {
      logger.info('Client disconnected');
    });
  });

  // make io available in routes
  app.set('io', io);
}
// ===============================================================


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);


// Routes
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


// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});


// Error handler
app.use(errorHandler);


// ================= DATABASE CONNECTION =================
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const db = await mongoose.connect(process.env.MONGO_URI);
  isConnected = db.connections[0].readyState;

  logger.info('MongoDB connected');
};

// connect once (serverless safe)
await connectDB();
// =======================================================


export { app, server };