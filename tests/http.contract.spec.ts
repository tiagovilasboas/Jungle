import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProcessWagerController } from '../src/infrastructure/http/process-wager.controller.js';
import { ProcessWagerUseCase } from '../src/application/use-cases/process-wager.use-case.js';

const validBody = {
  externalTransactionId: 'external-1',
  idempotencyKey: 'idem-1',
  payloadHash: 'hash-1',
  walletId: '00000000-0000-0000-0000-000000000001',
  roundId: 'round-1',
  gameId: 'game-1',
  kind: 'BET',
  money: { amount: '10.00', currency: 'BRL' },
};

describe('wager HTTP contract', () => {
  let application: INestApplication;
  const execute = async () => ({
    transactionId: 'transaction-1',
    status: 'PROCESSED' as const,
    balance: { amount: '90.00', currency: 'BRL' },
    idempotentReplay: false,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProcessWagerController],
      providers: [
        { provide: ProcessWagerUseCase, useValue: { execute } },
        { provide: ProcessWagerController, inject: [ProcessWagerUseCase], useFactory: (useCase: ProcessWagerUseCase) => new ProcessWagerController(useCase) },
      ],
    }).compile();
    application = module.createNestApplication();
    application.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await application.init();
  });

  afterAll(async () => { await application.close(); });

  it('accepts a valid wager', async () => {
    const response = await request(application.getHttpServer()).post('/wagers').send(validBody);
    expect(response.status).toBe(201);
    expect(response.body.transactionId).toBe('transaction-1');
  });

  it('rejects walletId that is not a UUID', async () => {
    const response = await request(application.getHttpServer()).post('/wagers').send({ ...validBody, walletId: 'wallet-1' });
    expect(response.status).toBe(400);
  });

  it('rejects malformed money', async () => {
    const response = await request(application.getHttpServer()).post('/wagers').send({
      ...validBody,
      money: { amount: '10.001', currency: 'BRL' },
    });
    expect(response.status).toBe(400);
  });
});
