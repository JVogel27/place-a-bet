// API Types for Place-A-Bet Frontend
// These types match the backend schema and API responses

export interface Party {
  id: number;
  name: string;
  date: string;
  description: string | null;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  betCount?: number;
  totalWagered?: number;
}

export interface Bet {
  id: number;
  partyId: number;
  type: 'yes_no' | 'multi_option';
  question: string;
  createdBy: string;
  status: 'open' | 'closed' | 'settled';
  winningOptionId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BetOption {
  id: number;
  betId: number;
  label: string;
  createdAt: string;
}

export interface Wager {
  id: number;
  betId: number;
  optionId: number;
  userName: string;
  amount: number;
  createdAt: string;
}

export interface Settlement {
  id: number;
  betId: number;
  userName: string;
  totalWagered: number;
  payout: number;
  netWinLoss: number;
  createdAt: string;
}

// Extended types for API responses

export interface BetWithDetails extends Bet {
  options: BetOption[];
  wagers: Wager[];
  totalPool: number;
}

export interface SettlementSummary {
  partyId: number;
  partyName: string;
  users: Array<{
    userName: string;
    netAmount: number;
  }>;
  totalPot: number;
}

// API Request types

export interface CreatePartyRequest {
  name: string;
  date: string;
  description?: string;
  hostPin: string;
}

export interface CreateBetRequest {
  question: string;
  type: 'yes_no' | 'multi_option';
  createdBy: string;
  options: string[];
}

export interface CreateWagerRequest {
  userName: string;
  optionId: number;
  amount: number;
}

export interface CloseBetRequest {
  hostPin?: string;
  createdBy?: string;
}

export interface SettleBetRequest {
  winningOptionId: number;
  hostPin?: string;
  createdBy?: string;
}

// Utility types

export interface WagersByOption {
  optionId: number;
  optionLabel: string;
  wagers: Wager[];
  total: number;
}
