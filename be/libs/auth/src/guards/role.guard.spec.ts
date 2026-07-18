import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as fc from 'fast-check';
import { RoleGuard } from './role.guard';

describe('RoleGuard', () => {
  let roleGuard: RoleGuard;
  let reflector: Reflector;

  const ALL_ROLES = [
    'ADMIN',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'KE_TOAN_TONG_HOP',
    'MANAGER',
    'KIEM_SOAT',
  ];

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
   * **Feature: backend-migration, Property 2: Role Guard Access Control**
   * **Validates: Requirements 2.3, 2.7**
   *
   * For any user with a role and any route with @Roles decorator specifying required roles,
   * the RoleGuard SHALL allow access if and only if the user's role is included in the required roles list.
   */
  describe('Property 2: Role Guard Access Control', () => {
    it('should allow access when user role is in required roles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_ROLES),
          fc.array(fc.constantFrom(...ALL_ROLES), {
            minLength: 1,
            maxLength: 6,
          }),
          (userRole, requiredRoles) => {
            // Only test when user role IS in required roles
            fc.pre(requiredRoles.includes(userRole));

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

    it('should deny access when user role is NOT in required roles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_ROLES),
          fc.array(fc.constantFrom(...ALL_ROLES), {
            minLength: 1,
            maxLength: 5,
          }),
          (userRole, requiredRoles) => {
            // Only test when user role is NOT in required roles
            fc.pre(!requiredRoles.includes(userRole));

            const user = {
              id: 'user-123',
              email: 'test@example.com',
              vaiTro: userRole,
              permissions: [],
            };

            const context = createMockExecutionContext(user, requiredRoles);

            expect(() => roleGuard.canActivate(context)).toThrow(
              ForbiddenException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should allow access when no roles are required', () => {
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

    it('should throw ForbiddenException when user is not in request', () => {
      const context = createMockExecutionContext(undefined, ['ADMIN']);

      expect(() => roleGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => roleGuard.canActivate(context)).toThrow(
        'User not found in request',
      );
    });
  });
});
