import {
  Controller,
  Post,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtGuard, CurrentUser } from '@app/auth';
import type { UserPayload } from '@app/auth';
import { ProvisioningService } from './provisioning.service';

@Controller('provisioning')
export class ProvisioningController {
  constructor(private readonly provisioningService: ProvisioningService) {}

  /**
   * POST /provisioning/ensure
   *
   * Manually triggers Kế toán-side provisioning for the authenticated user's
   * current tenant. Idempotent — safe to call multiple times.
   *
   * Requires a valid access JWT (tenantId must be present in token).
   * isCompanyAdmin is derived from membershipRole claim set by JwtGuard.
   */
  @Post('ensure')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async ensure(
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean }> {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const userId = user.id;
    const isCompanyAdmin = user.membershipRole === 'admin';

    await this.provisioningService.ensure(tenantId, userId, isCompanyAdmin);

    return { success: true };
  }
}
