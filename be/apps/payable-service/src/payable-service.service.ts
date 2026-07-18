import { Injectable } from '@nestjs/common';

@Injectable()
export class PayableServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
