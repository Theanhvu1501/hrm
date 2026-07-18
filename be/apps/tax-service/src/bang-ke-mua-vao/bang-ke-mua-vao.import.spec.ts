import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BangKeMuaVaoService } from './bang-ke-mua-vao.service';
import {
  CreateBangKeMuaVaoDto,
  ImportBangKeMuaVaoDto,
  CheckDuplicatesDto,
} from './dto';

type AnyRepo = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
};

function makeService(existing: unknown[] = []) {
  const repo: AnyRepo = {
    create: jest.fn((o) => ({ ...o })),
    save: jest.fn(async (e) => e),
    find: jest.fn(async () => existing),
  };
  const tenantContext = { getCurrentTenantId: () => 'tenant-1' };
  const service = new BangKeMuaVaoService(
    repo as never,
    tenantContext as never,
  );
  return { service, repo };
}

const dto = (over: Partial<CreateBangKeMuaVaoDto> = {}): CreateBangKeMuaVaoDto =>
  ({
    ngayHoaDon: '2026-06-01',
    soHoaDon: '0000123',
    kyHieuHoaDon: '1C25TAA',
    tenNguoiBan: 'Cty A',
    mstNguoiBan: '0101243150',
    giaTriChuaThue: 1_000_000,
    thueSuat: '10',
    ...over,
  }) as CreateBangKeMuaVaoDto;

describe('BangKeMuaVaoService.importMany', () => {
  it('lưu đủ số bản ghi và trả về số đã tạo', async () => {
    const { service, repo } = makeService();

    const result = await service.importMany([
      dto({ soHoaDon: '1' }),
      dto({ soHoaDon: '2' }),
      dto({ soHoaDon: '3' }),
    ]);

    expect(result).toEqual({ created: 3 });
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save.mock.calls[0][0]).toHaveLength(3);
  });

  it('tính tiền thuế và tổng thanh toán theo thuế suất của từng dòng', async () => {
    const { service, repo } = makeService();

    await service.importMany([
      dto({ giaTriChuaThue: 1_000_000, thueSuat: '10' }),
      dto({ giaTriChuaThue: 1_000_000, thueSuat: '5' }),
      dto({ giaTriChuaThue: 1_000_000, thueSuat: 'KCT' }),
      dto({ giaTriChuaThue: 1_000_000, thueSuat: 'KKKT' }),
    ]);

    const saved = repo.save.mock.calls[0][0] as {
      tienThue: number;
      tongThanhToan: number;
    }[];
    expect(saved.map((e) => e.tienThue)).toEqual([100_000, 50_000, 0, 0]);
    expect(saved.map((e) => e.tongThanhToan)).toEqual([
      1_100_000, 1_050_000, 1_000_000, 1_000_000,
    ]);
  });

  it('đặt isActive và chuyển ngayHoaDon sang Date', async () => {
    const { service, repo } = makeService();

    await service.importMany([dto({ ngayHoaDon: '2026-06-01' })]);

    const [entity] = repo.save.mock.calls[0][0] as {
      isActive: boolean;
      ngayHoaDon: Date;
    }[];
    expect(entity.isActive).toBe(true);
    expect(entity.ngayHoaDon).toBeInstanceOf(Date);
    expect(entity.ngayHoaDon.toISOString()).toContain('2026-06-01');
  });
});

/**
 * main.ts bật ValidationPipe { whitelist, transform, forbidNonWhitelisted }.
 * Payload FE dựng (fe/.../thue/components/import/lib/validate.ts) phải qua được lớp này.
 */
describe('ImportBangKeMuaVaoDto — validation pipe', () => {
  const validateBody = async (body: unknown) => {
    const instance = plainToInstance(ImportBangKeMuaVaoDto, body);
    return validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  };

  it('chấp nhận payload đầy đủ FE gửi lên', async () => {
    const errors = await validateBody({
      items: [
        {
          ngayHoaDon: '2026-06-01',
          soHoaDon: '0000123',
          kyHieuHoaDon: '1C25TAA',
          tenNguoiBan: 'Cty A',
          mstNguoiBan: '0101243150',
          tenHangHoa: 'VPP',
          giaTriChuaThue: 10_000_000,
          thueSuat: '10',
          ghiChu: 'ghi chú',
        },
      ],
    });
    expect(errors).toEqual([]);
  });

  it('chấp nhận payload tối giản (bỏ hết trường tùy chọn)', async () => {
    const errors = await validateBody({
      items: [
        {
          ngayHoaDon: '2026-06-01',
          soHoaDon: '0000123',
          tenNguoiBan: 'Cty A',
          giaTriChuaThue: 0,
          thueSuat: 'KCT',
        },
      ],
    });
    expect(errors).toEqual([]);
  });

  it('từ chối mảng items rỗng', async () => {
    const errors = await validateBody({ items: [] });
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('arrayNotEmpty');
  });

  it('từ chối item có thuế suất lạ', async () => {
    const errors = await validateBody({
      items: [
        {
          ngayHoaDon: '2026-06-01',
          soHoaDon: '1',
          tenNguoiBan: 'A',
          giaTriChuaThue: 1,
          thueSuat: '12',
        },
      ],
    });
    expect(errors).toHaveLength(1);
  });

  it('từ chối item mang trường của bảng kê bán ra', async () => {
    const errors = await validateBody({
      items: [
        {
          ngayHoaDon: '2026-06-01',
          soHoaDon: '1',
          tenNguoiBan: 'A',
          tenNguoiMua: 'B', // không thuộc DTO mua vào
          giaTriChuaThue: 1,
          thueSuat: '10',
        },
      ],
    });
    expect(errors).toHaveLength(1);
  });

  it('CheckDuplicatesDto chấp nhận khóa chỉ có số hóa đơn', async () => {
    const instance = plainToInstance(CheckDuplicatesDto, {
      keys: [{ soHoaDon: '0000123' }],
    });
    expect(
      await validate(instance, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
  });
});

describe('BangKeMuaVaoService.checkDuplicates', () => {
  const existing = [
    {
      soHoaDon: '0000123',
      kyHieuHoaDon: '1C25TAA',
      mstNguoiBan: '0101243150',
      isActive: true,
    },
    {
      soHoaDon: '0000999',
      kyHieuHoaDon: '1C25TAA',
      mstNguoiBan: '0101243150',
      isActive: false, // đã xóa mềm
    },
  ];

  it('trả về khóa đã tồn tại, bỏ qua khóa mới', async () => {
    const { service } = makeService(existing);

    const found = await service.checkDuplicates([
      { soHoaDon: '0000123', kyHieuHoaDon: '1C25TAA', mst: '0101243150' },
      { soHoaDon: '0000456', kyHieuHoaDon: '1C25TAA', mst: '0101243150' },
    ]);

    expect(found).toEqual(['0000123|1C25TAA|0101243150']);
  });

  it('so khớp không phân biệt hoa thường và khoảng trắng thừa', async () => {
    const { service } = makeService(existing);

    const found = await service.checkDuplicates([
      { soHoaDon: ' 0000123 ', kyHieuHoaDon: '1c25taa', mst: ' 0101243150' },
    ]);

    expect(found).toEqual(['0000123|1C25TAA|0101243150']);
  });

  it('bỏ qua hóa đơn đã xóa mềm', async () => {
    const { service } = makeService(existing);

    const found = await service.checkDuplicates([
      { soHoaDon: '0000999', kyHieuHoaDon: '1C25TAA', mst: '0101243150' },
    ]);

    expect(found).toEqual([]);
  });

  it('lọc theo tenant hiện tại', async () => {
    const { service, repo } = makeService(existing);

    await service.checkDuplicates([{ soHoaDon: '0000123' }]);

    expect(repo.find).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
  });

  it('trả mảng rỗng khi không có khóa nào', async () => {
    const { service, repo } = makeService(existing);

    expect(await service.checkDuplicates([])).toEqual([]);
    expect(repo.find).not.toHaveBeenCalled();
  });
});

describe('BangKeMuaVaoService — tiền thuế nhập tay', () => {
  it('create: không gửi tienThue → tính theo công thức', async () => {
    const { service } = makeService();
    const saved = await service.create(
      dto({ giaTriChuaThue: 1_000_000, thueSuat: '10' }),
    );
    expect(saved.tienThue).toBe(100_000);
    expect(saved.tongThanhToan).toBe(1_100_000);
  });

  it('create: gửi tienThue → giữ nguyên số nhập, không tính lại', async () => {
    const { service } = makeService();
    const saved = await service.create(
      dto({ giaTriChuaThue: 1_000_000, thueSuat: '10', tienThue: 99_998 }),
    );
    expect(saved.tienThue).toBe(99_998);
    expect(saved.tongThanhToan).toBe(1_099_998);
  });

  it('create: gửi cả tongThanhToan → giữ nguyên số nhập', async () => {
    const { service } = makeService();
    const saved = await service.create(
      dto({
        giaTriChuaThue: 1_000_000,
        thueSuat: '10',
        tienThue: 99_998,
        tongThanhToan: 1_099_990,
      }),
    );
    expect(saved.tienThue).toBe(99_998);
    expect(saved.tongThanhToan).toBe(1_099_990);
  });

  it('create: tienThue = 0 vẫn được tôn trọng (không bị coi là "chưa nhập")', async () => {
    const { service } = makeService();
    const saved = await service.create(
      dto({ giaTriChuaThue: 1_000_000, thueSuat: '10', tienThue: 0 }),
    );
    expect(saved.tienThue).toBe(0);
    expect(saved.tongThanhToan).toBe(1_000_000);
  });

  it('importMany: mỗi dòng giữ tiền thuế của chính nó, dòng bỏ trống thì tính công thức', async () => {
    const { service, repo } = makeService();
    await service.importMany([
      dto({
        soHoaDon: 'A1',
        giaTriChuaThue: 1_000_000,
        thueSuat: '10',
        tienThue: 99_998,
      }),
      dto({ soHoaDon: 'A2', giaTriChuaThue: 2_000_000, thueSuat: '8' }),
    ]);
    const entities = repo.save.mock.calls[0][0] as Array<{
      tienThue: number;
      tongThanhToan: number;
    }>;
    expect(entities[0].tienThue).toBe(99_998);
    expect(entities[1].tienThue).toBe(160_000);
    expect(entities[1].tongThanhToan).toBe(2_160_000);
  });

  it('DTO: tienThue âm bị chặn', async () => {
    const instance = plainToInstance(CreateBangKeMuaVaoDto, {
      ...dto(),
      tienThue: -1,
    });
    const errors = await validate(instance);
    expect(errors.some((e) => e.property === 'tienThue')).toBe(true);
  });

  it('DTO: tienThue / tongThanhToan hợp lệ thì qua được validation', async () => {
    const instance = plainToInstance(CreateBangKeMuaVaoDto, {
      ...dto(),
      tienThue: 99_998,
      tongThanhToan: 1_099_998,
    });
    const errors = await validate(instance);
    expect(errors).toHaveLength(0);
  });
});

describe('BangKeMuaVaoService.update — tiền thuế nhập tay', () => {
  const existing = () =>
    ({
      id: 'x1',
      giaTriChuaThue: 1_000_000,
      thueSuat: '10',
      tienThue: 99_998,
      tongThanhToan: 1_099_998,
      isActive: true,
    }) as never;

  it('update gửi kèm tienThue mới → lưu số mới', async () => {
    const { service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue(existing());

    const saved = await service.update('x1', {
      giaTriChuaThue: 2_000_000,
      tienThue: 199_997,
      tongThanhToan: 2_199_997,
    });

    expect(saved.tienThue).toBe(199_997);
    expect(saved.tongThanhToan).toBe(2_199_997);
  });

  it('update chỉ đổi giaTriChuaThue (không gửi tienThue) → tính lại theo công thức', async () => {
    const { service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue(existing());

    const saved = await service.update('x1', { giaTriChuaThue: 2_000_000 });

    expect(saved.tienThue).toBe(200_000);
    expect(saved.tongThanhToan).toBe(2_200_000);
  });
});
