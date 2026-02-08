import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initializeSocketIO } from './websocket/events.js';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = initializeSocketIO(httpServer);
const PORT = process.env.PORT || 3001;

// Export io for use in route handlers
export { io };

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
import partiesRouter from './routes/parties.js';
import betsRouter from './routes/bets.js';
import wagersRouter from './routes/wagers.js';

app.use('/api/parties', partiesRouter);
app.use('/api/bets', betsRouter);
app.use('/api/bets', wagersRouter); // Mounts /api/bets/:id/wagers
app.use('/api', wagersRouter); // Mounts /api/users/:userName/wagers

app.get('/api/test', (_req, res) => {
  res.json({ message: 'API is working!' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, 'public');

  // Serve static assets
  app.use(express.static(publicPath));

  // Handle client-side routing - send all non-API requests to index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  // 404 handler for development (when API routes don't match)
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🎲 Place-A-Bet server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server ready`);
  });
}

export { app };
