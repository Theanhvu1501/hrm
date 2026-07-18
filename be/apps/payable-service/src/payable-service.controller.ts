import { Controller, Get } from '@nestjs/common';
import { PayableServiceService } from './payable-service.service';

@Controller()
export class PayableServiceController {
  constructor(private readonly payableServiceService: PayableServiceService) {}

  @Get()
  getHello(): string {
    return this.payableServiceService.getHello();
  }
}
