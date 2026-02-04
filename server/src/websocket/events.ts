import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

export interface SocketIOServer extends Server {
  // Type-safe event emissions
}

// Event types for type safety
export type PartyCreatedEvent = {
  id: number;
  name: string;
  createdAt: string;
};

export type BetCreatedEvent = {
  id: number;
  partyId: number;
  title: string;
  createdBy: string;
  status: string;
};

export type BetUpdatedEvent = {
  id: number;
  partyId: number;
  status: string;
  settledAt?: string;
};

export type WagerPlacedEvent = {
  id: number;
  betId: number;
  partyId: number;
  userName: string;
  amount: number;
  betOptionId: number;
};

export type SettlementCompleteEvent = {
  betId: number;
  partyId: number;
  winningOptionId: number;
  settlements: Array<{
    userName: string;
    amount: number;
  }>;
};

/**
 * Initialize Socket.IO server with proper configuration
 */
export function initializeSocketIO(httpServer: HttpServer): SocketIOServer {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    },
    // Connection options
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Handle connections
  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join party room
    socket.on('join:party', (partyId: number) => {
      const room = `party:${partyId}`;
      socket.join(room);
      console.log(`[WebSocket] Socket ${socket.id} joined room ${room}`);
    });

    // Leave party room
    socket.on('leave:party', (partyId: number) => {
      const room = `party:${partyId}`;
      socket.leave(room);
      console.log(`[WebSocket] Socket ${socket.id} left room ${room}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io as SocketIOServer;
}

/**
 * Helper functions to emit events to party rooms
 */
export function emitPartyCreated(io: SocketIOServer, event: PartyCreatedEvent) {
  // Broadcast to all clients (party list view)
  io.emit('party:created', event);
}

export function emitBetCreated(io: SocketIOServer, partyId: number, event: BetCreatedEvent) {
  const room = `party:${partyId}`;
  io.to(room).emit('bet:created', event);
}

export function emitBetUpdated(io: SocketIOServer, partyId: number, event: BetUpdatedEvent) {
  const room = `party:${partyId}`;
  io.to(room).emit('bet:updated', event);
}

export function emitWagerPlaced(io: SocketIOServer, partyId: number, event: WagerPlacedEvent) {
  const room = `party:${partyId}`;
  io.to(room).emit('wager:placed', event);
}

export function emitSettlementComplete(io: SocketIOServer, partyId: number, event: SettlementCompleteEvent) {
  const room = `party:${partyId}`;
  io.to(room).emit('settlement:complete', event);
}
