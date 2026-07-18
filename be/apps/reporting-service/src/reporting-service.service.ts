import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportingServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
