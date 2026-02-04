// API Client for Place-A-Bet
// Provides type-safe fetch wrappers for all backend endpoints

import type {
  Party,
  BetWithDetails,
  SettlementSummary,
  CreatePartyRequest,
  CreateBetRequest,
  CreateWagerRequest,
  CloseBetRequest,
  SettleBetRequest,
  Wager
} from './types';

const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Request failed'
    }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ===== Party Endpoints =====

/**
 * GET /api/parties - List all parties
 */
export async function getParties(): Promise<Party[]> {
  return apiFetch<Party[]>('/api/parties');
}

/**
 * POST /api/parties - Create new party (requires host PIN)
 */
export async function createParty(data: CreatePartyRequest): Promise<Party> {
  return apiFetch<Party>('/api/parties', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * GET /api/parties/:id - Get party details
 */
export async function getParty(id: number): Promise<Party> {
  return apiFetch<Party>(`/api/parties/${id}`);
}

/**
 * PATCH /api/parties/:id/archive - Archive party (requires host PIN)
 */
export async function archiveParty(id: number, hostPin: string): Promise<Party> {
  return apiFetch<Party>(`/api/parties/${id}/archive`, {
    method: 'PATCH',
    body: JSON.stringify({ hostPin })
  });
}

/**
 * GET /api/parties/:id/settlement-summary - Get settlement summary for party
 */
export async function getSettlementSummary(partyId: number): Promise<SettlementSummary> {
  return apiFetch<SettlementSummary>(`/api/parties/${partyId}/settlement-summary`);
}

// ===== Bet Endpoints =====

/**
 * GET /api/bets - List bets for active party (optionally filter by status)
 */
export async function getBets(status?: 'open' | 'closed' | 'settled'): Promise<BetWithDetails[]> {
  const query = status ? `?status=${status}` : '';
  return apiFetch<BetWithDetails[]>(`/api/bets${query}`);
}

/**
 * GET /api/bets/:id - Get bet details with options and wagers
 */
export async function getBet(id: number): Promise<BetWithDetails> {
  return apiFetch<BetWithDetails>(`/api/bets/${id}`);
}

/**
 * POST /api/bets - Create new bet
 */
export async function createBet(data: CreateBetRequest): Promise<BetWithDetails> {
  return apiFetch<BetWithDetails>('/api/bets', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * POST /api/bets/:id/close - Close betting (requires host PIN or creator match)
 */
export async function closeBet(id: number, data: CloseBetRequest): Promise<BetWithDetails> {
  return apiFetch<BetWithDetails>(`/api/bets/${id}/close`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * POST /api/bets/:id/settle - Settle bet and calculate payouts (requires host PIN or creator match)
 */
export async function settleBet(id: number, data: SettleBetRequest): Promise<BetWithDetails> {
  return apiFetch<BetWithDetails>(`/api/bets/${id}/settle`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// ===== Wager Endpoints =====

/**
 * POST /api/bets/:id/wagers - Place wager on bet
 */
export async function createWager(betId: number, data: CreateWagerRequest): Promise<Wager> {
  return apiFetch<Wager>(`/api/bets/${betId}/wagers`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * GET /api/bets/:id/wagers - Get all wagers for a bet
 */
export async function getWagers(betId: number): Promise<Wager[]> {
  return apiFetch<Wager[]>(`/api/bets/${betId}/wagers`);
}

/**
 * GET /api/users/:userName/wagers - Get user's wagers for active party
 */
export async function getUserWagers(userName: string): Promise<Wager[]> {
  return apiFetch<Wager[]>(`/api/users/${encodeURIComponent(userName)}/wagers`);
}

// ===== Host Endpoints =====

/**
 * POST /api/host/verify-pin - Verify host PIN
 */
export async function verifyHostPin(pin: string): Promise<{ valid: boolean }> {
  return apiFetch<{ valid: boolean }>('/api/host/verify-pin', {
    method: 'POST',
    body: JSON.stringify({ pin })
  });
}
