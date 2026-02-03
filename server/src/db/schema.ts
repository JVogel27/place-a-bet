import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Parties table
export const parties = sqliteTable('parties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  date: text('date').notNull(), // ISO date string
  description: text('description'),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Bets table
export const bets = sqliteTable('bets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  partyId: integer('party_id').notNull().references(() => parties.id),
  type: text('type', { enum: ['yes_no', 'multi_option'] }).notNull(),
  question: text('question').notNull(),
  createdBy: text('created_by').notNull(), // Guest name
  status: text('status', { enum: ['open', 'closed', 'settled'] }).notNull().default('open'),
  winningOptionId: integer('winning_option_id'), // Set when settled
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Bet options table (outcomes)
export const betOptions = sqliteTable('bet_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  betId: integer('bet_id').notNull().references(() => bets.id),
  label: text('label').notNull(), // e.g., "Chiefs", "Yes", "No"
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Wagers table
export const wagers = sqliteTable('wagers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  betId: integer('bet_id').notNull().references(() => bets.id),
  optionId: integer('option_id').notNull().references(() => betOptions.id),
  userName: text('user_name').notNull(), // Guest name
  amount: real('amount').notNull(), // USD (whole dollars only)
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Settlements table - stores calculated payouts when bet is settled
// This avoids recalculating payouts and provides an audit trail
export const settlements = sqliteTable('settlements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  betId: integer('bet_id').notNull().references(() => bets.id),
  userName: text('user_name').notNull(), // Guest name
  totalWagered: real('total_wagered').notNull(), // Total amount user wagered across all options in this bet
  payout: real('payout').notNull(), // Amount user won (0 if they lost)
  netWinLoss: real('net_win_loss').notNull(), // payout - totalWagered (negative if lost)
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Type exports for TypeScript
export type Party = typeof parties.$inferSelect;
export type NewParty = typeof parties.$inferInsert;

export type Bet = typeof bets.$inferSelect;
export type NewBet = typeof bets.$inferInsert;

export type BetOption = typeof betOptions.$inferSelect;
export type NewBetOption = typeof betOptions.$inferInsert;

export type Wager = typeof wagers.$inferSelect;
export type NewWager = typeof wagers.$inferInsert;

export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
