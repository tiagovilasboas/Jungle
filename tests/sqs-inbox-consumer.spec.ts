import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SqsInboxConsumer } from '../src/infrastructure/queue/sqs-inbox.consumer.js';

afterEach(() => vi.restoreAllMocks());

function createClient(messages: Array<{ MessageId: string; ReceiptHandle: string; Body: string }>) {
  const deleted: string[] = [];
  const client = {
    send: async (command: { constructor: { name: string }; input: { ReceiptHandle?: string } }) => {
      if (command.constructor.name === 'ReceiveMessageCommand') return { Messages: messages };
      deleted.push(command.input.ReceiptHandle ?? '');
      return {};
    },
  };
  return { client, deleted };
}

const valid = (id: string) => ({ MessageId: id, ReceiptHandle: `rh-${id}`, Body: JSON.stringify({ eventId: id, eventType: 'WAGER_BET', payload: {} }) });

describe('SqsInboxConsumer.pollOnce', () => {
  it('keeps going after a poison message and does not delete it', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const handled: string[] = [];
    const consumeInbox = { execute: async (event: { eventId: string }) => { handled.push(event.eventId); return true; } };
    const { client, deleted } = createClient([
      { MessageId: 'bad', ReceiptHandle: 'rh-bad', Body: '{not json' },
      valid('ok'),
    ]);

    const processed = await new SqsInboxConsumer(client as never, 'q', consumeInbox as never, 0).pollOnce();

    expect(processed).toBe(1);
    expect(handled).toEqual(['ok']);
    expect(deleted).toEqual(['rh-ok']);
  });

  it('does not delete a message when the handler fails (SQS redelivers it)', async () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const consumeInbox = { execute: async () => { throw new Error('handler down'); } };
    const { client, deleted } = createClient([valid('a')]);

    const processed = await new SqsInboxConsumer(client as never, 'q', consumeInbox as never, 0).pollOnce();

    expect(processed).toBe(0);
    expect(deleted).toEqual([]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('SqsInboxConsumer loop', () => {
  it('never runs two polls at the same time', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const client = {
      send: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 20));
        inFlight -= 1;
        return { Messages: [] };
      },
    };
    const consumer = new SqsInboxConsumer(client as never, 'q', {} as never, 0);

    consumer.start();
    await new Promise((resolve) => setTimeout(resolve, 120));
    consumer.stop();

    expect(maxInFlight).toBe(1);
  });
});
