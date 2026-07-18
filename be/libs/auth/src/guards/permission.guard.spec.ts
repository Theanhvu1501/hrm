import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as fc from 'fast-check';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let permissionGuard: PermissionGuard;
  let reflector: Reflector;

  const ALL_PERMISSIONS = [
    'view_phieu_thu',
    'create_phieu_thu',
    'update_phieu_thu',
    'delete_phieu_thu',
    'approve_phieu_thu',
    'view_phieu_chi',
    'create_phieu_chi',
    'update_phieu_chi',
    'delete_phieu_chi',
    'approve_phieu_chi',
    'view_reports',
    'manage_permissions',
  ];

  beforeEach(() => {
    reflector = new Reflector();
    permissionGuard = new PermissionGuard(reflector);
  });

  const createMockExecutionContext = (
    user: any,
    requiredPermissions: string[],
  ): ExecutionContext => {
    const request = { user };
    const handler = jest.fn();
    const classRef = jest.fn();

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(requiredPermissions);

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => handler,
      getClass: () => classRef,
    } as unknown as ExecutionContext;
  };

  /**
   * **Feature: backend-migration, Property 3: Permission Guard Access Control**
   * **Validates: Requirements 2.4, 2.8**
   *
   * For any user with a set of permissions and any route with @Permissions decorator
   * specifying required permissions, the PermissionGuard SHALL allow access if and only if
   * the user has ALL required permissions.
   */
  describe('Property 3: Permission Guard Access Control', () => {
    it('should allow access when user has ALL required permissions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...ALL_PERMISSIONS), {
            minLength: 1,
            maxLength: 5,
          }),
          fc.array(fc.constantFrom(...ALL_PERMISSIONS), {
            minLength: 0,
            maxLength: 3,
          }),
          (userPermissions, additionalPermissions) => {
            // User has userPermissions, required is a subset
            const requiredPermissions = userPermissions.slice(
              0,
              Math.max(1, Math.floor(userPermissions.length / 2)),
            );

            // Ensure user has all required permissions
            fc.pre(
              requiredPermissions.every((p) => userPermissions.includes(p)),
            );

            const user = {
              id: 'user-123',
              email: 'test@example.com',
              vaiTro: 'ADMIN',
              permissions: [
                ...new Set([...userPermissions, ...additionalPermissions]),
              ],
            };

            const context = createMockExecutionContext(
              user,
              requiredPermissions,
            );
            const result = permissionGuard.canActivate(context);

            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should deny access when user is missing ANY required permission', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...ALL_PERMISSIONS), {
            minLength: 1,
            maxLength: 4,
          }),
          fc.array(fc.constantFrom(...ALL_PERMISSIONS), {
            minLength: 1,
            maxLength: 4,
          }),
          (userPermissions, requiredPermissions) => {
            // Ensure at least one required permission is NOT in user permissions
            fc.pre(
              !requiredPermissions.every((p) => userPermissions.includes(p)),
            );

            const user = {
              id: 'user-123',
              email: 'test@example.com',
              vaiTro: 'ADMIN',
              permissions: userPermissions,
            };

            const context = createMockExecutionContext(
              user,
              requiredPermissions,
            );

            expect(() => permissionGuard.canActivate(context)).toThrow(
              ForbiddenException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should allow access when no permissions are required', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...ALL_PERMISSIONS), {
            minLength: 0,
            maxLength: 5,
          }),
          (userPermissions) => {
            const user = {
              id: 'user-123',
              email: 'test@example.com',
              vaiTro: 'ADMIN',
              permissions: userPermissions,
            };

            const context = createMockExecutionContext(user, []);
            const result = permissionGuard.canActivate(context);

            expect(result).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should throw ForbiddenException when user is not in request', () => {
      const context = createMockExecutionContext(undefined, ['view_phieu_thu']);

      expect(() => permissionGuard.canActivate(context)).toThrow(
        ForbiddenException,
      );
      expect(() => permissionGuard.canActivate(context)).toThrow(
        'User not found in request',
      );
    });

    it('should include missing permissions in error message', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        vaiTro: 'ADMIN',
        permissions: ['view_phieu_thu'],
      };

      const context = createMockExecutionContext(user, [
        'view_phieu_thu',
        'create_phieu_thu',
        'delete_phieu_thu',
      ]);

      try {
        permissionGuard.canActivate(context);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toContain(
          'create_phieu_thu',
        );
        expect((error as ForbiddenException).message).toContain(
          'delete_phieu_thu',
        );
      }
    });
  });
});
