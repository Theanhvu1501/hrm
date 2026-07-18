import { Test, TestingModule } from '@nestjs/testing';
import { CashBookServiceController } from './cash-book-service.controller';
import { CashBookServiceService } from './cash-book-service.service';

describe('CashBookServiceController', () => {
  let cashBookServiceController: CashBookServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CashBookServiceController],
      providers: [CashBookServiceService],
    }).compile();

    cashBookServiceController = app.get<CashBookServiceController>(
      CashBookServiceController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(cashBookServiceController.getHello()).toBe('Hello World!');
    });
  });
});
