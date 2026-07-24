import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as fc from 'fast-check';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let permissionGuard: PermissionGuard;
  let reflector: Reflector;

  // Current HRM permissions (no more accounting-specific phieu_thu/phieu_chi permissions).
  const ALL_PERMISSIONS = [
    'view_nhan_vien',
    'create_nhan_vien',
    'update_nhan_vien',
    'delete_nhan_vien',
    'approve_nhan_vien',
    'view_vai_tro',
    'create_vai_tro',
    'update_vai_tro',
    'delete_vai_tro',
    'approve_vai_tro',
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
      const context = createMockExecutionContext(undefined, ['view_nhan_vien']);

      expect(() => permissionGuard.canActivate(context)).toThrow(
        ForbiddenException,
      );
      expect(() => permissionGuard.canActivate(context)).toThrow(
        'Không tìm thấy thông tin người dùng',
      );
    });

    /**
     * `AuthzLoaderService.load()` trả thẳng `{ vaiTro: 'SUPER_ADMIN',
     * permissions: ['*'] }` cho tài khoản SUPER_ADMIN_EMAIL — `'*'` là KÝ HIỆU
     * "có tất cả", không phải tên một quyền. Nếu guard chỉ so khớp chuỗi thuần
     * thì `['*'].includes('/cham-cong/don-tu:them')` là false và super admin bị
     * chặn khỏi chính hệ thống mình quản trị. Đây là điều kiện BẮT BUỘC phải
     * đúng trước khi các controller đổi từ AdminGuard sang PermissionGuard,
     * nếu không ta chỉ đổi lỗi 403 này lấy một lỗi 403 khác.
     */
    it('user có permissions ["*"] (super admin) qua được route đòi quyền bất kỳ', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          (requiredPermissions) => {
            const user = {
              id: 'super-admin',
              email: 'admin@company.com',
              vaiTro: 'SUPER_ADMIN',
              permissions: ['*'],
            };

            const context = createMockExecutionContext(
              user,
              requiredPermissions,
            );

            expect(permissionGuard.canActivate(context)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('"*" là ký hiệu toàn quyền kể cả khi đứng lẫn với quyền khác', () => {
      const user = {
        id: 'super-admin',
        email: 'admin@company.com',
        vaiTro: 'SUPER_ADMIN',
        permissions: ['/cau-hinh/vai-tro:xem', '*'],
      };

      const context = createMockExecutionContext(user, [
        '/cham-cong/don-tu:them',
        '/cham-cong/don-tu:xoa',
      ]);

      expect(permissionGuard.canActivate(context)).toBe(true);
    });

    /**
     * Ranh giới của "*": chỉ chính chuỗi `'*'` mới là toàn quyền. Nếu ai đó
     * nới thành so khớp tiền tố/wildcard thì một quyền hợp lệ bất kỳ có ký tự
     * `*` sẽ mở toang hệ thống — test này khoá lại ranh giới đó.
     */
    it('quyền chứa "*" nhưng KHÔNG phải chuỗi "*" thì không phải toàn quyền', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        vaiTro: 'Quản lý',
        permissions: ['/cham-cong/don-tu:*', '**', ' *'],
      };

      const context = createMockExecutionContext(user, [
        '/cham-cong/don-tu:them',
      ]);

      expect(() => permissionGuard.canActivate(context)).toThrow(
        ForbiddenException,
      );
    });

    it('should include missing permissions in error message', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        vaiTro: 'ADMIN',
        permissions: ['view_nhan_vien'],
      };

      const context = createMockExecutionContext(user, [
        'view_nhan_vien',
        'create_nhan_vien',
        'delete_nhan_vien',
      ]);

      try {
        permissionGuard.canActivate(context);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toContain(
          'create_nhan_vien',
        );
        expect((error as ForbiddenException).message).toContain(
          'delete_nhan_vien',
        );
      }
    });
  });
});
