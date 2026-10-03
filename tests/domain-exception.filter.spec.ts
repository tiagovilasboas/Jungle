import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProcessWagerController } from '../src/infrastructure/http/process-wager.controller.js';
import { ProcessWagerUseCase } from '../src/application/use-cases/process-wager.use-case.js';
import {
  CurrencyMismatchError,
  IdempotencyPayloadMismatchError,
  InsufficientFundsError,
  InvalidMoneyError,
  WalletNotFoundError,
} from '../src/domain/errors.js';

const body = {
  externalTransactionId: 'external-1',
  idempotencyKey: 'idem-1',
  payloadHash: 'hash-1',
  walletId: '00000000-0000-0000-0000-000000000001',
  roundId: 'round-1',
  gameId: 'game-1',
  kind: 'BET',
  money: { amount: '10.00', currency: 'BRL' },
};

describe('domain errors become HTTP statuses', () => {
  let application: INestApplication;
  let nextError: Error = new Error('unset');

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProcessWagerController],
      providers: [
        { provide: ProcessWagerUseCase, useValue: { execute: async () => { throw nextError; } } },
        { provide: ProcessWagerController, inject: [ProcessWagerUseCase], useFactory: (useCase: ProcessWagerUseCase) => new ProcessWagerController(useCase) },
      ],
    }).compile();
    application = module.createNestApplication();
    application.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await application.init();
  });

  afterAll(async () => { await application.close(); });

  const cases: Array<[string, Error, number]> = [
    ['IDEMPOTENCY_PAYLOAD_MISMATCH', new IdempotencyPayloadMismatchError(), 409],
    ['WALLET_NOT_FOUND', new WalletNotFoundError(), 404],
    ['INSUFFICIENT_FUNDS', new InsufficientFundsError(), 422],
    ['CurrencyMismatchError', new CurrencyMismatchError('Currency mismatch: BRL vs USD'), 422],
    ['InvalidMoneyError', new InvalidMoneyError('Operation amount must be positive'), 422],
    ['unexpected error', new Error('boom'), 500],
  ];

  it.each(cases)('%s', async (_name, error, status) => {
    nextError = error;
    const response = await request(application.getHttpServer()).post('/wagers').send(body);
    expect(response.status).toBe(status);
  });
});
