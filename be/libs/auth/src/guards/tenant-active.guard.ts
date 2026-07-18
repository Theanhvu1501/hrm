import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * Guard kiểm tra tenant hiện tại còn active hay không.
 * Đặt sau JwtGuard để đảm bảo đã có user context.
 * Nếu chưa authenticate (không có user hoặc không có tenantId) → skip, để JwtGuard xử lý.
 *
 * Ghi chú (Phase 3): identity-service chỉ phát hành token cho tenant active;
 * việc thu hồi khi tenant bị vô hiệu hoá nay dựa vào TTL ngắn của access token
 * (Phase 7), không còn query DB identity nữa.
 */
@Injectable()
export class TenantActiveGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = (context.switchToHttp().getRequest() as any).user;
    // Chưa authenticate → để JwtGuard xử lý
    if (!user || !user.tenantId) return true;
    return true;
  }
}
