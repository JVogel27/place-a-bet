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

describe('Wagers API', () => {
  // Initialize test database tables
  initTestDb();

  let activeParty: any;
  let testBet: any;
  let option1: any;
  let option2: any;

  beforeEach(async () => {
    // Clean up tables in correct order (child tables first)
    await db.delete(settlements);
    await db.delete(wagers);
    await db.delete(betOptions);
    await db.delete(bets);
    await db.delete(parties);

    // Create active party
    [activeParty] = await db.insert(parties).values({
      name: 'Super Bowl Party',
      date: '2026-02-08T00:00:00Z',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    // Create test bet
    [testBet] = await db.insert(bets).values({
      partyId: activeParty.id,
      type: 'yes_no',
      question: 'Will there be overtime?',
      createdBy: 'Alice',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    // Create bet options
    const options = await db.insert(betOptions).values([
      {
        betId: testBet.id,
        label: 'Yes',
        createdAt: new Date().toISOString()
      },
      {
        betId: testBet.id,
        label: 'No',
        createdAt: new Date().toISOString()
      }
    ]).returning();

    [option1, option2] = options;
  });

  describe('POST /api/bets/:id/wagers', () => {
    it('should successfully place a wager on an open bet', async () => {
      const newWager = {
        userName: 'Bob',
        optionId: option1.id,
        amount: 50
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(newWager)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.betId).toBe(testBet.id);
      expect(response.body.optionId).toBe(option1.id);
      expect(response.body.userName).toBe('Bob');
      expect(response.body.amount).toBe(50);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should reject wager on closed bet', async () => {
      // Close the bet
      await db.update(bets)
        .set({ status: 'closed', updatedAt: new Date().toISOString() })
        .where(eq(bets.id, testBet.id));

      const newWager = {
        userName: 'Bob',
        optionId: option1.id,
        amount: 50
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(newWager)
        .expect(400);

      expect(response.body.error).toContain('Bet is closed');
    });

    it('should reject wager on settled bet', async () => {
      // Settle the bet
      await db.update(bets)
        .set({
          status: 'settled',
          winningOptionId: option1.id,
          updatedAt: new Date().toISOString()
        })
        .where(eq(bets.id, testBet.id));

      const newWager = {
        userName: 'Bob',
        optionId: option1.id,
        amount: 50
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(newWager)
        .expect(400);

      expect(response.body.error).toContain('Bet is settled');
    });

    it('should reject wager on invalid option', async () => {
      const newWager = {
        userName: 'Bob',
        optionId: 99999, // Non-existent option
        amount: 50
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(newWager)
        .expect(400);

      expect(response.body.error).toContain('Invalid option ID');
    });

    it('should reject wager on option from different bet', async () => {
      // Create another bet with its own options
      const [otherBet] = await db.insert(bets).values({
        partyId: activeParty.id,
        type: 'yes_no',
        question: 'Other bet?',
        createdBy: 'Carol',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const [otherOption] = await db.insert(betOptions).values({
        betId: otherBet.id,
        label: 'Yes',
        createdAt: new Date().toISOString()
      }).returning();

      const newWager = {
        userName: 'Bob',
        optionId: otherOption.id, // Option from different bet
        amount: 50
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(newWager)
        .expect(400);

      expect(response.body.error).toContain('Invalid option ID');
    });

    it('should reject decimal amounts', async () => {
      const invalidWager = {
        userName: 'Bob',
        optionId: option1.id,
        amount: 50.50 // Decimal not allowed
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(invalidWager)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details.some((msg: string) => msg.includes('whole dollars'))).toBe(true);
    });

    it('should reject negative amounts', async () => {
      const invalidWager = {
        userName: 'Bob',
        optionId: option1.id,
        amount: -10
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(invalidWager)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details.some((msg: string) => msg.includes('greater than 0'))).toBe(true);
    });

    it('should reject zero amounts', async () => {
      const invalidWager = {
        userName: 'Bob',
        optionId: option1.id,
        amount: 0
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(invalidWager)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details.some((msg: string) => msg.includes('greater than 0'))).toBe(true);
    });

    it('should reject amounts over $10,000', async () => {
      const invalidWager = {
        userName: 'Bob',
        optionId: option1.id,
        amount: 10001
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(invalidWager)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details.some((msg: string) => msg.includes('10,000'))).toBe(true);
    });

    it('should allow hedging - same user placing multiple wagers on same bet', async () => {
      // First wager
      await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send({
          userName: 'Bob',
          optionId: option1.id,
          amount: 30
        })
        .expect(201);

      // Second wager by same user on different option (hedging)
      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send({
          userName: 'Bob',
          optionId: option2.id,
          amount: 20
        })
        .expect(201);

      expect(response.body.userName).toBe('Bob');
      expect(response.body.optionId).toBe(option2.id);
      expect(response.body.amount).toBe(20);

      // Verify both wagers exist
      const allWagers = await db.select().from(wagers);
      expect(allWagers).toHaveLength(2);
      expect(allWagers.every(w => w.userName === 'Bob')).toBe(true);
    });

    it('should reject invalid bet ID', async () => {
      const newWager = {
        userName: 'Bob',
        optionId: option1.id,
        amount: 50
      };

      const response = await request(app)
        .post('/api/bets/invalid/wagers')
        .send(newWager)
        .expect(400);

      expect(response.body.error).toBe('Invalid bet ID');
    });

    it('should reject wager on non-existent bet', async () => {
      const newWager = {
        userName: 'Bob',
        optionId: option1.id,
        amount: 50
      };

      const response = await request(app)
        .post('/api/bets/99999/wagers')
        .send(newWager)
        .expect(404);

      expect(response.body.error).toBe('Bet not found');
    });

    it('should reject wager with missing userName', async () => {
      const invalidWager = {
        optionId: option1.id,
        amount: 50
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(invalidWager)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject wager with missing optionId', async () => {
      const invalidWager = {
        userName: 'Bob',
        amount: 50
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(invalidWager)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject wager with missing amount', async () => {
      const invalidWager = {
        userName: 'Bob',
        optionId: option1.id
      };

      const response = await request(app)
        .post(`/api/bets/${testBet.id}/wagers`)
        .send(invalidWager)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/bets/:id/wagers', () => {
    it('should get all wagers for a bet grouped by option', async () => {
      // Create some wagers
      await db.insert(wagers).values([
        {
          betId: testBet.id,
          optionId: option1.id,
          userName: 'Alice',
          amount: 50,
          createdAt: new Date().toISOString()
        },
        {
          betId: testBet.id,
          optionId: option1.id,
          userName: 'Bob',
          amount: 30,
          createdAt: new Date().toISOString()
        },
        {
          betId: testBet.id,
          optionId: option2.id,
          userName: 'Carol',
          amount: 40,
          createdAt: new Date().toISOString()
        }
      ]);

      const response = await request(app)
        .get(`/api/bets/${testBet.id}/wagers`)
        .expect(200);

      expect(response.body.betId).toBe(testBet.id);
      expect(response.body.totalPool).toBe(120);
      expect(response.body.options).toHaveLength(2);

      // Check option1 group
      const option1Group = response.body.options.find((o: any) => o.optionId === option1.id);
      expect(option1Group).toBeDefined();
      expect(option1Group.optionLabel).toBe('Yes');
      expect(option1Group.totalAmount).toBe(80);
      expect(option1Group.wagers).toHaveLength(2);

      // Check option2 group
      const option2Group = response.body.options.find((o: any) => o.optionId === option2.id);
      expect(option2Group).toBeDefined();
      expect(option2Group.optionLabel).toBe('No');
      expect(option2Group.totalAmount).toBe(40);
      expect(option2Group.wagers).toHaveLength(1);
    });

    it('should return empty array when bet has no wagers', async () => {
      const response = await request(app)
        .get(`/api/bets/${testBet.id}/wagers`)
        .expect(200);

      expect(response.body.betId).toBe(testBet.id);
      expect(response.body.totalPool).toBe(0);
      expect(response.body.options).toHaveLength(0);
    });

    it('should reject invalid bet ID', async () => {
      const response = await request(app)
        .get('/api/bets/invalid/wagers')
        .expect(400);

      expect(response.body.error).toBe('Invalid bet ID');
    });

    it('should return 404 for non-existent bet', async () => {
      const response = await request(app)
        .get('/api/bets/99999/wagers')
        .expect(404);

      expect(response.body.error).toBe('Bet not found');
    });
  });

  describe('GET /api/users/:userName/wagers', () => {
    it('should get all wagers for a user in the active party', async () => {
      // Create wagers for different users
      await db.insert(wagers).values([
        {
          betId: testBet.id,
          optionId: option1.id,
          userName: 'Alice',
          amount: 50,
          createdAt: new Date().toISOString()
        },
        {
          betId: testBet.id,
          optionId: option2.id,
          userName: 'Alice',
          amount: 30,
          createdAt: new Date().toISOString()
        },
        {
          betId: testBet.id,
          optionId: option1.id,
          userName: 'Bob',
          amount: 40,
          createdAt: new Date().toISOString()
        }
      ]);

      const response = await request(app)
        .get('/api/users/Alice/wagers')
        .expect(200);

      expect(response.body.userName).toBe('Alice');
      expect(response.body.partyId).toBe(activeParty.id);
      expect(response.body.partyName).toBe('Super Bowl Party');
      expect(response.body.wagers).toHaveLength(2);

      // Verify wager details
      const wager1 = response.body.wagers.find((w: any) => w.optionId === option1.id);
      expect(wager1.betQuestion).toBe('Will there be overtime?');
      expect(wager1.betStatus).toBe('open');
      expect(wager1.optionLabel).toBe('Yes');
      expect(wager1.amount).toBe(50);
    });

    it('should return empty wagers when user has no wagers', async () => {
      const response = await request(app)
        .get('/api/users/NewUser/wagers')
        .expect(200);

      expect(response.body.userName).toBe('NewUser');
      expect(response.body.partyId).toBe(activeParty.id);
      expect(response.body.partyName).toBe('Super Bowl Party');
      expect(response.body.wagers).toHaveLength(0);
    });

    it('should return empty when no active party exists', async () => {
      // Archive the active party
      await db.update(parties)
        .set({ status: 'archived', updatedAt: new Date().toISOString() })
        .where(eq(parties.id, activeParty.id));

      const response = await request(app)
        .get('/api/users/Alice/wagers')
        .expect(200);

      expect(response.body.userName).toBe('Alice');
      expect(response.body.partyId).toBeNull();
      expect(response.body.partyName).toBeNull();
      expect(response.body.wagers).toHaveLength(0);
    });

    it('should only return wagers from active party, not archived parties', async () => {
      // Create an archived party with bets and wagers
      const [archivedParty] = await db.insert(parties).values({
        name: 'Old Party',
        date: '2025-01-01T00:00:00Z',
        status: 'archived',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const [archivedBet] = await db.insert(bets).values({
        partyId: archivedParty.id,
        type: 'yes_no',
        question: 'Old question?',
        createdBy: 'Alice',
        status: 'settled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const [archivedOption] = await db.insert(betOptions).values({
        betId: archivedBet.id,
        label: 'Yes',
        createdAt: new Date().toISOString()
      }).returning();

      // Add wager to archived party
      await db.insert(wagers).values({
        betId: archivedBet.id,
        optionId: archivedOption.id,
        userName: 'Alice',
        amount: 100,
        createdAt: new Date().toISOString()
      });

      // Add wager to active party
      await db.insert(wagers).values({
        betId: testBet.id,
        optionId: option1.id,
        userName: 'Alice',
        amount: 50,
        createdAt: new Date().toISOString()
      });

      const response = await request(app)
        .get('/api/users/Alice/wagers')
        .expect(200);

      expect(response.body.userName).toBe('Alice');
      expect(response.body.partyId).toBe(activeParty.id);
      expect(response.body.wagers).toHaveLength(1);
      expect(response.body.wagers[0].amount).toBe(50);
    });

    it('should handle multiple bets in active party', async () => {
      // Create second bet
      const [bet2] = await db.insert(bets).values({
        partyId: activeParty.id,
        type: 'multi_option',
        question: 'Who wins?',
        createdBy: 'Bob',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const [bet2Option] = await db.insert(betOptions).values({
        betId: bet2.id,
        label: 'Chiefs',
        createdAt: new Date().toISOString()
      }).returning();

      // Add wagers to both bets
      await db.insert(wagers).values([
        {
          betId: testBet.id,
          optionId: option1.id,
          userName: 'Alice',
          amount: 50,
          createdAt: new Date().toISOString()
        },
        {
          betId: bet2.id,
          optionId: bet2Option.id,
          userName: 'Alice',
          amount: 75,
          createdAt: new Date().toISOString()
        }
      ]);

      const response = await request(app)
        .get('/api/users/Alice/wagers')
        .expect(200);

      expect(response.body.wagers).toHaveLength(2);
      expect(response.body.wagers.map((w: any) => w.betQuestion)).toContain('Will there be overtime?');
      expect(response.body.wagers.map((w: any) => w.betQuestion)).toContain('Who wins?');
    });
  });
});
