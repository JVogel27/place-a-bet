import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db/index';
import { parties, bets, betOptions, wagers, settlements } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { initTestDb } from '../../__tests__/test-utils';

// Set test environment variables
process.env.HOST_PIN = '1234';
process.env.NODE_ENV = 'test';

describe('Parties API', () => {
  // Initialize test database tables
  initTestDb();

  beforeEach(async () => {
    // Clean up tables in correct order (child tables first due to foreign keys)
    await db.delete(settlements);
    await db.delete(wagers);
    await db.delete(betOptions);
    await db.delete(bets);
    await db.delete(parties);
  });

  describe('GET /api/parties', () => {
    it('should return empty array when no parties exist', async () => {
      const response = await request(app)
        .get('/api/parties')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all parties with stats', async () => {
      // Create test parties
      await db.insert(parties).values([
        {
          name: 'Party 1',
          date: '2026-01-01T00:00:00Z',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          name: 'Party 2',
          date: '2026-01-02T00:00:00Z',
          status: 'archived',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);

      const response = await request(app)
        .get('/api/parties')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('betCount');
      expect(response.body[0]).toHaveProperty('totalWagered');
    });
  });

  describe('POST /api/parties', () => {
    it('should create a new party with valid data and PIN', async () => {
      const newParty = {
        name: 'Super Bowl 2026',
        date: '2026-02-01T18:00:00Z',
        description: 'Annual Super Bowl party',
        hostPin: '1234'
      };

      const response = await request(app)
        .post('/api/parties')
        .send(newParty)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newParty.name);
      expect(response.body.date).toBe(newParty.date);
      expect(response.body.description).toBe(newParty.description);
      expect(response.body.status).toBe('active');
    });

    it('should create party without description', async () => {
      const newParty = {
        name: 'Game Night',
        date: '2026-03-15T19:00:00Z',
        hostPin: '1234'
      };

      const response = await request(app)
        .post('/api/parties')
        .send(newParty)
        .expect(201);

      expect(response.body.name).toBe(newParty.name);
      expect(response.body.description).toBeNull();
    });

    it('should reject request without host PIN', async () => {
      const newParty = {
        name: 'Party',
        date: '2026-01-01T00:00:00Z'
      };

      const response = await request(app)
        .post('/api/parties')
        .send(newParty)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with incorrect host PIN', async () => {
      const newParty = {
        name: 'Party',
        date: '2026-01-01T00:00:00Z',
        hostPin: '9999'
      };

      const response = await request(app)
        .post('/api/parties')
        .send(newParty)
        .expect(401);

      expect(response.body.error).toBe('Invalid host PIN');
    });

    it('should archive existing active party when creating new one', async () => {
      // Create first party
      const [firstParty] = await db.insert(parties).values({
        name: 'First Party',
        date: '2026-01-01T00:00:00Z',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      // Create second party
      await request(app)
        .post('/api/parties')
        .send({
          name: 'Second Party',
          date: '2026-01-02T00:00:00Z',
          hostPin: '1234'
        })
        .expect(201);

      // Check first party is now archived
      const [archivedParty] = await db
        .select()
        .from(parties)
        .where(eq(parties.id, firstParty.id));

      expect(archivedParty.status).toBe('archived');
    });

    it('should reject invalid party data', async () => {
      const invalidParty = {
        name: '', // Empty name
        date: '2026-01-01T00:00:00Z',
        hostPin: '1234'
      };

      const response = await request(app)
        .post('/api/parties')
        .send(invalidParty)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('should reject invalid date format', async () => {
      const invalidParty = {
        name: 'Party',
        date: '2026-01-01', // Missing time
        hostPin: '1234'
      };

      const response = await request(app)
        .post('/api/parties')
        .send(invalidParty)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid PIN format', async () => {
      const invalidParty = {
        name: 'Party',
        date: '2026-01-01T00:00:00Z',
        hostPin: '123' // Too short
      };

      const response = await request(app)
        .post('/api/parties')
        .send(invalidParty)
        .expect(401); // PIN validation happens before body validation

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/parties/:id', () => {
    it('should return party by ID with stats', async () => {
      const [party] = await db.insert(parties).values({
        name: 'Test Party',
        date: '2026-01-01T00:00:00Z',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const response = await request(app)
        .get(`/api/parties/${party.id}`)
        .expect(200);

      expect(response.body.id).toBe(party.id);
      expect(response.body.name).toBe(party.name);
      expect(response.body).toHaveProperty('betCount');
      expect(response.body).toHaveProperty('totalWagered');
    });

    it('should return 404 for non-existent party', async () => {
      const response = await request(app)
        .get('/api/parties/9999')
        .expect(404);

      expect(response.body.error).toBe('Party not found');
    });

    it('should return 400 for invalid party ID', async () => {
      const response = await request(app)
        .get('/api/parties/invalid')
        .expect(400);

      expect(response.body.error).toBe('Invalid party ID');
    });
  });

  describe('PATCH /api/parties/:id/archive', () => {
    it('should archive party with valid PIN', async () => {
      const [party] = await db.insert(parties).values({
        name: 'Test Party',
        date: '2026-01-01T00:00:00Z',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const response = await request(app)
        .patch(`/api/parties/${party.id}/archive`)
        .send({ hostPin: '1234' })
        .expect(200);

      expect(response.body.status).toBe('archived');
      expect(response.body.id).toBe(party.id);
    });

    it('should reject archive without host PIN', async () => {
      const [party] = await db.insert(parties).values({
        name: 'Test Party',
        date: '2026-01-01T00:00:00Z',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      await request(app)
        .patch(`/api/parties/${party.id}/archive`)
        .send({})
        .expect(401);
    });

    it('should reject archive with incorrect PIN', async () => {
      const [party] = await db.insert(parties).values({
        name: 'Test Party',
        date: '2026-01-01T00:00:00Z',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      await request(app)
        .patch(`/api/parties/${party.id}/archive`)
        .send({ hostPin: '9999' })
        .expect(401);
    });

    it('should return 404 for non-existent party', async () => {
      await request(app)
        .patch('/api/parties/9999/archive')
        .send({ hostPin: '1234' })
        .expect(404);
    });

    it('should return 400 when trying to archive already archived party', async () => {
      const [party] = await db.insert(parties).values({
        name: 'Test Party',
        date: '2026-01-01T00:00:00Z',
        status: 'archived',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const response = await request(app)
        .patch(`/api/parties/${party.id}/archive`)
        .send({ hostPin: '1234' })
        .expect(400);

      expect(response.body.error).toBe('Party is already archived');
    });

    it('should return 400 for invalid party ID', async () => {
      await request(app)
        .patch('/api/parties/invalid/archive')
        .send({ hostPin: '1234' })
        .expect(400);
    });
  });

  describe('GET /api/parties/:id/settlement-summary', () => {
    it('should return settlement summary for party with multiple settled bets', async () => {
      // Create party
      const [party] = await db.insert(parties).values({
        name: 'Super Bowl Party',
        date: '2026-02-08T00:00:00Z',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      // Create first bet
      const [bet1] = await db.insert(bets).values({
        partyId: party.id,
        type: 'yes_no',
        question: 'Overtime?',
        createdBy: 'Alice',
        status: 'settled',
        winningOptionId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const [bet1Option1] = await db.insert(betOptions).values({
        betId: bet1.id,
        label: 'Yes',
        createdAt: new Date().toISOString()
      }).returning();

      const [bet1Option2] = await db.insert(betOptions).values({
        betId: bet1.id,
        label: 'No',
        createdAt: new Date().toISOString()
      }).returning();

      // Create wagers for bet 1
      await db.insert(wagers).values([
        { betId: bet1.id, optionId: bet1Option1.id, userName: 'Alice', amount: 50, createdAt: new Date().toISOString() },
        { betId: bet1.id, optionId: bet1Option2.id, userName: 'Bob', amount: 30, createdAt: new Date().toISOString() },
        { betId: bet1.id, optionId: bet1Option1.id, userName: 'Carol', amount: 20, createdAt: new Date().toISOString() }
      ]);

      // Create settlements for bet 1
      await db.insert(settlements).values([
        { betId: bet1.id, userName: 'Alice', totalWagered: 50, payout: 70, netWinLoss: 20, createdAt: new Date().toISOString() },
        { betId: bet1.id, userName: 'Bob', totalWagered: 30, payout: 0, netWinLoss: -30, createdAt: new Date().toISOString() },
        { betId: bet1.id, userName: 'Carol', totalWagered: 20, payout: 30, netWinLoss: 10, createdAt: new Date().toISOString() }
      ]);

      // Create second bet
      const [bet2] = await db.insert(bets).values({
        partyId: party.id,
        type: 'multi_option',
        question: 'Who wins MVP?',
        createdBy: 'Bob',
        status: 'settled',
        winningOptionId: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const [bet2Option1] = await db.insert(betOptions).values({
        betId: bet2.id,
        label: 'QB',
        createdAt: new Date().toISOString()
      }).returning();

      const [bet2Option2] = await db.insert(betOptions).values({
        betId: bet2.id,
        label: 'RB',
        createdAt: new Date().toISOString()
      }).returning();

      // Create wagers for bet 2
      await db.insert(wagers).values([
        { betId: bet2.id, optionId: bet2Option1.id, userName: 'Alice', amount: 40, createdAt: new Date().toISOString() },
        { betId: bet2.id, optionId: bet2Option2.id, userName: 'Bob', amount: 60, createdAt: new Date().toISOString() }
      ]);

      // Create settlements for bet 2
      await db.insert(settlements).values([
        { betId: bet2.id, userName: 'Alice', totalWagered: 40, payout: 0, netWinLoss: -40, createdAt: new Date().toISOString() },
        { betId: bet2.id, userName: 'Bob', totalWagered: 60, payout: 100, netWinLoss: 40, createdAt: new Date().toISOString() }
      ]);

      const response = await request(app)
        .get(`/api/parties/${party.id}/settlement-summary`)
        .expect(200);

      expect(response.body.partyId).toBe(party.id);
      expect(response.body.partyName).toBe('Super Bowl Party');
      expect(response.body.totalPot).toBe(200); // Sum of all wagers
      expect(response.body.users).toHaveLength(3);

      // Verify aggregation and sorting
      // Bob: -30 + 40 = 10
      // Carol: 10
      // Alice: 20 + (-40) = -20 (last)

      // First two users should have netAmount of 10 (order not guaranteed when equal)
      expect(response.body.users[0].netAmount).toBe(10);
      expect(response.body.users[1].netAmount).toBe(10);
      expect(['Bob', 'Carol']).toContain(response.body.users[0].userName);
      expect(['Bob', 'Carol']).toContain(response.body.users[1].userName);

      // Alice should be last with -20
      expect(response.body.users[2].userName).toBe('Alice');
      expect(response.body.users[2].netAmount).toBe(-20);
    });

    it('should return empty summary for party with no settled bets', async () => {
      const [party] = await db.insert(parties).values({
        name: 'New Party',
        date: '2026-03-01T00:00:00Z',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const response = await request(app)
        .get(`/api/parties/${party.id}/settlement-summary`)
        .expect(200);

      expect(response.body.partyId).toBe(party.id);
      expect(response.body.partyName).toBe('New Party');
      expect(response.body.users).toHaveLength(0);
      expect(response.body.totalPot).toBe(0);
    });

    it('should handle party with bets but no settlements yet', async () => {
      const [party] = await db.insert(parties).values({
        name: 'Game Night',
        date: '2026-04-01T00:00:00Z',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const [bet] = await db.insert(bets).values({
        partyId: party.id,
        type: 'yes_no',
        question: 'Test?',
        createdBy: 'Alice',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const [option1] = await db.insert(betOptions).values({
        betId: bet.id,
        label: 'Yes',
        createdAt: new Date().toISOString()
      }).returning();

      await db.insert(wagers).values({
        betId: bet.id,
        optionId: option1.id,
        userName: 'Alice',
        amount: 50,
        createdAt: new Date().toISOString()
      });

      const response = await request(app)
        .get(`/api/parties/${party.id}/settlement-summary`)
        .expect(200);

      expect(response.body.users).toHaveLength(0);
      expect(response.body.totalPot).toBe(50);
    });

    it('should return 404 for non-existent party', async () => {
      const response = await request(app)
        .get('/api/parties/9999/settlement-summary')
        .expect(404);

      expect(response.body.error).toBe('Party not found');
    });

    it('should return 400 for invalid party ID', async () => {
      const response = await request(app)
        .get('/api/parties/invalid/settlement-summary')
        .expect(400);

      expect(response.body.error).toBe('Invalid party ID');
    });

    it('should correctly sort users with positive amounts first', async () => {
      const [party] = await db.insert(parties).values({
        name: 'Test Party',
        date: '2026-05-01T00:00:00Z',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const [bet] = await db.insert(bets).values({
        partyId: party.id,
        type: 'yes_no',
        question: 'Test?',
        createdBy: 'Alice',
        status: 'settled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      await db.insert(settlements).values([
        { betId: bet.id, userName: 'Winner1', totalWagered: 50, payout: 100, netWinLoss: 50, createdAt: new Date().toISOString() },
        { betId: bet.id, userName: 'Loser1', totalWagered: 30, payout: 0, netWinLoss: -30, createdAt: new Date().toISOString() },
        { betId: bet.id, userName: 'Winner2', totalWagered: 20, payout: 50, netWinLoss: 30, createdAt: new Date().toISOString() },
        { betId: bet.id, userName: 'Loser2', totalWagered: 40, payout: 0, netWinLoss: -40, createdAt: new Date().toISOString() }
      ]);

      const response = await request(app)
        .get(`/api/parties/${party.id}/settlement-summary`)
        .expect(200);

      expect(response.body.users).toHaveLength(4);
      // Should be sorted: 50, 30, -30, -40
      expect(response.body.users[0].userName).toBe('Winner1');
      expect(response.body.users[0].netAmount).toBe(50);
      expect(response.body.users[1].userName).toBe('Winner2');
      expect(response.body.users[1].netAmount).toBe(30);
      expect(response.body.users[2].userName).toBe('Loser1');
      expect(response.body.users[2].netAmount).toBe(-30);
      expect(response.body.users[3].userName).toBe('Loser2');
      expect(response.body.users[3].netAmount).toBe(-40);
    });
  });
});
