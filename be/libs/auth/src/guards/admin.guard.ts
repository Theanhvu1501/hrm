import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Cho qua nếu user là admin tenant (`vaiTro === 'ADMIN'`) hoặc super admin
 * (`vaiTro === 'SUPER_ADMIN'`). Dùng cho các thao tác cấu hình hệ thống mà
 * chỉ quản trị được phép (vd: lưu/xoá mẫu in).
 *
 * Kiểm tra theo `vaiTro` (luôn có trong JWT) thay vì mảng `permissions` —
 * một số login path ký token với `permissions: []` nên mảng quyền không tin cậy.
 *
 * So sánh KHÔNG phân biệt hoa-thường: vai trò là chuỗi tự do (`vai_tro.ten`),
 * dữ liệu thực tế dùng tên `"Admin"`; super admin có `vaiTro = 'SUPER_ADMIN'`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private static readonly ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('Không tìm thấy thông tin người dùng');
    }

    const vaiTro = String(user.vaiTro ?? '').toUpperCase();
    if (!AdminGuard.ADMIN_ROLES.includes(vaiTro)) {
      throw new ForbiddenException('Chỉ quản trị viên mới có quyền thực hiện');
    }

    return true;
  }
}
