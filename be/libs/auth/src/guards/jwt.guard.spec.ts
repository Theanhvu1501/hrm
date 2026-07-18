import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as fc from 'fast-check';
import { JwtGuard } from './jwt.guard';
import { JwtService } from '../services/jwt.service';
import { JwksService } from '../services/jwks.service';

const mockAuthzLoader: any = {
  load: jest.fn(async () => ({ vaiTro: 'KIEM_SOAT', permissions: [] })),
};

// Minimal JwksService mock — no RS256 keys, so verify() falls back to HS256
const mockJwks: Pick<JwksService, 'getKey'> = { getKey: () => undefined };

describe('JwtGuard', () => {
  let jwtGuard: JwtGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService(mockJwks as JwksService);
    jwtGuard = new JwtGuard(jwtService, mockAuthzLoader);
    mockAuthzLoader.load.mockClear();
  });

  const createMockExecutionContext = (
    authHeader?: string,
  ): ExecutionContext => {
    const request = {
      headers: {
        authorization: authHeader,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  /**
   * **Feature: backend-migration, Property 1: JWT Guard Token Verification**
   * **Validates: Requirements 2.2, 2.6**
   *
   * For any request with Authorization header containing a Bearer token,
   * the JwtGuard SHALL extract the token and verify it using JwtService.
   * If valid, the decoded payload SHALL be attached to request.user.
   * If invalid, 401 Unauthorized SHALL be returned.
   */
  describe('Property 1: JWT Guard Token Verification', () => {
    it('should attach decoded payload to request.user for valid tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            tenantId: fc.uuid(),
            vaiTro: fc.constantFrom(
              'ADMIN',
              'KE_TOAN_QUY',
              'KE_TOAN_CONG_NO',
              'MANAGER',
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
          async (userPayload) => {
            // Generate a valid token
            const token = jwtService.sign(userPayload);
            const context = createMockExecutionContext(`Bearer ${token}`);

            // Execute guard
            const result = await jwtGuard.canActivate(context);

            // Verify result
            expect(result).toBe(true);

            // Verify user is attached to request
            const request = context.switchToHttp().getRequest();
            expect(request.user).toBeDefined();
            expect(request.user.id).toBe(userPayload.id);
            expect(request.user.email).toBe(userPayload.email);
            expect(request.user.tenantId).toBe(userPayload.tenantId);
            expect(request.user.vaiTro).toBe(userPayload.vaiTro);
            expect(request.user.permissions).toEqual(userPayload.permissions);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should throw UnauthorizedException for invalid tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 10, maxLength: 100 })
            .filter((s) => !s.includes('.')),
          async (invalidToken) => {
            const context = createMockExecutionContext(
              `Bearer ${invalidToken}`,
            );

            await expect(jwtGuard.canActivate(context)).rejects.toBeInstanceOf(
              UnauthorizedException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should throw UnauthorizedException when no Authorization header', async () => {
      const context = createMockExecutionContext(undefined);

      await expect(jwtGuard.canActivate(context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for malformed Authorization header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('Basic token123'),
            fc.constant('token123'),
            fc.constant('Bearer'),
            fc.constant('Bearer token1 token2'),
          ),
          async (malformedHeader) => {
            const context = createMockExecutionContext(malformedHeader);

            await expect(jwtGuard.canActivate(context)).rejects.toBeInstanceOf(
              UnauthorizedException,
            );
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});

// ---------- Enrich cases (Identity token / old token) ----------

function ctx(authHeader?: string) {
  const req: any = { headers: authHeader ? { authorization: authHeader } : {} };
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('JwtGuard (enrich)', () => {
  const jwtService: any = {
    verifyToken: (t: string) => JSON.parse(Buffer.from(t, 'base64').toString()),
    isTempToken: (d: any) => d?.type === 'temp',
  };

  it('token Identity (thiếu vaiTro/permissions) → enrich từ DB', async () => {
    const authz: any = { load: jest.fn(async () => ({ vaiTro: 'Admin', permissions: ['/x:xem'] })) };
    const guard = new JwtGuard(jwtService, authz);
    const token = Buffer.from(JSON.stringify({ sub: 'u1', email: 'a@b.com', tenantId: 't1' })).toString('base64');
    const c = ctx(`Bearer ${token}`);
    expect(await guard.canActivate(c)).toBe(true);
    const user = c.switchToHttp().getRequest().user;
    expect(authz.load).toHaveBeenCalledWith('u1', 't1', 'a@b.com');
    // apps và membershipRole thiếu trong token → apps=[], membershipRole=undefined
    expect(user).toEqual({ id: 'u1', email: 'a@b.com', tenantId: 't1', vaiTro: 'Admin', permissions: ['/x:xem'], apps: [] });
  });

  it('token cũ (có vaiTro) → KHÔNG enrich, giữ giá trị token', async () => {
    const authz: any = { load: jest.fn() };
    const guard = new JwtGuard(jwtService, authz);
    const token = Buffer.from(JSON.stringify({ sub: 'u1', email: 'a@b.com', tenantId: 't1', vaiTro: 'KIEM_SOAT', permissions: ['/y:xem'] })).toString('base64');
    const c = ctx(`Bearer ${token}`);
    expect(await guard.canActivate(c)).toBe(true);
    expect(authz.load).not.toHaveBeenCalled();
    expect(c.switchToHttp().getRequest().user.vaiTro).toBe('KIEM_SOAT');
  });

  it('không token → 401', async () => {
    const guard = new JwtGuard(jwtService, { load: jest.fn() } as any);
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('token Identity có apps + membershipRole → expose đúng trên request.user', async () => {
    const authz: any = { load: jest.fn(async () => ({ vaiTro: 'Admin', permissions: [] })) };
    const guard = new JwtGuard(jwtService, authz);
    const payload = { sub: 'u1', email: 'a@b.com', tenantId: 't1', apps: ['app-abc', 'app-xyz'], membershipRole: 'admin' };
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const c = ctx(`Bearer ${token}`);
    await guard.canActivate(c);
    const user = c.switchToHttp().getRequest().user;
    expect(user.apps).toEqual(['app-abc', 'app-xyz']);
    expect(user.membershipRole).toBe('admin');
  });

  it('token không có apps → request.user.apps mặc định là []', async () => {
    const authz: any = { load: jest.fn(async () => ({ vaiTro: 'KIEM_SOAT', permissions: [] })) };
    const guard = new JwtGuard(jwtService, authz);
    const token = Buffer.from(JSON.stringify({ sub: 'u1', email: 'a@b.com', tenantId: 't1' })).toString('base64');
    const c = ctx(`Bearer ${token}`);
    await guard.canActivate(c);
    expect(c.switchToHttp().getRequest().user.apps).toEqual([]);
  });
});
