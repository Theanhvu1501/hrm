import { ConflictException } from '@nestjs/common';
import { HoSoChungTuService } from './ho-so-chung-tu.service';

describe('HoSoChungTuService', () => {
  it('create() ném ConflictException khi trùng mã', async () => {
    const repo: any = {
      findOne: jest.fn().mockResolvedValue({ ma: 'PHIEU_CHI' }),
      create: jest.fn(),
      save: jest.fn(),
    };
    const tenant: any = { getCurrentTenantId: () => 't1' };
    const svc = new HoSoChungTuService(repo, tenant);
    await expect(svc.create({ ma: 'PHIEU_CHI', ten: 'Phiếu chi' })).rejects.toBeInstanceOf(ConflictException);
  });
});
