import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HealthController } from '../src/infrastructure/http/health.controller.js';

describe('GET /readyz', () => {
  let application: INestApplication;
  let databaseUp = true;

  beforeAll(async () => {
    const pool = { query: async () => { if (!databaseUp) throw new Error('db down'); return { rows: [] }; } };
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: Pool, useValue: pool }],
    }).compile();
    application = module.createNestApplication();
    await application.init();
  });

  afterAll(async () => { await application.close(); });

  it('returns 200 when the database answers', async () => {
    databaseUp = true;
    const response = await request(application.getHttpServer()).get('/readyz');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'ok' });
  });

  it('returns 503 when the database is down', async () => {
    databaseUp = false;
    const response = await request(application.getHttpServer()).get('/readyz');
    expect(response.status).toBe(503);
  });
});
