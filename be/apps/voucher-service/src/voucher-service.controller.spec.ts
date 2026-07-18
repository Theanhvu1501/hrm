import { Test, TestingModule } from '@nestjs/testing';
import { VoucherServiceController } from './voucher-service.controller';
import { VoucherServiceService } from './voucher-service.service';

describe('VoucherServiceController', () => {
  let voucherServiceController: VoucherServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [VoucherServiceController],
      providers: [VoucherServiceService],
    }).compile();

    voucherServiceController = app.get<VoucherServiceController>(
      VoucherServiceController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(voucherServiceController.getHello()).toBe('Hello World!');
    });
  });
});
