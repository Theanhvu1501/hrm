import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the raw Authorization header value from the incoming request.
 * Used to forward the Bearer token to downstream services (e.g. IdentityClient).
 *
 * @example
 *   async myMethod(@AuthToken() token: string) { ... }
 */
export const AuthToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return (request.headers?.authorization as string) ?? '';
  },
);
