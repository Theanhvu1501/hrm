import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 * @param permissions - Array of permission names required to access the route
 * @example
 * @Permissions('create_phieu_thu', 'view_phieu_thu')
 * @UseGuards(JwtGuard, RoleGuard, PermissionGuard)
 * async create() { ... }
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
