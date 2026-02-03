import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('API Health Check', () => {
  it('should return ok status from health endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return test message from API test endpoint', async () => {
    const response = await request(app)
      .get('/api/test')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'API is working!');
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Not found');
  });
});
