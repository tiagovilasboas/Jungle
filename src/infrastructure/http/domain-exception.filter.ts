import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, HttpException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Response } from 'express';
import {
  CurrencyMismatchError,
  DomainError,
  DuplicateExternalTransactionError,
  IdempotencyPayloadMismatchError,
  InsufficientFundsError,
  InvalidMoneyError,
  WalletNotFoundError,
} from '../../domain/errors.js';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  public catch(error: DomainError, host: ArgumentsHost): void {
    const http = this.toHttpException(error);
    host.switchToHttp().getResponse<Response>().status(http.getStatus()).json(http.getResponse());
  }

  private toHttpException(error: DomainError): HttpException {
    if (error instanceof IdempotencyPayloadMismatchError || error instanceof DuplicateExternalTransactionError) return new ConflictException(error.code);
    if (error instanceof WalletNotFoundError) return new NotFoundException(error.code);
    if (error instanceof InsufficientFundsError) return new UnprocessableEntityException(error.code);
    if (error instanceof CurrencyMismatchError || error instanceof InvalidMoneyError) return new UnprocessableEntityException(error.message);
    return new HttpException(error.code, 500);
  }
}
