import { Injectable } from '@nestjs/common';

@Injectable()
export class CashBookServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
