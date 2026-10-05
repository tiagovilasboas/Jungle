import { describe, expect, it } from 'vitest';
import { CurrencyMismatchError, InsufficientFundsError, InvalidMoneyError } from '../src/domain/errors.js';
import { Money } from '../src/domain/value-objects/money.vo.js';
import { Wallet } from '../src/domain/entities/wallet.entity.js';

const brl = (amount: string) => Money.from({ amount, currency: 'BRL' });
const wallet = () => Wallet.open({ id: 'w', playerId: 'p', initialBalance: brl('10.00') });

describe('typed domain errors', () => {
  it('debit above balance throws InsufficientFundsError', () => {
    expect(() => wallet().debit(brl('10.01'))).toThrow(InsufficientFundsError);
  });

  it('operation in another currency throws CurrencyMismatchError', () => {
    expect(() => wallet().debit(Money.from({ amount: '1.00', currency: 'USD' }))).toThrow(CurrencyMismatchError);
  });

  it('non-positive operation throws InvalidMoneyError', () => {
    expect(() => wallet().credit(brl('-1.00'))).toThrow(InvalidMoneyError);
  });

  it('malformed amount throws InvalidMoneyError', () => {
    expect(() => Money.from({ amount: '1.001', currency: 'BRL' })).toThrow(InvalidMoneyError);
  });
});
