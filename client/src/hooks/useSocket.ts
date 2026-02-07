import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Event types matching server definitions
export interface PartyCreatedEvent {
  id: number;
  name: string;
  createdAt: string;
}

export interface BetCreatedEvent {
  id: number;
  partyId: number;
  title: string;
  createdBy: string;
  status: string;
}

export interface BetUpdatedEvent {
  id: number;
  partyId: number;
  status: string;
  settledAt?: string;
}

export interface WagerPlacedEvent {
  id: number;
  betId: number;
  partyId: number;
  userName: string;
  amount: number;
  betOptionId: number;
}

export interface SettlementCompleteEvent {
  betId: number;
  partyId: number;
  winningOptionId: number;
  settlements: Array<{
    userName: string;
    amount: number;
  }>;
}

// Event handler types
export interface SocketEventHandlers {
  onPartyCreated?: (event: PartyCreatedEvent) => void;
  onBetCreated?: (event: BetCreatedEvent) => void;
  onBetUpdated?: (event: BetUpdatedEvent) => void;
  onWagerPlaced?: (event: WagerPlacedEvent) => void;
  onSettlementComplete?: (event: SettlementCompleteEvent) => void;
}

interface UseSocketOptions {
  partyId?: number;
  handlers?: SocketEventHandlers;
  autoConnect?: boolean;
}

/**
 * Hook to manage Socket.IO connection and events
 *
 * @param options - Configuration options
 * @param options.partyId - Optional party ID to auto-join party room
 * @param options.handlers - Event handler callbacks
 * @param options.autoConnect - Whether to connect automatically (default: true)
 *
 * @example
 * ```tsx
 * const { connected, socket } = useSocket({
 *   partyId: 123,
 *   handlers: {
 *     onBetCreated: (event) => {
 *       console.log('New bet created:', event);
 *       // Update UI...
 *     },
 *     onWagerPlaced: (event) => {
 *       console.log('Wager placed:', event);
 *       // Update bet pool...
 *     }
 *   }
 * });
 * ```
 */
export function useSocket(options: UseSocketOptions = {}) {
  const { partyId, handlers, autoConnect = true } = options;

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // Get server URL from environment or default to same host
    const serverUrl = import.meta.env.VITE_SERVER_URL || `http://localhost:3001`;

    // Create socket connection
    const socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[WebSocket] Connected:', socket.id);
      setConnected(true);
      setError(null);

      // Auto-join party room if partyId is provided
      if (partyId) {
        socket.emit('join:party', partyId);
      }
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connection error:', err);
      setError(err);
    });

    // Register event handlers
    if (handlers?.onPartyCreated) {
      socket.on('party:created', handlers.onPartyCreated);
    }

    if (handlers?.onBetCreated) {
      socket.on('bet:created', handlers.onBetCreated);
    }

    if (handlers?.onBetUpdated) {
      socket.on('bet:updated', handlers.onBetUpdated);
    }

    if (handlers?.onWagerPlaced) {
      socket.on('wager:placed', handlers.onWagerPlaced);
    }

    if (handlers?.onSettlementComplete) {
      socket.on('settlement:complete', handlers.onSettlementComplete);
    }

    // Cleanup on unmount
    return () => {
      // Leave party room if joined
      if (partyId) {
        socket.emit('leave:party', partyId);
      }

      // Remove all listeners
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('party:created');
      socket.off('bet:created');
      socket.off('bet:updated');
      socket.off('wager:placed');
      socket.off('settlement:complete');

      // Disconnect
      socket.disconnect();
    };
  }, [partyId, autoConnect]); // Note: handlers intentionally omitted to avoid re-connecting

  // Update event handlers when they change
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Remove old handlers
    socket.off('party:created');
    socket.off('bet:created');
    socket.off('bet:updated');
    socket.off('wager:placed');
    socket.off('settlement:complete');

    // Register new handlers
    if (handlers?.onPartyCreated) {
      socket.on('party:created', handlers.onPartyCreated);
    }

    if (handlers?.onBetCreated) {
      socket.on('bet:created', handlers.onBetCreated);
    }

    if (handlers?.onBetUpdated) {
      socket.on('bet:updated', handlers.onBetUpdated);
    }

    if (handlers?.onWagerPlaced) {
      socket.on('wager:placed', handlers.onWagerPlaced);
    }

    if (handlers?.onSettlementComplete) {
      socket.on('settlement:complete', handlers.onSettlementComplete);
    }
  }, [handlers]);

  /**
   * Join a party room
   */
  const joinParty = (partyId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:party', partyId);
    }
  };

  /**
   * Leave a party room
   */
  const leaveParty = (partyId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:party', partyId);
    }
  };

  return {
    socket: socketRef.current,
    connected,
    error,
    joinParty,
    leaveParty
  };
}
