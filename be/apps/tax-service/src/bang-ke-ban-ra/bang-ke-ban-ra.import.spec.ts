import { BangKeBanRaService } from './bang-ke-ban-ra.service';
import { CreateBangKeBanRaDto } from './dto';

function makeService(existing: unknown[] = []) {
  const repo = {
    create: jest.fn((o) => ({ ...o })),
    save: jest.fn(async (e) => e),
    find: jest.fn(async () => existing),
  };
  const tenantContext = { getCurrentTenantId: () => 'tenant-1' };
  const service = new BangKeBanRaService(repo as never, tenantContext as never);
  return { service, repo };
}

describe('BangKeBanRaService.importMany', () => {
  it('lưu đủ bản ghi và tính tiền thuế theo từng dòng', async () => {
    const { service, repo } = makeService();

    const result = await service.importMany([
      {
        ngayHoaDon: '2026-06-01',
        soHoaDon: '1',
        tenNguoiMua: 'Cty B',
        giaTriChuaThue: 2_000_000,
        thueSuat: '8',
      },
      {
        ngayHoaDon: '2026-06-02',
        soHoaDon: '2',
        tenNguoiMua: 'Cty C',
        giaTriChuaThue: 2_000_000,
        thueSuat: 'KCT',
      },
    ] as CreateBangKeBanRaDto[]);

    expect(result).toEqual({ created: 2 });
    const saved = repo.save.mock.calls[0][0] as { tienThue: number }[];
    expect(saved.map((e) => e.tienThue)).toEqual([160_000, 0]);
  });
});

describe('BangKeBanRaService.checkDuplicates', () => {
  it('dựng khóa từ mstNguoiMua (không phải mstNguoiBan)', async () => {
    const { service } = makeService([
      {
        soHoaDon: '0000123',
        kyHieuHoaDon: '1C25TAA',
        mstNguoiMua: '0101243150',
        isActive: true,
      },
    ]);

    const found = await service.checkDuplicates([
      { soHoaDon: '0000123', kyHieuHoaDon: '1C25TAA', mst: '0101243150' },
    ]);

    expect(found).toEqual(['0000123|1C25TAA|0101243150']);
  });
});

const banRaDto = (
  over: Partial<CreateBangKeBanRaDto> = {},
): CreateBangKeBanRaDto =>
  ({
    ngayHoaDon: '2026-06-01',
    soHoaDon: '0000123',
    kyHieuHoaDon: '1C25TAA',
    tenNguoiMua: 'Cty B',
    mstNguoiMua: '0101243150',
    giaTriChuaThue: 1_000_000,
    thueSuat: '10',
    ...over,
  }) as CreateBangKeBanRaDto;

describe('BangKeBanRaService — tiền thuế nhập tay', () => {
  it('create: không gửi tienThue → tính theo công thức', async () => {
    const { service } = makeService();
    const saved = await service.create(banRaDto());
    expect(saved.tienThue).toBe(100_000);
    expect(saved.tongThanhToan).toBe(1_100_000);
  });

  it('create: gửi tienThue → giữ nguyên số nhập, không tính lại', async () => {
    const { service } = makeService();
    const saved = await service.create(banRaDto({ tienThue: 99_998 }));
    expect(saved.tienThue).toBe(99_998);
    expect(saved.tongThanhToan).toBe(1_099_998);
  });

  it('create: gửi cả tongThanhToan → giữ nguyên số nhập', async () => {
    const { service } = makeService();
    const saved = await service.create(
      banRaDto({ tienThue: 99_998, tongThanhToan: 1_099_990 }),
    );
    expect(saved.tongThanhToan).toBe(1_099_990);
  });

  it('create: tienThue = 0 vẫn được tôn trọng', async () => {
    const { service } = makeService();
    const saved = await service.create(banRaDto({ tienThue: 0 }));
    expect(saved.tienThue).toBe(0);
    expect(saved.tongThanhToan).toBe(1_000_000);
  });

  it('importMany: dòng có tiền thuế giữ nguyên, dòng trống tính công thức', async () => {
    const { service, repo } = makeService();
    await service.importMany([
      banRaDto({ soHoaDon: 'B1', tienThue: 99_998 }),
      banRaDto({ soHoaDon: 'B2', giaTriChuaThue: 2_000_000, thueSuat: '8' }),
    ]);
    const entities = repo.save.mock.calls[0][0] as Array<{
      tienThue: number;
      tongThanhToan: number;
    }>;
    expect(entities[0].tienThue).toBe(99_998);
    expect(entities[1].tienThue).toBe(160_000);
    expect(entities[1].tongThanhToan).toBe(2_160_000);
  });

  it('update chỉ đổi giaTriChuaThue → tính lại theo công thức', async () => {
    const { service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'y1',
      giaTriChuaThue: 1_000_000,
      thueSuat: '10',
      tienThue: 99_998,
      tongThanhToan: 1_099_998,
      isActive: true,
    } as never);

    const saved = await service.update('y1', { giaTriChuaThue: 2_000_000 });

    expect(saved.tienThue).toBe(200_000);
    expect(saved.tongThanhToan).toBe(2_200_000);
  });
});
