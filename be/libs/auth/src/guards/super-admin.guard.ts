import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { SUPER_ADMIN_EMAIL } from '@app/entities';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('Không tìm thấy thông tin người dùng');
    }

    if (user.email !== SUPER_ADMIN_EMAIL) {
      throw new ForbiddenException('Chỉ Super Admin mới có quyền truy cập');
    }

    return true;
  }
}
