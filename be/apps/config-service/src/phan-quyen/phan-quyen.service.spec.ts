import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContextService } from '@app/core';
import { PhanQuyen } from '@app/entities';
import { PhanQuyen_Service } from './phan-quyen.service';

/**
 * `findByVaiTro()` là bộ chọn hàng của CẢ BA đường ghi vào bảng thẩm quyền
 * (`create()`, `update()`, `upsertPermissions()`), mà `vaiTro` lại là tên tự
 * do từng tenant tự đặt — "Quản lý", "HR Admin" trùng nhau giữa các công ty
 * là chuyện thường. Thiếu điều kiện `tenantId`, `upsertPermissions('Quản lý')`
 * của công ty A ghi đè quyền lên hàng "Quản lý" của công ty B.
 *
 * Mock repository ở đây CỐ Ý là repo trần, KHÔNG mô phỏng proxy tenant của
 * `DatabaseModule.forFeature`: nếu mock tự thêm `tenantId` giúp thì test
 * xanh kể cả khi service gỡ hết điều kiện lọc — đúng kiểu "mock che mất lỗi
 * cần bắt". Test này khẳng định service TỰ đặt điều kiện.
 */
describe('PhanQuyen_Service — lọc tenantId', () => {
  const TENANT_A = 'tenant-a';

  let service: PhanQuyen_Service;
  let mockRepo: { findOne: jest.Mock; find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let tenantIdHienTai: string | undefined;

  beforeEach(async () => {
    tenantIdHienTai = TENANT_A;
    mockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve(v)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhanQuyen_Service,
        { provide: getRepositoryToken(PhanQuyen), useValue: mockRepo },
        {
          provide: TenantContextService,
          useValue: { getCurrentTenantId: () => tenantIdHienTai },
        },
      ],
    }).compile();

    service = module.get<PhanQuyen_Service>(PhanQuyen_Service);
  });

  it('findByVaiTro lọc theo tenantId của phiên hiện tại', async () => {
    await service.findByVaiTro('Quản lý');

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { vaiTro: 'Quản lý', tenantId: TENANT_A },
    });
  });

  it('không có tenant context thì KHÔNG gắn tenantId: undefined vào điều kiện', async () => {
    tenantIdHienTai = undefined;

    await service.findByVaiTro('Quản lý');

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { vaiTro: 'Quản lý' },
    });
    expect(mockRepo.findOne.mock.calls[0][0].where).not.toHaveProperty(
      'tenantId',
    );
  });

  it('upsertPermissions tìm hàng cần ghi đè theo cả vaiTro lẫn tenantId', async () => {
    await service.upsertPermissions('Quản lý', ['/cham-cong/don-tu:xem']);

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { vaiTro: 'Quản lý', tenantId: TENANT_A },
    });
  });

  it('getPermissionsByVaiTro cũng đi qua điều kiện tenantId (không có đường đọc tắt)', async () => {
    await service.getPermissionsByVaiTro('Quản lý');

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { vaiTro: 'Quản lý', tenantId: TENANT_A },
    });
  });
});
