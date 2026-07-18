import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../services/jwt.service';
import { EntitlementService } from '../services/entitlement.service';
import { DecodedToken } from '../interfaces';
import { SUPER_ADMIN_EMAIL } from '@app/entities';

/**
 * Chặn truy cập API theo lĩnh vực (entitlement) công ty được cấp.
 * Đặt làm APP_GUARD tại gateway. Guard MỀM: chỉ enforce khi có token hợp lệ
 * + có tenantId + path thuộc một menu có gán lĩnh vực. Mọi trường hợp khác ALLOW
 * (để guard auth của downstream xử lý).
 */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly entitlement: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const token = this.extractToken(req);
    if (!token) return true;

    let decoded: DecodedToken;
    try {
      decoded = this.jwtService.verify(token);
    } catch {
      return true; // token lỗi/hết hạn → downstream JwtGuard sẽ trả 401
    }
    if (decoded.email === SUPER_ADMIN_EMAIL) return true; // SuperAdmin bypass hoàn toàn
    if (!decoded?.tenantId) return true; // temp token không có tenantId

    const fullPath = this.normalizePath(req);
    const owningCodes = await this.entitlement.resolveOwningCodes(fullPath);
    if (owningCodes === null) return true; // path dùng chung

    const modules = await this.entitlement.getTenantModules(decoded.tenantId);
    if (modules.some((m) => owningCodes.includes(m))) return true;

    throw new ForbiddenException('Lĩnh vực chưa được kích hoạt cho công ty');
  }

  private extractToken(req: Request): string | null {
    const h = req.headers['authorization'];
    if (!h || Array.isArray(h)) return Array.isArray(h) ? h[0] ?? null : null;
    return h.startsWith('Bearer ') ? h.slice(7) : h;
  }

  private normalizePath(req: Request): string {
    let path = (req.originalUrl || req.url || '').split('?')[0];
    try { path = decodeURIComponent(path); } catch { /* giữ raw nếu decode lỗi */ }
    path = path.replace(/\/{2,}/g, '/');
    return path.replace(/^\/api/, '') || '/';
  }
}
