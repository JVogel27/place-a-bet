import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initializeSocketIO } from './websocket/events';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = initializeSocketIO(httpServer);
const PORT = process.env.PORT || 3000;

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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
import partiesRouter from './routes/parties';
import betsRouter from './routes/bets';
import wagersRouter from './routes/wagers';

app.use('/api/parties', partiesRouter);
app.use('/api/bets', betsRouter);
app.use('/api/bets', wagersRouter); // Mounts /api/bets/:id/wagers
app.use('/api', wagersRouter); // Mounts /api/users/:userName/wagers

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
