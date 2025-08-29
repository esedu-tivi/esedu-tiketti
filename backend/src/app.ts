import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import ticketRoutes from './routes/ticketRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import notificationSettingsRoutes from './routes/notificationSettingsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import aiAnalyticsRoutes from './routes/aiAnalyticsRoutes.js';
import tokenAnalyticsRoutes from './routes/tokenAnalyticsRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { createServer } from 'http';
import { initializeSocketService } from './services/socketService.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { optionalAuthMiddleware } from './middleware/optionalAuthMiddleware.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ladataan ympäristömuuttujat
dotenv.config();


// Luodaan Express-sovellus
const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocketService(httpServer);

// Request ID tracking middleware - must be early in the chain
app.use(requestIdMiddleware);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // For file uploads
}));

// Define allowed origins for CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001'
];

// Configure CORS
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parser limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Optional authentication middleware - extracts user info if available
// This runs before rate limiting to enable user-based limits for authenticated users
app.use(optionalAuthMiddleware);

// IMPORTANT: For school environments with shared IP addresses
// We use dual rate limiting strategy:
// 1. IP-based for non-authenticated requests (strict)
// 2. User-based for authenticated requests (generous)

// Rate limiter for non-authenticated requests (IP-based)
const ipLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute rolling window
  max: 30, // 30 requests per minute for non-authenticated users per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  skip: (req) => {
    // Skip for authenticated users (they use userLimiter instead)
    if (req.user?.email) return true;
    // Skip rate limiting for WebSocket upgrade requests
    if (req.headers.upgrade === 'websocket') return true;
    // Skip for health checks
    if (req.path.startsWith('/api/health')) return true;
    // Skip for static files
    if (req.path.startsWith('/uploads')) return true;
    return false;
  }
});

// Rate limiter for authenticated users (user-based)
// Uses memory store with user email as key
const userLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute rolling window
  max: 200, // 200 requests per minute per authenticated user
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  keyGenerator: (req) => {
    // Use user email as key for authenticated users
    // Falls back to a placeholder that will never match (skip handles non-auth)
    return req.user?.email || 'anonymous-never-matches';
  },
  skip: (req) => {
    // Only apply to authenticated users
    if (!req.user?.email) return true;
    // Skip rate limiting for WebSocket upgrade requests
    if (req.headers.upgrade === 'websocket') return true;
    // Skip for health checks
    if (req.path.startsWith('/api/health')) return true;
    // Skip for static files
    if (req.path.startsWith('/uploads')) return true;
    return false;
  }
});

// Apply both rate limiters to all API routes
// They will selectively apply based on authentication status
app.use('/api/', ipLimiter);
app.use('/api/', userLimiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth/', authLimiter);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the uploads directory with proper CORS headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  const origin = req.headers.origin;
  if (origin && allowedOrigins.indexOf(origin) !== -1) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  // Set proper cache headers
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    // Allow images to be displayed in img tags
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Health check routes (no auth required)
app.use('/api/health', healthRoutes);

// Määritellään reitit
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-settings', notificationSettingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-analytics', aiAnalyticsRoutes);
app.use('/api/ai/token-analytics', tokenAnalyticsRoutes);

// 404 handler - must be added before error handler and after all routes
app.use(notFoundHandler);

// Centralized error handling middleware - must be the last middleware
app.use(errorHandler);

export { httpServer };
export default app; 