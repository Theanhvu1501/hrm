import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { JwtService } from './jwt.service';
import { JwksService } from './jwks.service';

// Minimal mock for JwksService
function makeMockJwks(
  keyMap: Record<string, string> = {},
): Pick<JwksService, 'getKey'> {
  return { getKey: jest.fn((kid: string) => keyMap[kid]) };
}

describe('JwtService', () => {
  const HS256_SECRET = 'test-hs256-secret-for-unit-tests';

  beforeEach(() => {
    process.env.JWT_SECRET = HS256_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    jest.restoreAllMocks();
  });

  // ─── RS256 branch ────────────────────────────────────────────────────────
  describe('verify() — RS256 branch', () => {
    let privateKeyPem: string;
    let publicKeyPem: string;
    const kid = 'rsa-key-1';

    beforeEach(() => {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
      publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    });

    it('verifies RS256 token and returns payload when key in cache', () => {
      const mockJwks = makeMockJwks({ [kid]: publicKeyPem });
      const service = new JwtService(mockJwks as any);

      const token = jwt.sign(
        { sub: 'u1', email: 'a@b.com', tenantId: 't1' },
        privateKeyPem,
        { algorithm: 'RS256', keyid: kid, expiresIn: '1h' },
      );

      const result = service.verify(token);
      expect(result.sub).toBe('u1');
      expect(result.email).toBe('a@b.com');
      expect((mockJwks.getKey as jest.Mock)).toHaveBeenCalledWith(kid);
    });

    it('throws "Token không hợp lệ" when RS256 kid not found in JWKS cache', () => {
      const mockJwks = makeMockJwks({}); // no keys
      const service = new JwtService(mockJwks as any);

      const token = jwt.sign({ sub: 'u1' }, privateKeyPem, {
        algorithm: 'RS256',
        keyid: kid,
        expiresIn: '1h',
      });

      expect(() => service.verify(token)).toThrow('Token không hợp lệ');
    });

    it('throws "Token đã hết hạn" for expired RS256 token', () => {
      const mockJwks = makeMockJwks({ [kid]: publicKeyPem });
      const service = new JwtService(mockJwks as any);

      const token = jwt.sign({ sub: 'u1' }, privateKeyPem, {
        algorithm: 'RS256',
        keyid: kid,
        expiresIn: -1, // already expired
      });

      expect(() => service.verify(token)).toThrow('Token đã hết hạn');
    });

    it('throws "Token không hợp lệ" for tampered RS256 token', () => {
      const mockJwks = makeMockJwks({ [kid]: publicKeyPem });
      const service = new JwtService(mockJwks as any);

      const token = jwt.sign({ sub: 'u1' }, privateKeyPem, {
        algorithm: 'RS256',
        keyid: kid,
        expiresIn: '1h',
      });
      const [h, p] = token.split('.');
      const tampered = `${h}.${p}.invalidsig`;

      expect(() => service.verify(tampered)).toThrow('Token không hợp lệ');
    });

    it('does NOT fall through to HS256 when RS256 kid not found (no alg-confusion)', () => {
      // Even if the token "accidentally" matches the HS256 secret, RS256 path must reject
      const mockJwks = makeMockJwks({});
      const service = new JwtService(mockJwks as any);
      const token = jwt.sign({ sub: 'u1' }, privateKeyPem, {
        algorithm: 'RS256',
        keyid: 'missing-kid',
        expiresIn: '1h',
      });
      expect(() => service.verify(token)).toThrow('Token không hợp lệ');
    });
  });

  // ─── HS256 branch ─────────────────────────────────────────────────────────
  describe('verify() — HS256 branch (fallback)', () => {
    it('verifies HS256 token using this.secret', () => {
      const mockJwks = makeMockJwks({});
      const service = new JwtService(mockJwks as any);

      const token = jwt.sign(
        { sub: 'u1', email: 'a@b.com', tenantId: 't1', vaiTro: 'ADMIN', permissions: [] },
        HS256_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' },
      );

      const result = service.verify(token);
      expect(result.sub).toBe('u1');
      expect((mockJwks.getKey as jest.Mock)).not.toHaveBeenCalled(); // JWKS not touched
    });

    it('throws "Token đã hết hạn" for expired HS256 token', () => {
      const mockJwks = makeMockJwks({});
      const service = new JwtService(mockJwks as any);

      const token = jwt.sign({ sub: 'u1' }, HS256_SECRET, {
        algorithm: 'HS256',
        expiresIn: -1,
      });

      expect(() => service.verify(token)).toThrow('Token đã hết hạn');
    });

    it('throws "Token không hợp lệ" for HS256 token with wrong secret', () => {
      const mockJwks = makeMockJwks({});
      const service = new JwtService(mockJwks as any);

      const token = jwt.sign({ sub: 'u1' }, 'wrong-secret', {
        algorithm: 'HS256',
        expiresIn: '1h',
      });

      expect(() => service.verify(token)).toThrow('Token không hợp lệ');
    });

    // Security: alg-confusion attack — attacker sends HS256 token signed with public key
    it('alg-confusion: HS256 token signed with RSA public key is rejected (uses this.secret)', () => {
      const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

      const mockJwks = makeMockJwks({});
      const service = new JwtService(mockJwks as any);

      // Attacker signs with RSA public key as HMAC secret
      const maliciousToken = jwt.sign({ sub: 'attacker' }, publicKeyPem, {
        algorithm: 'HS256',
        expiresIn: '1h',
      });

      // HS256 branch uses this.secret (HS256_SECRET), NOT publicKeyPem → FAIL
      expect(() => service.verify(maliciousToken)).toThrow();
    });
  });

  // ─── sign / signTempToken unchanged ──────────────────────────────────────
  describe('sign() and signTempToken()', () => {
    it('sign() returns an HS256 token verifiable with this.secret', () => {
      const mockJwks = makeMockJwks({});
      const service = new JwtService(mockJwks as any);

      const payload = {
        id: 'u1',
        email: 'a@b.com',
        tenantId: 't1',
        vaiTro: 'ADMIN',
        permissions: [],
      };
      const token = service.sign(payload);
      const decoded: any = jwt.verify(token, HS256_SECRET, {
        algorithms: ['HS256'],
      });
      expect(decoded.sub).toBe('u1');
    });

    it('sign → verify round-trip works for HS256', () => {
      const mockJwks = makeMockJwks({});
      const service = new JwtService(mockJwks as any);

      const payload = {
        id: 'u1',
        email: 'a@b.com',
        tenantId: 't1',
        vaiTro: 'ADMIN',
        permissions: [],
      };
      const token = service.sign(payload);
      const verified = service.verify(token);
      expect(verified.sub).toBe('u1');
      expect(verified.email).toBe('a@b.com');
    });

    it('verifyTempToken() still works for temp tokens', () => {
      const mockJwks = makeMockJwks({});
      const service = new JwtService(mockJwks as any);

      const token = service.signTempToken({ id: 'u1', email: 'a@b.com' });
      const decoded = service.verifyTempToken(token);
      expect(decoded.sub).toBe('u1');
      expect(decoded.type).toBe('temp');
    });
  });
});
