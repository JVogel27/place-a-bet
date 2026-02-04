import { Router, Request, Response } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index';
import { parties, bets, betOptions, wagers } from '../db/schema';
import { createWagerSchema, formatZodError } from '../validation/schemas';
import { io } from '../index';
import { emitWagerPlaced } from '../websocket/events';

const router = Router();

/**
 * POST /api/bets/:id/wagers
 * Place a wager on a bet
 */
router.post('/:id/wagers', async (req: Request, res: Response) => {
  try {
    const betId = parseInt(req.params.id);

    if (isNaN(betId)) {
      return res.status(400).json({ error: 'Invalid bet ID' });
    }

    // Validate input
    const validation = createWagerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodError(validation.error)
      });
    }

    const { userName, optionId, amount } = validation.data;

    // Get the bet
    const [bet] = await db
      .select()
      .from(bets)
      .where(eq(bets.id, betId));

    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    // Verify bet is open
    if (bet.status !== 'open') {
      return res.status(400).json({
        error: `Cannot place wager. Bet is ${bet.status}.`
      });
    }

    // Verify option belongs to this bet
    const [option] = await db
      .select()
      .from(betOptions)
      .where(and(
        eq(betOptions.id, optionId),
        eq(betOptions.betId, betId)
      ));

    if (!option) {
      return res.status(400).json({
        error: 'Invalid option ID for this bet'
      });
    }

    // Create the wager
    const [newWager] = await db
      .insert(wagers)
      .values({
        betId,
        optionId,
        userName,
        amount,
        createdAt: new Date().toISOString()
      })
      .returning();

    // Emit WebSocket event
    if (process.env.NODE_ENV !== 'test') {
      emitWagerPlaced(io, bet.partyId, {
        id: newWager.id,
        betId: newWager.betId,
        partyId: bet.partyId,
        userName: newWager.userName,
        amount: newWager.amount,
        betOptionId: newWager.optionId
      });
    }

    res.status(201).json(newWager);
  } catch (error) {
    console.error('Error placing wager:', error);
    res.status(500).json({ error: 'Failed to place wager' });
  }
});

/**
 * GET /api/bets/:id/wagers
 * Get all wagers for a bet, grouped by option
 */
router.get('/:id/wagers', async (req: Request, res: Response) => {
  try {
    const betId = parseInt(req.params.id);

    if (isNaN(betId)) {
      return res.status(400).json({ error: 'Invalid bet ID' });
    }

    // Verify bet exists
    const [bet] = await db
      .select()
      .from(bets)
      .where(eq(bets.id, betId));

    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    // Get all wagers for this bet
    const betWagers = await db
      .select({
        id: wagers.id,
        betId: wagers.betId,
        optionId: wagers.optionId,
        userName: wagers.userName,
        amount: wagers.amount,
        createdAt: wagers.createdAt,
        optionLabel: betOptions.label
      })
      .from(wagers)
      .innerJoin(betOptions, eq(wagers.optionId, betOptions.id))
      .where(eq(wagers.betId, betId));

    // Group by option
    const groupedByOption = betWagers.reduce((acc, wager) => {
      if (!acc[wager.optionId]) {
        acc[wager.optionId] = {
          optionId: wager.optionId,
          optionLabel: wager.optionLabel,
          wagers: [],
          totalAmount: 0
        };
      }
      acc[wager.optionId].wagers.push({
        id: wager.id,
        userName: wager.userName,
        amount: wager.amount,
        createdAt: wager.createdAt
      });
      acc[wager.optionId].totalAmount += wager.amount;
      return acc;
    }, {} as Record<number, any>);

    res.json({
      betId,
      options: Object.values(groupedByOption),
      totalPool: betWagers.reduce((sum, w) => sum + w.amount, 0)
    });
  } catch (error) {
    console.error('Error fetching wagers:', error);
    res.status(500).json({ error: 'Failed to fetch wagers' });
  }
});

/**
 * GET /api/users/:userName/wagers
 * Get all wagers for a user in the active party
 */
router.get('/users/:userName/wagers', async (req: Request, res: Response) => {
  try {
    const { userName } = req.params;

    if (!userName || userName.trim() === '') {
      return res.status(400).json({ error: 'User name is required' });
    }

    // Get active party
    const [activeParty] = await db
      .select()
      .from(parties)
      .where(eq(parties.status, 'active'));

    if (!activeParty) {
      return res.json({
        userName,
        partyId: null,
        partyName: null,
        wagers: []
      });
    }

    // Get all bets for active party
    const partyBets = await db
      .select()
      .from(bets)
      .where(eq(bets.partyId, activeParty.id));

    if (partyBets.length === 0) {
      return res.json({
        userName,
        partyId: activeParty.id,
        partyName: activeParty.name,
        wagers: []
      });
    }

    const betIds = partyBets.map(b => b.id);

    // Get user's wagers for those bets
    const userWagers = await db
      .select({
        id: wagers.id,
        betId: wagers.betId,
        optionId: wagers.optionId,
        amount: wagers.amount,
        createdAt: wagers.createdAt,
        betQuestion: bets.question,
        betStatus: bets.status,
        optionLabel: betOptions.label
      })
      .from(wagers)
      .innerJoin(bets, eq(wagers.betId, bets.id))
      .innerJoin(betOptions, eq(wagers.optionId, betOptions.id))
      .where(and(
        eq(wagers.userName, userName),
        inArray(wagers.betId, betIds)
      ));

    res.json({
      userName,
      partyId: activeParty.id,
      partyName: activeParty.name,
      wagers: userWagers
    });
  } catch (error) {
    console.error('Error fetching user wagers:', error);
    res.status(500).json({ error: 'Failed to fetch user wagers' });
  }
});

export default router;
