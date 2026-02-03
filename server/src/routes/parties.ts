import { Router, Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { parties, bets, wagers } from '../db/schema';
import { createPartySchema, formatZodError } from '../validation/schemas';

const router = Router();

/**
 * Middleware to verify host PIN
 */
function verifyHostPin(req: Request, res: Response, next: Function) {
  const hostPin = req.body.hostPin || req.query.hostPin;
  const expectedPin = process.env.HOST_PIN;

  if (!expectedPin) {
    return res.status(500).json({
      error: 'Host PIN not configured. Please set HOST_PIN in environment variables.'
    });
  }

  if (hostPin !== expectedPin) {
    return res.status(401).json({ error: 'Invalid host PIN' });
  }

  next();
}

/**
 * GET /api/parties
 * List all parties
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const allParties = await db.select().from(parties).orderBy(sql`${parties.createdAt} DESC`);

    // Get bet counts and total wagered for each party
    const partiesWithStats = await Promise.all(
      allParties.map(async (party) => {
        const partyBets = await db
          .select()
          .from(bets)
          .where(eq(bets.partyId, party.id));

        const betIds = partyBets.map(b => b.id);

        let totalWagered = 0;
        if (betIds.length > 0) {
          const wagerResults = await db
            .select({ total: sql<number>`COALESCE(SUM(${wagers.amount}), 0)` })
            .from(wagers)
            .where(sql`${wagers.betId} IN (${sql.join(betIds.map(id => sql`${id}`), sql`, `)})`);

          totalWagered = wagerResults[0]?.total || 0;
        }

        return {
          ...party,
          betCount: partyBets.length,
          totalWagered
        };
      })
    );

    res.json(partiesWithStats);
  } catch (error) {
    console.error('Error fetching parties:', error);
    res.status(500).json({ error: 'Failed to fetch parties' });
  }
});

/**
 * POST /api/parties
 * Create a new party (requires host PIN)
 * Automatically archives the current active party
 */
router.post('/', verifyHostPin, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = createPartySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodError(validation.error)
      });
    }

    const { name, date, description } = validation.data;

    // Archive any existing active party
    await db
      .update(parties)
      .set({ status: 'archived', updatedAt: new Date().toISOString() })
      .where(eq(parties.status, 'active'));

    // Create new party
    const [newParty] = await db
      .insert(parties)
      .values({
        name,
        date,
        description: description || null,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    res.status(201).json(newParty);
  } catch (error) {
    console.error('Error creating party:', error);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

/**
 * GET /api/parties/:id
 * Get party details by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const partyId = parseInt(req.params.id);

    if (isNaN(partyId)) {
      return res.status(400).json({ error: 'Invalid party ID' });
    }

    const [party] = await db
      .select()
      .from(parties)
      .where(eq(parties.id, partyId));

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    // Get bet count and total wagered
    const partyBets = await db
      .select()
      .from(bets)
      .where(eq(bets.partyId, partyId));

    const betIds = partyBets.map(b => b.id);

    let totalWagered = 0;
    if (betIds.length > 0) {
      const wagerResults = await db
        .select({ total: sql<number>`COALESCE(SUM(${wagers.amount}), 0)` })
        .from(wagers)
        .where(sql`${wagers.betId} IN (${sql.join(betIds.map(id => sql`${id}`), sql`, `)})`);

      totalWagered = wagerResults[0]?.total || 0;
    }

    res.json({
      ...party,
      betCount: partyBets.length,
      totalWagered
    });
  } catch (error) {
    console.error('Error fetching party:', error);
    res.status(500).json({ error: 'Failed to fetch party' });
  }
});

/**
 * PATCH /api/parties/:id/archive
 * Archive a party (requires host PIN)
 */
router.patch('/:id/archive', verifyHostPin, async (req: Request, res: Response) => {
  try {
    const partyId = parseInt(req.params.id);

    if (isNaN(partyId)) {
      return res.status(400).json({ error: 'Invalid party ID' });
    }

    const [party] = await db
      .select()
      .from(parties)
      .where(eq(parties.id, partyId));

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (party.status === 'archived') {
      return res.status(400).json({ error: 'Party is already archived' });
    }

    const [updatedParty] = await db
      .update(parties)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString()
      })
      .where(eq(parties.id, partyId))
      .returning();

    res.json(updatedParty);
  } catch (error) {
    console.error('Error archiving party:', error);
    res.status(500).json({ error: 'Failed to archive party' });
  }
});

export default router;
