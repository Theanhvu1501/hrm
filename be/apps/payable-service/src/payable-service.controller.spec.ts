import { Test, TestingModule } from '@nestjs/testing';
import { PayableServiceController } from './payable-service.controller';
import { PayableServiceService } from './payable-service.service';

describe('PayableServiceController', () => {
  let payableServiceController: PayableServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PayableServiceController],
      providers: [PayableServiceService],
    }).compile();

    payableServiceController = app.get<PayableServiceController>(
      PayableServiceController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(payableServiceController.getHello()).toBe('Hello World!');
    });
  });
});
