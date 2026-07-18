import * as crypto from 'crypto';
import { JwksService } from './jwks.service';

describe('JwksService', () => {
  let service: JwksService;

  afterEach(() => {
    // Clean up interval if any
    (service as any).onModuleDestroy?.();
    jest.restoreAllMocks();
    delete process.env.IDENTITY_JWKS_URL;
  });

  // ─── no URL ─────────────────────────────────────────────────────────────
  describe('when IDENTITY_JWKS_URL is not set', () => {
    beforeEach(async () => {
      delete process.env.IDENTITY_JWKS_URL;
      service = new JwksService();
      await service.onModuleInit();
    });

    it('getKey should return undefined (no-op / fallback HS256)', () => {
      expect(service.getKey('any-kid')).toBeUndefined();
    });
  });

  // ─── fetch success ───────────────────────────────────────────────────────
  describe('when IDENTITY_JWKS_URL is set and fetch succeeds', () => {
    const kid = 'test-kid-1';
    let publicKeyPem: string;

    beforeEach(async () => {
      const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
      const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;

      process.env.IDENTITY_JWKS_URL = 'http://localhost:3020/api/.well-known/jwks.json';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] }),
      }) as any;

      service = new JwksService();
      await service.onModuleInit();
    });

    it('getKey(kid) should return a PEM string containing public key', () => {
      const pem = service.getKey(kid);
      expect(pem).toBeDefined();
      expect(typeof pem).toBe('string');
      expect(pem).toContain('BEGIN PUBLIC KEY');
    });

    it('getKey(unknown-kid) returns undefined', () => {
      expect(service.getKey('unknown-kid')).toBeUndefined();
    });

    it('returned PEM is a valid RSA public key', () => {
      const pem = service.getKey(kid)!;
      const imported = crypto.createPublicKey(pem);
      expect(imported.asymmetricKeyType).toBe('rsa');
    });
  });

  // ─── fetch fails ─────────────────────────────────────────────────────────
  describe('when fetch fails (network error)', () => {
    beforeEach(async () => {
      process.env.IDENTITY_JWKS_URL = 'http://localhost:3020/api/.well-known/jwks.json';
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any;

      service = new JwksService();
      await service.onModuleInit(); // must NOT throw
    });

    it('should not throw on init and getKey returns undefined (graceful fallback)', () => {
      expect(() => service.getKey('any-kid')).not.toThrow();
      expect(service.getKey('any-kid')).toBeUndefined();
    });
  });

  // ─── fetch non-ok ────────────────────────────────────────────────────────
  describe('when fetch returns non-ok response', () => {
    beforeEach(async () => {
      process.env.IDENTITY_JWKS_URL = 'http://localhost:3020/api/.well-known/jwks.json';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }) as any;

      service = new JwksService();
      await service.onModuleInit();
    });

    it('should not throw and getKey returns undefined', () => {
      expect(service.getKey('any-kid')).toBeUndefined();
    });
  });

  // ─── empty keys array ────────────────────────────────────────────────────
  describe('when JWKS returns empty keys array', () => {
    beforeEach(async () => {
      process.env.IDENTITY_JWKS_URL = 'http://localhost:3020/api/.well-known/jwks.json';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [] }),
      }) as any;

      service = new JwksService();
      await service.onModuleInit();
    });

    it('getKey returns undefined (fallback HS256)', () => {
      expect(service.getKey('any-kid')).toBeUndefined();
    });
  });
});
