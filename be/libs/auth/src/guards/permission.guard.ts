import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('Không tìm thấy thông tin người dùng');
    }

    const userPermissions = user.permissions || [];

    // `'*'` là KÝ HIỆU "có tất cả", không phải tên một quyền:
    // `AuthzLoaderService.load()` trả thẳng `{ vaiTro: 'SUPER_ADMIN',
    // permissions: ['*'] }` cho tài khoản SUPER_ADMIN_EMAIL thay vì liệt kê
    // 70 quyền của catalog. So khớp chuỗi thuần bên dưới sẽ cho
    // `['*'].includes('/cham-cong/don-tu:them') === false` → super admin bị
    // chặn khỏi chính hệ thống mình quản trị. Phải chặn trước vòng so khớp.
    //
    // Chỉ ĐÚNG chuỗi `'*'` mới là toàn quyền — cố tình KHÔNG làm so khớp
    // tiền tố/wildcard, vì khi đó một quyền hợp lệ bất kỳ có ký tự `*` sẽ
    // vô tình mở toang mọi route.
    if (userPermissions.includes('*')) {
      return true;
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );
      throw new ForbiddenException(
        `Bạn không có quyền cần thiết: ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
