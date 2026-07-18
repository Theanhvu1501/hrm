import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../services/jwt.service';
import { AuthzLoaderService } from '../services/authz-loader.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authzLoader: AuthzLoaderService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Yêu cầu token xác thực');
    }

    try {
      const decoded = this.jwtService.verifyToken(token);

      if (this.jwtService.isTempToken(decoded)) {
        throw new UnauthorizedException(
          'Access token required. Temp token is not allowed for this endpoint.',
        );
      }

      let vaiTro = decoded.vaiTro;
      let permissions = decoded.permissions;

      // Token Identity không mang vaiTro → nạp role/quyền từ DB theo userId+tenantId
      if (vaiTro === undefined || vaiTro === null) {
        const authz = await this.authzLoader.load(
          decoded.sub,
          decoded.tenantId,
          decoded.email,
        );
        vaiTro = authz.vaiTro;
        permissions = authz.permissions;
      }

      (request as Request & { user: unknown }).user = {
        id: decoded.sub,
        email: decoded.email,
        tenantId: decoded.tenantId,
        vaiTro,
        permissions: permissions ?? [],
        membershipRole: decoded.membershipRole,
        apps: decoded.apps ?? [],
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException((error as Error).message);
    }
  }

  /**
   * Extract Bearer token from Authorization header
   * @param request - Express request object
   * @returns Token string or null
   */
  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}
