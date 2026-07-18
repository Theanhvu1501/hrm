import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import {
  VerifyTokenDto,
  SwitchTenantDto,
} from './dto';
import { JwtGuard, CurrentUser, AuthToken } from '@app/auth';
import type { UserPayload } from '@app/auth';

@Controller()
export class AuthServiceController {
  constructor(private readonly authService: AuthServiceService) {}

  /**
   * POST /switch-tenant
   * Switch to a different tenant without re-login (requires authentication).
   * Proxies to identity-service, enriches response with digital_book data.
   */
  @Post('switch-tenant')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async switchTenant(
    @AuthToken() token: string,
    @CurrentUser() user: UserPayload,
    @Body() switchTenantDto: SwitchTenantDto,
  ) {
    const result = await this.authService.switchTenant(
      token,
      user.id,
      switchTenantDto.tenantId,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /verify
   * Verify a JWT token and return decoded payload
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() verifyDto: VerifyTokenDto) {
    const payload = this.authService.verify(verifyDto);
    return {
      success: true,
      data: payload,
    };
  }

  /**
   * GET /me
   * Get current user profile with tenant info (requires authentication).
   * Forwards token to identity-service, enriches response with digital_book data.
   */
  @Get('me')
  @UseGuards(JwtGuard)
  async getMe(
    @AuthToken() token: string,
    @CurrentUser() user: UserPayload,
  ) {
    const profile = await this.authService.getMe(token, user.id, user.tenantId);
    return {
      success: true,
      data: profile,
    };
  }

  /**
   * POST /logout
   * Logout current user (requires authentication)
   */
  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: UserPayload) {
    const result = this.authService.logout(user.id);
    return {
      success: true,
      data: result,
    };
  }
}
