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
});
