import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index';
import { parties, bets, betOptions, wagers, settlements } from '../db/schema';
import { createBetSchema, settleBetSchema, closeBetSchema, formatZodError } from '../validation/schemas';
import { calculatePayouts } from '../utils/payout-calculator';
import { io } from '../index';
import { emitBetCreated, emitBetUpdated, emitSettlementComplete } from '../websocket/events';

const router = Router();

/**
 * GET /api/bets
 * List bets for active party (filterable by status)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;

    // Get active party
    const [activeParty] = await db
      .select()
      .from(parties)
      .where(eq(parties.status, 'active'));

    if (!activeParty) {
      return res.json([]);
    }

    // Build query
    let query = db
      .select()
      .from(bets)
      .where(eq(bets.partyId, activeParty.id));

    // Apply status filter if provided
    if (status && ['open', 'closed', 'settled'].includes(status)) {
      const existingBets = await query;
      const filteredBets = existingBets.filter(bet => bet.status === status);

      // Get options and wagers for each bet
      const betsWithDetails = await Promise.all(
        filteredBets.map(async (bet) => {
          const options = await db
            .select()
            .from(betOptions)
            .where(eq(betOptions.betId, bet.id));

          const betWagers = await db
            .select()
            .from(wagers)
            .where(eq(wagers.betId, bet.id));

          const totalPool = betWagers.reduce((sum, w) => sum + w.amount, 0);

          return {
            ...bet,
            options,
            wagers: betWagers,
            totalPool
          };
        })
      );

      return res.json(betsWithDetails);
    }

    // Return all bets for active party
    const allBets = await query;
    const betsWithDetails = await Promise.all(
      allBets.map(async (bet) => {
        const options = await db
          .select()
          .from(betOptions)
          .where(eq(betOptions.betId, bet.id));

        const betWagers = await db
          .select()
          .from(wagers)
          .where(eq(wagers.betId, bet.id));

        const totalPool = betWagers.reduce((sum, w) => sum + w.amount, 0);

        return {
          ...bet,
          options,
          wagers: betWagers,
          totalPool
        };
      })
    );

    res.json(betsWithDetails);
  } catch (error) {
    console.error('Error fetching bets:', error);
    res.status(500).json({ error: 'Failed to fetch bets' });
  }
});

/**
 * GET /api/bets/:id
 * Get bet details with wagers and options
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const betId = parseInt(req.params.id);

    if (isNaN(betId)) {
      return res.status(400).json({ error: 'Invalid bet ID' });
    }

    const [bet] = await db
      .select()
      .from(bets)
      .where(eq(bets.id, betId));

    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    // Get options
    const options = await db
      .select()
      .from(betOptions)
      .where(eq(betOptions.betId, betId));

    // Get wagers
    const betWagers = await db
      .select()
      .from(wagers)
      .where(eq(wagers.betId, betId));

    const totalPool = betWagers.reduce((sum, w) => sum + w.amount, 0);

    // If settled, get settlements
    let betSettlements: typeof settlements.$inferSelect[] = [];
    if (bet.status === 'settled') {
      betSettlements = await db
        .select()
        .from(settlements)
        .where(eq(settlements.betId, betId));
    }

    res.json({
      ...bet,
      options,
      wagers: betWagers,
      totalPool,
      settlements: betSettlements
    });
  } catch (error) {
    console.error('Error fetching bet:', error);
    res.status(500).json({ error: 'Failed to fetch bet' });
  }
});

/**
 * POST /api/bets
 * Create bet with options
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = createBetSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodError(validation.error)
      });
    }

    const { type, question, createdBy, options: optionLabels } = validation.data;

    // Get active party
    const [activeParty] = await db
      .select()
      .from(parties)
      .where(eq(parties.status, 'active'));

    if (!activeParty) {
      return res.status(400).json({
        error: 'No active party. Please create a party first.'
      });
    }

    // Create bet and options in a transaction
    const [newBet] = await db
      .insert(bets)
      .values({
        partyId: activeParty.id,
        type,
        question,
        createdBy,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    // Create bet options
    const newOptions = await db
      .insert(betOptions)
      .values(
        optionLabels.map(label => ({
          betId: newBet.id,
          label,
          createdAt: new Date().toISOString()
        }))
      )
      .returning();

    // Emit WebSocket event
    if (process.env.NODE_ENV !== 'test') {
      emitBetCreated(io, activeParty.id, {
        id: newBet.id,
        partyId: newBet.partyId,
        title: newBet.question,
        createdBy: newBet.createdBy,
        status: newBet.status
      });
    }

    res.status(201).json({
      ...newBet,
      options: newOptions,
      wagers: [],
      totalPool: 0
    });
  } catch (error) {
    console.error('Error creating bet:', error);
    res.status(500).json({ error: 'Failed to create bet' });
  }
});

/**
 * POST /api/bets/:id/close
 * Close betting (requires PIN or creator match)
 */
router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const betId = parseInt(req.params.id);

    if (isNaN(betId)) {
      return res.status(400).json({ error: 'Invalid bet ID' });
    }

    // Validate input
    const validation = closeBetSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodError(validation.error)
      });
    }

    const [bet] = await db
      .select()
      .from(bets)
      .where(eq(bets.id, betId));

    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.status !== 'open') {
      return res.status(400).json({
        error: `Cannot close bet. Current status: ${bet.status}`
      });
    }

    // Verify authorization
    const hostPin = req.body.hostPin;
    const expectedPin = process.env.HOST_PIN;

    const isHost = hostPin && hostPin === expectedPin;
    const isCreator = req.body.createdBy === bet.createdBy;

    if (!isHost && !isCreator) {
      return res.status(403).json({
        error: 'Unauthorized. Only the host or bet creator can close this bet.'
      });
    }

    // Close the bet
    const [closedBet] = await db
      .update(bets)
      .set({
        status: 'closed',
        updatedAt: new Date().toISOString()
      })
      .where(eq(bets.id, betId))
      .returning();

    // Emit WebSocket event
    if (process.env.NODE_ENV !== 'test') {
      emitBetUpdated(io, bet.partyId, {
        id: closedBet.id,
        partyId: closedBet.partyId,
        status: closedBet.status
      });
    }

    // Get options for response
    const options = await db
      .select()
      .from(betOptions)
      .where(eq(betOptions.betId, betId));

    res.json({
      ...closedBet,
      options
    });
  } catch (error) {
    console.error('Error closing bet:', error);
    res.status(500).json({ error: 'Failed to close bet' });
  }
});

/**
 * POST /api/bets/:id/settle
 * Settle bet and calculate payouts (requires PIN or creator match)
 */
router.post('/:id/settle', async (req: Request, res: Response) => {
  try {
    const betId = parseInt(req.params.id);

    if (isNaN(betId)) {
      return res.status(400).json({ error: 'Invalid bet ID' });
    }

    // Validate input
    const validation = settleBetSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodError(validation.error)
      });
    }

    const { winningOptionId, hostPin } = validation.data;

    const [bet] = await db
      .select()
      .from(bets)
      .where(eq(bets.id, betId));

    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.status === 'settled') {
      return res.status(400).json({ error: 'Bet is already settled' });
    }

    if (bet.status === 'open') {
      return res.status(400).json({
        error: 'Bet must be closed before settling. Please close the bet first.'
      });
    }

    // Verify winning option exists
    const [winningOption] = await db
      .select()
      .from(betOptions)
      .where(and(
        eq(betOptions.id, winningOptionId),
        eq(betOptions.betId, betId)
      ));

    if (!winningOption) {
      return res.status(400).json({
        error: 'Invalid winning option ID for this bet'
      });
    }

    // Verify authorization
    const expectedPin = process.env.HOST_PIN;
    const isHost = hostPin && hostPin === expectedPin;
    const isCreator = req.body.createdBy === bet.createdBy;

    if (!isHost && !isCreator) {
      return res.status(403).json({
        error: 'Unauthorized. Only the host or bet creator can settle this bet.'
      });
    }

    // Get all wagers for this bet
    const betWagers = await db
      .select()
      .from(wagers)
      .where(eq(wagers.betId, betId));

    // Calculate payouts
    const payoutResults = calculatePayouts(
      betWagers.map(w => ({
        userName: w.userName,
        optionId: w.optionId,
        amount: w.amount
      })),
      winningOptionId
    );

    // Insert settlements
    if (payoutResults.length > 0) {
      await db.insert(settlements).values(
        payoutResults.map(result => ({
          betId,
          userName: result.userName,
          totalWagered: result.totalWagered,
          payout: result.payout,
          netWinLoss: result.netWinLoss,
          createdAt: new Date().toISOString()
        }))
      );
    }

    // Update bet status to settled
    const [settledBet] = await db
      .update(bets)
      .set({
        status: 'settled',
        winningOptionId,
        updatedAt: new Date().toISOString()
      })
      .where(eq(bets.id, betId))
      .returning();

    // Emit WebSocket events
    if (process.env.NODE_ENV !== 'test') {
      emitBetUpdated(io, bet.partyId, {
        id: settledBet.id,
        partyId: settledBet.partyId,
        status: settledBet.status,
        settledAt: settledBet.updatedAt
      });

      emitSettlementComplete(io, bet.partyId, {
        betId: settledBet.id,
        partyId: settledBet.partyId,
        winningOptionId,
        settlements: payoutResults.map(r => ({
          userName: r.userName,
          amount: r.netWinLoss
        }))
      });
    }

    // Get options for response
    const options = await db
      .select()
      .from(betOptions)
      .where(eq(betOptions.betId, betId));

    res.json({
      ...settledBet,
      options,
      settlements: payoutResults
    });
  } catch (error) {
    console.error('Error settling bet:', error);
    res.status(500).json({ error: 'Failed to settle bet' });
  }
});

export default router;
