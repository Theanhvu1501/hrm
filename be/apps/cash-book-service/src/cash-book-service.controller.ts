import { Controller, Get } from '@nestjs/common';
import { CashBookServiceService } from './cash-book-service.service';

@Controller()
export class CashBookServiceController {
  constructor(
    private readonly cashBookServiceService: CashBookServiceService,
  ) {}

  @Get()
  getHello(): string {
    return this.cashBookServiceService.getHello();
  }
}
