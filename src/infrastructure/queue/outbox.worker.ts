import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PublishOutboxUseCase } from '../../application/use-cases/publish-outbox.use-case.js';

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer: NodeJS.Timeout | undefined;

  public constructor(
    private readonly publishOutbox: PublishOutboxUseCase,
    private readonly pollIntervalMs = 1000,
  ) {}

  public async runOnce(): Promise<number> {
    return this.publishOutbox.execute();
  }

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.runOnce().catch((error: unknown) => this.logger.error('Falha ao publicar outbox', error instanceof Error ? error.stack : String(error)));
    }, this.pollIntervalMs);
  }

  public onModuleInit(): void { this.start(); }

  public onModuleDestroy(): void { this.stop(); }

  public stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
