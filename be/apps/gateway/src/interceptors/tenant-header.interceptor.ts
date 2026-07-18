import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

interface JwtUser {
  sub?: string;
  id?: string;
  tenantId?: string;
  username?: string;
}

interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user?: JwtUser;
}

@Injectable()
export class TenantHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // Extract tenantId from JWT (already decoded by JwtGuard)
    const user = request.user;
    if (user?.tenantId) {
      // Set header for downstream services
      request.headers['x-tenant-id'] = user.tenantId;
    }

    if (user?.sub || user?.id) {
      request.headers['x-user-id'] = user.sub ?? user.id;
    }

    return next.handle();
  }
}
