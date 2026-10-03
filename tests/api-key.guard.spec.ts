import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiKeyGuard } from '../src/infrastructure/http/api-key.guard.js';

const original = { apiKey: process.env.API_KEY, nodeEnv: process.env.NODE_ENV };
afterEach(() => {
  if (original.apiKey === undefined) delete process.env.API_KEY; else process.env.API_KEY = original.apiKey;
  if (original.nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original.nodeEnv;
});

function contextFor(path: string, apiKey?: string): ExecutionContext {
  const request = { path, header: (name: string) => (name === 'x-api-key' ? apiKey : undefined) };
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  it('refuses to start in production without API_KEY', () => {
    delete process.env.API_KEY;
    process.env.NODE_ENV = 'production';
    expect(() => new ApiKeyGuard()).toThrow('API_KEY is required');
  });

  it('stays open in development when API_KEY is not set', () => {
    delete process.env.API_KEY;
    process.env.NODE_ENV = 'development';
    expect(new ApiKeyGuard().canActivate(contextFor('/wagers'))).toBe(true);
  });

  it('accepts the right key and rejects wrong, missing or different-length keys', () => {
    process.env.API_KEY = 'secret';
    const guard = new ApiKeyGuard();
    expect(guard.canActivate(contextFor('/wagers', 'secret'))).toBe(true);
    for (const key of ['wrong!', undefined, 'secret-longer']) {
      expect(() => guard.canActivate(contextFor('/wagers', key))).toThrow(UnauthorizedException);
    }
  });

  it('keeps health checks open', () => {
    process.env.API_KEY = 'secret';
    expect(new ApiKeyGuard().canActivate(contextFor('/healthz'))).toBe(true);
  });
});
