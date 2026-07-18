import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SUPER_ADMIN_EMAIL } from '@app/entities';

/**
 * Guard cho phép Super Admin hoặc user có membershipRole 'admin' trong ĐÚNG tenant của mình.
 * Yêu cầu route có param :id (tenantId).
 * Phải đặt sau JwtGuard.
 *
 * Ghi chú bảo mật: ràng buộc user.tenantId === params.id được GIỮ nguyên để
 * chống leo quyền chéo tenant (IDOR). Admin của tenant-A không được quản trị tenant-B.
 * Claim membershipRole được đọc từ token (identity-service phase 3+).
 */
@Injectable()
export class TenantAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = (req as any).user;

    if (!user) throw new ForbiddenException('Không tìm thấy thông tin người dùng');

    // Super admin: mọi tenant
    if (user.email === SUPER_ADMIN_EMAIL) return true;

    const tenantId = req.params?.id;
    if (!tenantId) throw new ForbiddenException('Không tìm thấy mã công ty');

    // Company admin chỉ quản trị tenant của chính mình (tenant trong token)
    if (user.membershipRole === 'admin' && user.tenantId === tenantId) return true;

    throw new ForbiddenException('Bạn không có quyền quản lý công ty này. Yêu cầu quyền Admin.');
  }
}
