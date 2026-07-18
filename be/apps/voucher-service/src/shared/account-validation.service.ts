import { Injectable, BadRequestException } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';

@Injectable()
export class AccountValidationService {
  constructor(private readonly serviceClient: ServiceClient) {}

  /**
   * Validate that account codes exist in master data
   */
  async validateAccounts(
    taiKhoanNo: string,
    taiKhoanCo: string,
    authToken?: string,
  ): Promise<void> {
    const errors: string[] = [];

    const noExists = await this.checkAccountExists(taiKhoanNo, authToken);
    if (!noExists) {
      errors.push(`Debit account ${taiKhoanNo} does not exist`);
    }

    const coExists = await this.checkAccountExists(taiKhoanCo, authToken);
    if (!coExists) {
      errors.push(`Credit account ${taiKhoanCo} does not exist`);
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  private async checkAccountExists(
    ma: string,
    authToken?: string,
  ): Promise<boolean> {
    // Use getTaiKhoanByMa for direct lookup instead of fetching all accounts
    const response = await this.serviceClient.getTaiKhoanByMa(ma, authToken);

    if (response.success && response.data) {
      return true;
    }

    // If direct lookup fails, try fetching with high limit as fallback
    const allResponse = await this.serviceClient.get<{
      data: { ma: string }[];
      meta: { total: number };
    }>('master-data', '/tai-khoan', {
      headers: authToken ? { Authorization: authToken } : undefined,
      query: { limit: '1000' },
    });

    if (allResponse.success && Array.isArray(allResponse.data?.data)) {
      return allResponse.data.data.some((account) => account.ma === ma);
    }

    // If service unavailable, allow validation to pass
    return true;
  }
}
