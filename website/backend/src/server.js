import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRouter from './routes/auth.js';
import friendsRouter from './routes/friends.js';
import serversRouter from './routes/servers.js';
import mediaRouter, { UPLOADS_DIR } from './routes/media.js';
import { setupSocketIO } from './socket.js';
import { initCleanupWorker } from './cleanupWorker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configure Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, restrict to frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware Configuration
app.use(express.json());
app.use(cors({
  origin: '*',
}));

// Configure Helmet with friendly settings for development (allows styling, images, fonts)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // Max 300 requests per minute
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Serve static files from the uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/servers', serversRouter);
app.use('/api/media', mediaRouter);

// Basic Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Start Socket.IO configuration
setupSocketIO(io);

// Initialize background file cleanup scanner
initCleanupWorker(io);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// Start HTTP Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(` KIKO Backend Server Running             `);
  console.log(` Port:    ${PORT}                        `);
  console.log(` ENV:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});
