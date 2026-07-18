import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../services/jwt.service';

/**
 * Guard that only accepts temp tokens (for select-tenant endpoint)
 * Rejects access tokens with tenantId
 */
@Injectable()
export class TempTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Yêu cầu token xác thực');
    }

    try {
      const decoded = this.jwtService.verifyToken(token);

      // Only accept temp tokens
      if (!this.jwtService.isTempToken(decoded)) {
        throw new UnauthorizedException(
          'Yêu cầu token tạm thời. Token truy cập không được phép cho endpoint này.',
        );
      }

      // Attach decoded user to request (minimal info for temp token)
      (request as Request & { user: unknown }).user = {
        id: decoded.sub,
        email: decoded.email,
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
