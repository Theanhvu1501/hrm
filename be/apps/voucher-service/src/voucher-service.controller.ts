import { Controller, Get } from '@nestjs/common';
import { VoucherServiceService } from './voucher-service.service';

@Controller()
export class VoucherServiceController {
  constructor(private readonly voucherServiceService: VoucherServiceService) {}

  @Get()
  getHello(): string {
    return this.voucherServiceService.getHello();
  }
}
