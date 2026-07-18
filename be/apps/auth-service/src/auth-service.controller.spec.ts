import * as fc from 'fast-check';
import { JwtService } from '@app/auth';
import { JwksService } from '@app/auth';

// Minimal JwksService mock — no RS256 keys, falling back to HS256
const mockJwks: Pick<JwksService, 'getKey'> = { getKey: () => undefined };

describe('AuthController - Token Properties', () => {
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService(mockJwks as JwksService);
  });

  /**
   * **Feature: backend-migration, Property 6: Login Token Content**
   * **Validates: Requirements 4.1**
   *
   * For any successful login with valid credentials, the returned JWT token
   * SHALL contain user id (sub), email, vaiTro (role), and permissions array.
   */
  describe('Property 6: Login Token Content', () => {
    it('should generate token containing all required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            tenantId: fc.uuid(),
            vaiTro: fc.constantFrom(
              'ADMIN',
              'KE_TOAN_QUY',
              'KE_TOAN_CONG_NO',
              'MANAGER',
              'KIEM_SOAT',
            ),
            permissions: fc.array(
              fc.constantFrom(
                'view_phieu_thu',
                'create_phieu_thu',
                'update_phieu_thu',
                'delete_phieu_thu',
                'approve_phieu_thu',
              ),
              { minLength: 0, maxLength: 5 },
            ),
          }),
          (userPayload) => {
            // Generate token
            const token = jwtService.sign(userPayload);

            // Decode token
            const decoded = jwtService.decode(token);

            // Verify all required fields are present
            expect(decoded).not.toBeNull();
            expect(decoded?.sub).toBe(userPayload.id);
            expect(decoded?.email).toBe(userPayload.email);
            expect(decoded?.tenantId).toBe(userPayload.tenantId);
            expect(decoded?.vaiTro).toBe(userPayload.vaiTro);
            expect(decoded?.permissions).toEqual(userPayload.permissions);

            // Verify token has expiration
            expect(decoded?.exp).toBeDefined();
            expect(decoded?.iat).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Feature: backend-migration, Property 7: Token Verify Round-Trip**
   * **Validates: Requirements 4.4**
   *
   * For any valid JWT token, calling POST /auth/verify SHALL return the decoded
   * payload that matches the original token content.
   */
  describe('Property 7: Token Verify Round-Trip', () => {
    it('should verify token and return matching payload', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            tenantId: fc.uuid(),
            vaiTro: fc.constantFrom(
              'ADMIN',
              'KE_TOAN_QUY',
              'KE_TOAN_CONG_NO',
              'MANAGER',
              'KIEM_SOAT',
            ),
            permissions: fc.array(
              fc.constantFrom(
                'view_phieu_thu',
                'create_phieu_thu',
                'update_phieu_thu',
              ),
              { minLength: 0, maxLength: 3 },
            ),
          }),
          (originalPayload) => {
            // Sign token
            const token = jwtService.sign(originalPayload);

            // Verify token (round-trip)
            const verified = jwtService.verify(token);

            // Verify round-trip preserves data
            expect(verified.sub).toBe(originalPayload.id);
            expect(verified.email).toBe(originalPayload.email);
            expect(verified.tenantId).toBe(originalPayload.tenantId);
            expect(verified.vaiTro).toBe(originalPayload.vaiTro);
            expect(verified.permissions).toEqual(originalPayload.permissions);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject tampered tokens', () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        vaiTro: 'ADMIN',
        permissions: ['view_phieu_thu'],
      };

      const token = jwtService.sign(payload);

      // Tamper with token (change a character in the signature)
      const parts = token.split('.');
      const tamperedSignature =
        parts[2].slice(0, -1) + (parts[2].slice(-1) === 'a' ? 'b' : 'a');
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

      expect(() => jwtService.verify(tamperedToken)).toThrow();
    });
  });
});
