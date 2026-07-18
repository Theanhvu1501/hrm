import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * @param roles - Array of role names that can access the route
 * @example
 * @Roles('ADMIN', 'KE_TOAN_QUY')
 * @UseGuards(JwtGuard, RoleGuard)
 * async create() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
