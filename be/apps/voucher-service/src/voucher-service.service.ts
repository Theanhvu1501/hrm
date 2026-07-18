import { Injectable } from '@nestjs/common';

@Injectable()
export class VoucherServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
