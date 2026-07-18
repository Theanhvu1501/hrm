import { Controller, Get } from '@nestjs/common';
import { ReportingServiceService } from './reporting-service.service';

@Controller()
export class ReportingServiceController {
  constructor(
    private readonly reportingServiceService: ReportingServiceService,
  ) {}

  @Get()
  getHello(): string {
    return this.reportingServiceService.getHello();
  }
}
