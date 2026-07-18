import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserPayload } from '../interfaces';

/**
 * Decorator to extract the current user from the request
 * Must be used after JwtGuard has been applied
 *
 * @example
 * @Get('profile')
 * @UseGuards(JwtGuard)
 * async getProfile(@CurrentUser() user: UserPayload) {
 *   return user;
 * }
 *
 * @example
 * // Get specific property
 * @Get('profile')
 * @UseGuards(JwtGuard)
 * async getProfile(@CurrentUser('email') email: string) {
 *   return { email };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as any).user as UserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
