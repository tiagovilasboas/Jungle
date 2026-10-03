import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ConsumeInboxUseCase } from '../../application/use-cases/consume-inbox.use-case.js';
import type { InboxEvent } from '../../application/ports/inbox.port.js';

interface SqsMessage {
  MessageId?: string;
  ReceiptHandle?: string;
  Body?: string;
}

export class SqsInboxConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsInboxConsumer.name);
  private running = false;

  public constructor(
    private readonly client: SQSClient,
    private readonly queueUrl: string,
    private readonly consumeInbox: ConsumeInboxUseCase,
    private readonly waitTimeSeconds = 10,
    private readonly retryDelayMs = 1000,
  ) {}

  public async pollOnce(): Promise<number> {
    const result = await this.client.send(new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: this.waitTimeSeconds,
      VisibilityTimeout: 30,
      MessageAttributeNames: ['All'],
    }));

    let processed = 0;
    for (const message of (result.Messages ?? []) as SqsMessage[]) {
      if (!message.Body || !message.ReceiptHandle) continue;
      try {
        const event = JSON.parse(message.Body) as InboxEvent;
        await this.consumeInbox.execute({
          eventId: event.eventId ?? message.MessageId ?? message.ReceiptHandle,
          eventType: event.eventType,
          payload: event.payload,
        });
        await this.client.send(new DeleteMessageCommand({ QueueUrl: this.queueUrl, ReceiptHandle: message.ReceiptHandle }));
        processed += 1;
      } catch (error) {
        // Sem DeleteMessage: o SQS reentrega apos o VisibilityTimeout (e, com DLQ configurada, descarta apos N tentativas).
        this.logger.error(`Falha ao processar mensagem ${message.MessageId ?? ''}`, error instanceof Error ? error.stack : String(error));
      }
    }
    return processed;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    void this.loop();
  }

  public onModuleInit(): void { this.start(); }

  public onModuleDestroy(): void { this.stop(); }

  public stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        await this.pollOnce();
      } catch (error) {
        this.logger.error('Falha ao consumir inbox', error instanceof Error ? error.stack : String(error));
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      }
    }
  }
}
