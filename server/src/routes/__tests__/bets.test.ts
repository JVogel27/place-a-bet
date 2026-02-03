import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db/index';
import { parties, bets, betOptions, wagers, settlements } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { initTestDb } from '../../__tests__/test-utils';

// Set test environment variables
process.env.HOST_PIN = '1234';
process.env.NODE_ENV = 'test';

describe('Bets API', () => {
  // Initialize test database tables
  initTestDb();

  let activeParty: any;

  beforeEach(async () => {
    // Clean up tables in correct order (child tables first)
    await db.delete(settlements);
    await db.delete(wagers);
    await db.delete(betOptions);
    await db.delete(bets);
    await db.delete(parties);

    // Create active party for tests
    [activeParty] = await db.insert(parties).values({
      name: 'Test Party',
      date: '2026-01-01T00:00:00Z',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();
  });

  describe('POST /api/bets', () => {
    it('should create a yes/no bet with valid data', async () => {
      const newBet = {
        type: 'yes_no',
        question: 'Will there be overtime?',
        createdBy: 'Alice',
        options: ['Yes', 'No']
      };

      const response = await request(app)
        .post('/api/bets')
        .send(newBet)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe(newBet.type);
      expect(response.body.question).toBe(newBet.question);
      expect(response.body.createdBy).toBe(newBet.createdBy);
      expect(response.body.status).toBe('open');
      expect(response.body.options).toHaveLength(2);
      expect(response.body.totalPool).toBe(0);
    });

    it('should create a multi-option bet', async () => {
      const newBet = {
        type: 'multi_option',
        question: 'Which team wins?',
        createdBy: 'Bob',
        options: ['Chiefs', 'Eagles', 'Tie']
      };

      const response = await request(app)
        .post('/api/bets')
        .send(newBet)
        .expect(201);

      expect(response.body.type).toBe('multi_option');
      expect(response.body.options).toHaveLength(3);
    });

    it('should reject bet without active party', async () => {
      // Archive the active party
      await db.update(parties)
        .set({ status: 'archived', updatedAt: new Date().toISOString() })
        .where(eq(parties.id, activeParty.id));

      const newBet = {
        type: 'yes_no',
        question: 'Test?',
        createdBy: 'Alice',
        options: ['Yes', 'No']
      };

      const response = await request(app)
        .post('/api/bets')
        .send(newBet)
        .expect(400);

      expect(response.body.error).toContain('No active party');
    });

    it('should reject invalid bet type', async () => {
      const invalidBet = {
        type: 'invalid_type',
        question: 'Test?',
        createdBy: 'Alice',
        options: ['Yes', 'No']
      };

      await request(app)
        .post('/api/bets')
        .send(invalidBet)
        .expect(400);
    });

    it('should reject bet with less than 2 options', async () => {
      const invalidBet = {
        type: 'yes_no',
        question: 'Test?',
        createdBy: 'Alice',
        options: ['Only One']
      };

      await request(app)
        .post('/api/bets')
        .send(invalidBet)
        .expect(400);
    });

    it('should reject bet with empty question', async () => {
      const invalidBet = {
        type: 'yes_no',
        question: '',
        createdBy: 'Alice',
        options: ['Yes', 'No']
      };

      await request(app)
        .post('/api/bets')
        .send(invalidBet)
        .expect(400);
    });
  });

  describe('GET /api/bets', () => {
    it('should return empty array when no bets exist', async () => {
      const response = await request(app)
        .get('/api/bets')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all bets for active party', async () => {
      // Create bets
      const [bet1] = await db.insert(bets).values({
        partyId: activeParty.id,
        type: 'yes_no',
        question: 'Bet 1?',
        createdBy: 'Alice',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      await db.insert(betOptions).values([
        { betId: bet1.id, label: 'Yes', createdAt: new Date().toISOString() },
        { betId: bet1.id, label: 'No', createdAt: new Date().toISOString() }
      ]);

      const response = await request(app)
        .get('/api/bets')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].question).toBe('Bet 1?');
      expect(response.body[0].options).toHaveLength(2);
    });

    it('should filter bets by status', async () => {
      // Create open bet
      const [openBet] = await db.insert(bets).values({
        partyId: activeParty.id,
        type: 'yes_no',
        question: 'Open Bet?',
        createdBy: 'Alice',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      await db.insert(betOptions).values([
        { betId: openBet.id, label: 'Yes', createdAt: new Date().toISOString() },
        { betId: openBet.id, label: 'No', createdAt: new Date().toISOString() }
      ]);

      // Create closed bet
      const [closedBet] = await db.insert(bets).values({
        partyId: activeParty.id,
        type: 'yes_no',
        question: 'Closed Bet?',
        createdBy: 'Bob',
        status: 'closed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      await db.insert(betOptions).values([
        { betId: closedBet.id, label: 'Yes', createdAt: new Date().toISOString() },
        { betId: closedBet.id, label: 'No', createdAt: new Date().toISOString() }
      ]);

      // Get only open bets
      const openResponse = await request(app)
        .get('/api/bets?status=open')
        .expect(200);

      expect(openResponse.body).toHaveLength(1);
      expect(openResponse.body[0].status).toBe('open');

      // Get only closed bets
      const closedResponse = await request(app)
        .get('/api/bets?status=closed')
        .expect(200);

      expect(closedResponse.body).toHaveLength(1);
      expect(closedResponse.body[0].status).toBe('closed');
    });
  });

  describe('GET /api/bets/:id', () => {
    it('should return bet details with options and wagers', async () => {
      const [bet] = await db.insert(bets).values({
        partyId: activeParty.id,
        type: 'yes_no',
        question: 'Test Bet?',
        createdBy: 'Alice',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const [option1, option2] = await db.insert(betOptions).values([
        { betId: bet.id, label: 'Yes', createdAt: new Date().toISOString() },
        { betId: bet.id, label: 'No', createdAt: new Date().toISOString() }
      ]).returning();

      await db.insert(wagers).values([
        {
          betId: bet.id,
          optionId: option1.id,
          userName: 'Bob',
          amount: 10,
          createdAt: new Date().toISOString()
        }
      ]);

      const response = await request(app)
        .get(`/api/bets/${bet.id}`)
        .expect(200);

      expect(response.body.id).toBe(bet.id);
      expect(response.body.options).toHaveLength(2);
      expect(response.body.wagers).toHaveLength(1);
      expect(response.body.totalPool).toBe(10);
    });

    it('should return 404 for non-existent bet', async () => {
      await request(app)
        .get('/api/bets/9999')
        .expect(404);
    });

    it('should return 400 for invalid bet ID', async () => {
      await request(app)
        .get('/api/bets/invalid')
        .expect(400);
    });
  });

  describe('POST /api/bets/:id/close', () => {
    let testBet: any;
    let testOptions: any[];

    beforeEach(async () => {
      [testBet] = await db.insert(bets).values({
        partyId: activeParty.id,
        type: 'yes_no',
        question: 'Test Bet?',
        createdBy: 'Alice',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      testOptions = await db.insert(betOptions).values([
        { betId: testBet.id, label: 'Yes', createdAt: new Date().toISOString() },
        { betId: testBet.id, label: 'No', createdAt: new Date().toISOString() }
      ]).returning();
    });

    it('should close bet with valid host PIN', async () => {
      const response = await request(app)
        .post(`/api/bets/${testBet.id}/close`)
        .send({ hostPin: '1234' })
        .expect(200);

      expect(response.body.status).toBe('closed');
    });

    it('should close bet when user is creator', async () => {
      const response = await request(app)
        .post(`/api/bets/${testBet.id}/close`)
        .send({ createdBy: 'Alice' })
        .expect(200);

      expect(response.body.status).toBe('closed');
    });

    it('should reject close without PIN or creator', async () => {
      await request(app)
        .post(`/api/bets/${testBet.id}/close`)
        .send({})
        .expect(403);
    });

    it('should reject close with incorrect PIN', async () => {
      await request(app)
        .post(`/api/bets/${testBet.id}/close`)
        .send({ hostPin: '9999' })
        .expect(403);
    });

    it('should reject close when not creator', async () => {
      await request(app)
        .post(`/api/bets/${testBet.id}/close`)
        .send({ createdBy: 'Bob' })
        .expect(403);
    });

    it('should not close already closed bet', async () => {
      // Close the bet first
      await db.update(bets)
        .set({ status: 'closed', updatedAt: new Date().toISOString() })
        .where(eq(bets.id, testBet.id));

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/close`)
        .send({ hostPin: '1234' })
        .expect(400);

      expect(response.body.error).toContain('Cannot close bet');
    });

    it('should return 404 for non-existent bet', async () => {
      await request(app)
        .post('/api/bets/9999/close')
        .send({ hostPin: '1234' })
        .expect(404);
    });
  });

  describe('POST /api/bets/:id/settle', () => {
    let testBet: any;
    let testOptions: any[];

    beforeEach(async () => {
      [testBet] = await db.insert(bets).values({
        partyId: activeParty.id,
        type: 'yes_no',
        question: 'Test Bet?',
        createdBy: 'Alice',
        status: 'closed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      testOptions = await db.insert(betOptions).values([
        { betId: testBet.id, label: 'Yes', createdAt: new Date().toISOString() },
        { betId: testBet.id, label: 'No', createdAt: new Date().toISOString() }
      ]).returning();

      // Add some wagers
      await db.insert(wagers).values([
        {
          betId: testBet.id,
          optionId: testOptions[0].id,
          userName: 'Bob',
          amount: 10,
          createdAt: new Date().toISOString()
        },
        {
          betId: testBet.id,
          optionId: testOptions[1].id,
          userName: 'Carol',
          amount: 20,
          createdAt: new Date().toISOString()
        }
      ]);
    });

    it('should settle bet and calculate payouts with host PIN', async () => {
      const response = await request(app)
        .post(`/api/bets/${testBet.id}/settle`)
        .send({
          winningOptionId: testOptions[0].id,
          hostPin: '1234'
        })
        .expect(200);

      expect(response.body.status).toBe('settled');
      expect(response.body.winningOptionId).toBe(testOptions[0].id);
      expect(response.body.settlements).toHaveLength(2);
      expect(response.body.settlements[0]).toHaveProperty('userName');
      expect(response.body.settlements[0]).toHaveProperty('payout');
      expect(response.body.settlements[0]).toHaveProperty('netWinLoss');
    });

    it('should settle bet when user is creator', async () => {
      const response = await request(app)
        .post(`/api/bets/${testBet.id}/settle`)
        .send({
          winningOptionId: testOptions[0].id,
          createdBy: 'Alice'
        })
        .expect(200);

      expect(response.body.status).toBe('settled');
    });

    it('should reject settle without PIN or creator', async () => {
      await request(app)
        .post(`/api/bets/${testBet.id}/settle`)
        .send({ winningOptionId: testOptions[0].id })
        .expect(403);
    });

    it('should reject settle with incorrect PIN', async () => {
      await request(app)
        .post(`/api/bets/${testBet.id}/settle`)
        .send({
          winningOptionId: testOptions[0].id,
          hostPin: '9999'
        })
        .expect(403);
    });

    it('should not settle already settled bet', async () => {
      // Settle the bet first
      await db.update(bets)
        .set({
          status: 'settled',
          winningOptionId: testOptions[0].id,
          updatedAt: new Date().toISOString()
        })
        .where(eq(bets.id, testBet.id));

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/settle`)
        .send({
          winningOptionId: testOptions[0].id,
          hostPin: '1234'
        })
        .expect(400);

      expect(response.body.error).toBe('Bet is already settled');
    });

    it('should not settle open bet', async () => {
      // Set bet to open
      await db.update(bets)
        .set({ status: 'open', updatedAt: new Date().toISOString() })
        .where(eq(bets.id, testBet.id));

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/settle`)
        .send({
          winningOptionId: testOptions[0].id,
          hostPin: '1234'
        })
        .expect(400);

      expect(response.body.error).toContain('must be closed');
    });

    it('should reject invalid winning option ID', async () => {
      const response = await request(app)
        .post(`/api/bets/${testBet.id}/settle`)
        .send({
          winningOptionId: 9999,
          hostPin: '1234'
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid winning option');
    });

    it('should calculate correct payouts', async () => {
      const response = await request(app)
        .post(`/api/bets/${testBet.id}/settle`)
        .send({
          winningOptionId: testOptions[0].id,
          hostPin: '1234'
        })
        .expect(200);

      // Bob wagered $10 on winning option
      // Carol wagered $20 on losing option
      // Total pool: $30
      // Bob should get: (10/10) × 30 = 30, net = 30 - 10 = 20
      const bobSettlement = response.body.settlements.find((s: any) => s.userName === 'Bob');
      expect(bobSettlement.totalWagered).toBe(10);
      expect(bobSettlement.payout).toBe(30);
      expect(bobSettlement.netWinLoss).toBe(20);

      const carolSettlement = response.body.settlements.find((s: any) => s.userName === 'Carol');
      expect(carolSettlement.totalWagered).toBe(20);
      expect(carolSettlement.payout).toBe(0);
      expect(carolSettlement.netWinLoss).toBe(-20);
    });

    it('should return 404 for non-existent bet', async () => {
      await request(app)
        .post('/api/bets/9999/settle')
        .send({
          winningOptionId: 1,
          hostPin: '1234'
        })
        .expect(404);
    });
  });
});
