import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AttendanceRequest,
  CauHinhLuong,
  DongLuongThemGio,
  Employee,
} from '@app/entities';
import { ThemGio_Service } from './them-gio.service';

function repoGia(khoiTao: any[] = []) {
  const rows: any[] = [...khoiTao];
  let seq = 0;
  return {
    rows,
    find: jest.fn(async ({ where }: any = {}) =>
      rows.filter((r) =>
        Object.entries(where ?? {}).every(([k, v]) => String(r[k]) === String(v)),
      ),
    ),
    findOne: jest.fn(
      async ({ where }: any = {}) =>
        rows.find((r) =>
          Object.entries(where ?? {}).every(
            ([k, v]) => String(r[k]) === String(v),
          ),
        ) ?? null,
    ),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => {
      if (!x._id) {
        seq += 1;
        x._id = seq.toString(16).padStart(24, '0');
        rows.push(x);
        return x;
      }
      const i = rows.findIndex((r) => String(r._id) === String(x._id));
      if (i >= 0) rows[i] = x;
      else rows.push(x);
      return x;
    }),
  };
}

const NV = {
  _id: '650000000000000000000101',
  employeeId: 'NV0001',
  hoTen: 'Đào Thị Kiều Oanh',
  luongThoaThuan: 5_500_000,
  isActive: true,
};

const CAU_HINH = {
  congChuan: 24,
  soGioMoiNgay: 8,
  lamThem: {
    cheDoBu: 'chi_tien',
    heSoTra: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3, ngay_dem: 1.5 },
    heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3, ngay_dem: 1.5 },
    khungGioDem: { tu: '22:00', den: '06:00' },
    uuTienLoai: ['ngay_le', 'ngay_nghi', 'ngay_dem', 'ngay_thuong'],
    mienThueChenh: ['ngay_dem'],
    soThangHanDung: null,
    khiHetHan: 'quy_ra_tien',
  },
};

const donOt = (over: any = {}) => ({
  _id: over._id ?? 'd1',
  loaiDon: 'lam_them_gio',
  trangThai: 'da_duyet',
  isActive: true,
  employeeId: NV._id,
  ngay: '2026-06-10',
  soGioOt: 35,
  loaiNgayOt: 'ngay_thuong',
  heSoOt: 1.5,
  phanBoOt: [
    { loaiNgayOt: 'ngay_thuong', soGio: 35, heSoTra: 1.5, heSoTichQuy: 1.5 },
  ],
  ...over,
});

async function dungService(
  opts: { don?: any[]; dong?: any[]; cauHinh?: any } = {},
) {
  const donRepo = repoGia(opts.don);
  const dongRepo = repoGia(opts.dong);
  const nvRepo = repoGia([NV]);
  const chRepo = repoGia([opts.cauHinh ?? CAU_HINH]);

  const mod = await Test.createTestingModule({
    providers: [
      ThemGio_Service,
      { provide: getRepositoryToken(DongLuongThemGio), useValue: dongRepo },
      { provide: getRepositoryToken(AttendanceRequest), useValue: donRepo },
      { provide: getRepositoryToken(Employee), useValue: nvRepo },
      { provide: getRepositoryToken(CauHinhLuong), useValue: chRepo },
    ],
  }).compile();

  return { service: mod.get(ThemGio_Service), donRepo, dongRepo };
}

describe('ThemGio_Service.tongHop', () => {
  it('CA KIỂM CHUẨN: 35 giờ ngày thường, lương 5.500.000 → 1.503.906,25', async () => {
    const { service, dongRepo } = await dungService({ don: [donOt()] });

    await service.tongHop('2026-06');

    const d = dongRepo.rows[0];
    expect(d.donGiaGio).toBeCloseTo(28_645.8333, 4);
    expect(d.theoLoai.ngay_thuong.soGio).toBe(35);
    expect(d.tongTien).toBeCloseTo(1_503_906.25, 2);
    expect(d.thucNhan).toBeCloseTo(1_503_906.25, 2);
  });

  it('chỉ lấy đơn ĐÃ DUYỆT, đúng tháng, đúng loại đơn, còn active', async () => {
    const { service, dongRepo } = await dungService({
      don: [
        donOt({ _id: 'd1' }),
        donOt({ _id: 'd2', trangThai: 'cho_duyet' }),
        donOt({ _id: 'd3', ngay: '2026-07-01' }),
        donOt({ _id: 'd4', loaiDon: 'nghi_phep' }),
        donOt({ _id: 'd5', isActive: false }),
      ],
    });

    await service.tongHop('2026-06');

    // Chỉ d1 được tính ⇒ đúng 35 giờ, không phải 175.
    expect(dongRepo.rows[0].theoLoai.ngay_thuong.soGio).toBe(35);
  });

  it('cộng giờ từ NHIỀU đơn và nhiều loại trong phanBoOt', async () => {
    const { service, dongRepo } = await dungService({
      don: [
        donOt({
          _id: 'd1',
          phanBoOt: [
            { loaiNgayOt: 'ngay_thuong', soGio: 2, heSoTra: 1.5, heSoTichQuy: 1.5 },
            { loaiNgayOt: 'ngay_dem', soGio: 4, heSoTra: 1.5, heSoTichQuy: 1.5 },
          ],
        }),
        donOt({
          _id: 'd2',
          phanBoOt: [
            { loaiNgayOt: 'ngay_dem', soGio: 3, heSoTra: 1.5, heSoTichQuy: 1.5 },
          ],
        }),
      ],
    });

    await service.tongHop('2026-06');

    expect(dongRepo.rows[0].theoLoai.ngay_thuong.soGio).toBe(2);
    expect(dongRepo.rows[0].theoLoai.ngay_dem.soGio).toBe(7);
  });

  it('đơn cũ chưa backfill (không có phanBoOt) rơi về loaiNgayOt/soGioOt', async () => {
    const { service, dongRepo } = await dungService({
      don: [donOt({ phanBoOt: undefined, soGioOt: 6, loaiNgayOt: 'ngay_le' })],
    });

    await service.tongHop('2026-06');

    expect(dongRepo.rows[0].theoLoai.ngay_le.soGio).toBe(6);
  });

  it('cheDoBu = chi_nghi_bu → không trả đồng nào (giờ đã vào quỹ)', async () => {
    const { service, dongRepo } = await dungService({
      don: [donOt()],
      cauHinh: {
        ...CAU_HINH,
        lamThem: { ...CAU_HINH.lamThem, cheDoBu: 'chi_nghi_bu' },
      },
    });

    await service.tongHop('2026-06');

    expect(dongRepo.rows[0].tongTien).toBe(0);
    expect(dongRepo.rows[0].theoLoai).toEqual({});
  });

  it('cheDoBu = nhan_vien_chon → chỉ đơn hinhThucBu = tien', async () => {
    const { service, dongRepo } = await dungService({
      don: [
        donOt({ _id: 'd1', hinhThucBu: 'tien' }),
        donOt({ _id: 'd2', hinhThucBu: 'nghi_bu' }),
        donOt({ _id: 'd3' }), // không khai ⇒ không phải 'tien' ⇒ bỏ
      ],
      cauHinh: {
        ...CAU_HINH,
        lamThem: { ...CAU_HINH.lamThem, cheDoBu: 'nhan_vien_chon' },
      },
    });

    await service.tongHop('2026-06');

    expect(dongRepo.rows[0].theoLoai.ngay_thuong.soGio).toBe(35);
  });

  it('cheDoBu = nghi_bu_va_chenh → hệ số áp là heSoTra − 1', async () => {
    const { service, dongRepo } = await dungService({
      don: [
        donOt({
          phanBoOt: [
            { loaiNgayOt: 'ngay_le', soGio: 8, heSoTra: 3, heSoTichQuy: 1 },
          ],
        }),
      ],
      cauHinh: {
        ...CAU_HINH,
        lamThem: { ...CAU_HINH.lamThem, cheDoBu: 'nghi_bu_va_chenh' },
      },
    });

    await service.tongHop('2026-06');

    expect(dongRepo.rows[0].theoLoai.ngay_le.heSo).toBe(2);
  });

  it('công ty CHƯA khai lamThem → không tạo dòng nào, không ném', async () => {
    const { service, dongRepo } = await dungService({
      don: [donOt()],
      cauHinh: { congChuan: 24 }, // không có lamThem
    });

    await expect(service.tongHop('2026-06')).resolves.toEqual([]);
    expect(dongRepo.rows).toHaveLength(0);
  });

  it('KHÔNG ghi đè dòng đã chốt', async () => {
    const { service, dongRepo } = await dungService({
      don: [donOt()],
      dong: [
        {
          _id: 'x1',
          thang: '2026-06',
          employeeId: NV._id,
          trangThai: 'chot',
          tongTien: 999,
          isActive: true,
        },
      ],
    });

    await service.tongHop('2026-06');

    expect(dongRepo.rows[0].tongTien).toBe(999);
  });

  it('KHÔNG ghi đè dòng kế toán đã sửa tay', async () => {
    const { service, dongRepo } = await dungService({
      don: [donOt()],
      dong: [
        {
          _id: 'x1',
          thang: '2026-06',
          employeeId: NV._id,
          trangThai: 'nhap',
          suaTay: true,
          tongTien: 777,
          isActive: true,
        },
      ],
    });

    await service.tongHop('2026-06');

    expect(dongRepo.rows[0].tongTien).toBe(777);
  });

  it('chạy lại KHÔNG tạo dòng thứ hai cho cùng {thang, employeeId}', async () => {
    const { service, dongRepo } = await dungService({ don: [donOt()] });

    await service.tongHop('2026-06');
    await service.tongHop('2026-06');

    expect(dongRepo.rows).toHaveLength(1);
  });
});

// ID phải là hex 24 ký tự: `capNhatDong()` dựng `new ObjectId(id)` trước khi
// chạm repo, và `ObjectId('x1')` ném BSONError chứ không trả null.
const ID_D1 = '650000000000000000000201';
const ID_D2 = '650000000000000000000202';

describe('ThemGio_Service — sửa tay và chốt kỳ', () => {
  const dongMau = (over: any = {}) => ({
    _id: ID_D1,
    thang: '2026-06',
    employeeId: NV._id,
    luongThang: 5_500_000,
    congChuan: 24,
    soGioMoiNgay: 8,
    donGiaNgay: 229_166.6667,
    donGiaGio: 28_645.8333,
    theoLoai: { ngay_thuong: { soGio: 35, heSo: 1.5, thanhTien: 1_503_906.25 } },
    tongTien: 1_503_906.25,
    gioNghiBu: 0,
    tienNghiBu: 0,
    thucNhan: 1_503_906.25,
    gioOtHetHan: 0,
    suaTay: false,
    trangThai: 'nhap',
    isActive: true,
    ...over,
  });

  it('sửa số giờ một loại → tính lại thành tiền, tổng và thực nhận', async () => {
    const { service } = await dungService({ dong: [dongMau()] });

    const kq = await service.capNhatDong(ID_D1, {
      theoLoai: { ngay_thuong: 10 },
    } as any);

    const g = 5_500_000 / 24 / 8;
    expect(kq.theoLoai.ngay_thuong.soGio).toBe(10);
    expect(kq.theoLoai.ngay_thuong.thanhTien).toBeCloseTo(10 * g * 1.5, 6);
    expect(kq.tongTien).toBeCloseTo(10 * g * 1.5, 6);
    expect(kq.thucNhan).toBeCloseTo(10 * g * 1.5, 6);
  });

  it('sửa tay bật cờ suaTay để tổng hợp lại không ghi đè', async () => {
    const { service } = await dungService({ dong: [dongMau()] });

    const kq = await service.capNhatDong(ID_D1, {
      theoLoai: { ngay_thuong: 10 },
    } as any);

    expect(kq.suaTay).toBe(true);
  });

  it('KHÔNG cho sửa dòng đã chốt', async () => {
    const { service } = await dungService({
      dong: [dongMau({ trangThai: 'chot' })],
    });

    await expect(
      service.capNhatDong(ID_D1, { theoLoai: { ngay_thuong: 10 } } as any),
    ).rejects.toThrow(/đã chốt/);
  });

  it('không tìm thấy dòng thì ném NotFound', async () => {
    const { service } = await dungService({ dong: [] });

    await expect(
      service.capNhatDong(ID_D1, { theoLoai: {} } as any),
    ).rejects.toThrow(/Không tìm thấy/);
  });

  it('chốt kỳ đổi mọi dòng nhap sang chot', async () => {
    const { service, dongRepo } = await dungService({
      dong: [dongMau({ _id: ID_D1 }), dongMau({ _id: ID_D2, employeeId: 'nv2' })],
    });

    await expect(service.chot('2026-06')).resolves.toEqual({ soDong: 2 });
    expect(dongRepo.rows.every((r: any) => r.trangThai === 'chot')).toBe(true);
  });

  it('mở lại kỳ đổi chot về nhap', async () => {
    const { service, dongRepo } = await dungService({
      dong: [dongMau({ trangThai: 'chot' })],
    });

    await expect(service.moLai('2026-06')).resolves.toEqual({ soDong: 1 });
    expect(dongRepo.rows[0].trangThai).toBe('nhap');
  });

  it('chốt kỳ KHÔNG đụng kỳ khác', async () => {
    const { service, dongRepo } = await dungService({
      dong: [dongMau({ _id: ID_D1 }), dongMau({ _id: ID_D2, thang: '2026-07' })],
    });

    await service.chot('2026-06');

    expect(dongRepo.rows.find((r: any) => r._id === ID_D2).trangThai).toBe('nhap');
  });

  it('danhSach trả đúng kỳ được hỏi', async () => {
    const { service } = await dungService({
      dong: [dongMau({ _id: ID_D1 }), dongMau({ _id: ID_D2, thang: '2026-07' })],
    });

    const ds = await service.danhSach('2026-06');
    expect(ds.map((d: any) => d._id)).toEqual([ID_D1]);
  });
});
