import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as fc from 'fast-check';
import { RoleGuard } from './role.guard';

describe('RoleGuard', () => {
  let roleGuard: RoleGuard;
  let reflector: Reflector;

  // Current HRM roles (no more accounting-specific KE_TOAN_* roles).
  const ALL_ROLES = ['ADMIN', 'MANAGER', 'NHAN_VIEN', 'KIEM_SOAT'];

  beforeEach(() => {
    reflector = new Reflector();
    roleGuard = new RoleGuard(reflector);
  });

  const createMockExecutionContext = (
    user: any,
    requiredRoles: string[],
  ): ExecutionContext => {
    const request = { user };
    const handler = jest.fn();
    const classRef = jest.fn();

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => handler,
      getClass: () => classRef,
    } as unknown as ExecutionContext;
  };

  /**
   * **Property: RoleGuard is currently a permissive no-op**
   *
   * `RoleGuard.canActivate` has been an unconditional `return true` since the
   * project's initial fork snapshot (pre-dates the accounting strip in Tasks
   * 2/3 — confirmed via `git log`). Role-based access is NOT enforced by this
   * guard for any role/route combination, including when the required roles
   * list excludes the user's role, or when there is no user on the request at
   * all. `@Roles(...)` decorators are wired up on config-service controllers,
   * but with this guard they are currently inert. These tests assert the
   * real, current behavior — not the deny-on-mismatch behavior a `RoleGuard`
   * name might suggest. (Flagged separately as a likely gap, out of scope for
   * this rebrand task to fix.)
   */
  describe('RoleGuard current (no-op) behavior', () => {
    it('allows access regardless of whether the user role is in the required roles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_ROLES),
          fc.array(fc.constantFrom(...ALL_ROLES), {
            minLength: 0,
            maxLength: 4,
          }),
          (userRole, requiredRoles) => {
            const user = {
              id: 'user-123',
              email: 'test@example.com',
              vaiTro: userRole,
              permissions: [],
            };

            const context = createMockExecutionContext(user, requiredRoles);
            const result = roleGuard.canActivate(context);

            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('allows access when no roles are required', () => {
      fc.assert(
        fc.property(fc.constantFrom(...ALL_ROLES), (userRole) => {
          const user = {
            id: 'user-123',
            email: 'test@example.com',
            vaiTro: userRole,
            permissions: [],
          };

          const context = createMockExecutionContext(user, []);
          const result = roleGuard.canActivate(context);

          expect(result).toBe(true);
        }),
        { numRuns: 50 },
      );
    });

    it('allows access even when user is not present on the request', () => {
      const context = createMockExecutionContext(undefined, ['ADMIN']);

      expect(roleGuard.canActivate(context)).toBe(true);
    });
  });
});
