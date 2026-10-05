import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  public constructor() {
    if (!process.env.API_KEY && process.env.NODE_ENV === 'production') {
      throw new Error('API_KEY is required when NODE_ENV=production');
    }
  }

  public canActivate(context: ExecutionContext): boolean {
    const expected = process.env.API_KEY;
    if (!expected) return true;

    const request = context.switchToHttp().getRequest<Request>();
    if (request.path === '/healthz' || request.path === '/readyz') return true;
    const provided = request.header('x-api-key');
    if (!provided || !this.matches(provided, expected)) throw new UnauthorizedException('INVALID_API_KEY');
    return true;
  }

  private matches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
