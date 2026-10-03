import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutboxWorker } from '../src/infrastructure/queue/outbox.worker.js';
import { SqsInboxConsumer } from '../src/infrastructure/queue/sqs-inbox.consumer.js';

describe('queue loops log failures instead of swallowing them', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('OutboxWorker logs when publishing fails', async () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const worker = new OutboxWorker({ execute: async () => { throw new Error('sqs down'); } } as never, 10);

    worker.start();
    await vi.advanceTimersByTimeAsync(10);
    worker.stop();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toBe('Falha ao publicar outbox');
  });

  it('SqsInboxConsumer logs when polling fails', async () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const client = { send: async () => { throw new Error('sqs down'); } };
    const consumer = new SqsInboxConsumer(client as never, 'queue-url', {} as never);

    consumer.start();
    await vi.advanceTimersByTimeAsync(0);
    consumer.stop();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toBe('Falha ao consumir inbox');
  });
});
