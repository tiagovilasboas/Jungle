export abstract class DomainError extends Error {
  public constructor(public readonly code: string, message: string = code) {
    super(message);
    this.name = new.target.name;
  }
}

export class InsufficientFundsError extends DomainError {
  public constructor() { super('INSUFFICIENT_FUNDS'); }
}

export class WalletNotFoundError extends DomainError {
  public constructor() { super('WALLET_NOT_FOUND'); }
}

export class IdempotencyPayloadMismatchError extends DomainError {
  public constructor() { super('IDEMPOTENCY_PAYLOAD_MISMATCH'); }
}

export class CurrencyMismatchError extends DomainError {
  public constructor(message: string) { super('CURRENCY_MISMATCH', message); }
}

export class InvalidMoneyError extends DomainError {
  public constructor(message: string) { super('INVALID_MONEY', message); }
}
