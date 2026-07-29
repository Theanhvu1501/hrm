import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BangCong_Service } from './bang-cong.service';
import {
  Timesheet,
  Employee,
  AttendanceRequest,
  AttendanceRecord,
  Holiday,
  Resignation,
} from '@app/entities';

// ────────────────────────────────────────────────────────────────────────────
// Repo giả dùng cho các describe cũ (findAll/update/setDay/findOne/remove/
// finalize) — không đụng tới generate() nên vẫn dùng khuôn mock đơn giản, chỉ
// bổ sung 3 repo mới (record/holiday/resignation) làm stub rỗng để thoả DI
// (constructor của service từ nay cần đủ 6 repo).
// ────────────────────────────────────────────────────────────────────────────
describe('BangCong_Service', () => {
  let service: BangCong_Service;
  let mockTimesheetRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockEmployeeRepo: {
    find: jest.Mock;
  };
  let mockRequestRepo: {
    find: jest.Mock;
  };

  let timesheetStore: Partial<Timesheet>[];
  let requestStore: Partial<AttendanceRequest>[];

  const EMP1 = '507f1f77bcf86cd799439011';
  const EMP2 = '507f1f77bcf86cd799439022';

  function matchesWhere(item: any, where: Record<string, any>): boolean {
    return Object.entries(where).every(([k, v]) => item[k] === v);
  }

  beforeEach(async () => {
    timesheetStore = [];
    requestStore = [];

    mockTimesheetRepo = {
      find: jest.fn(({ where }: any) =>
        Promise.resolve(
          timesheetStore.filter((t) => matchesWhere(t, where ?? {})),
        ),
      ),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => ({ ...v })),
      save: jest.fn((v) =>
        Promise.resolve({ ...v, _id: v._id ?? 'generated-timesheet-id' }),
      ),
    };

    mockEmployeeRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockRequestRepo = {
      find: jest.fn(({ where }: any) =>
        Promise.resolve(
          requestStore.filter((r) => matchesWhere(r, where ?? {})),
        ),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BangCong_Service,
        { provide: getRepositoryToken(Timesheet), useValue: mockTimesheetRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        {
          provide: getRepositoryToken(AttendanceRequest),
          useValue: mockRequestRepo,
        },
        // Stubs rỗng: các describe dưới đây không gọi generate() nên không
        // chạm tới 3 repo này, nhưng constructor cần đủ tham số để module
        // Nest resolve được.
        {
          provide: getRepositoryToken(AttendanceRecord),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(Holiday),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(Resignation),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get<BangCong_Service>(BangCong_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // finalize — chốt bảng công
  // ──────────────────────────────────────────────────────────────────────────
  describe('finalize', () => {
    it('sets trangThai to chot for every row of the given thang', async () => {
      timesheetStore = [
        {
          _id: 'row-1',
          thang: '2026-07',
          employeeId: EMP1,
          trangThai: 'nhap',
          isActive: true,
        },
        {
          _id: 'row-2',
          thang: '2026-07',
          employeeId: EMP2,
          trangThai: 'nhap',
          isActive: true,
        },
      ];

      const result = await service.finalize('2026-07');

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.trangThai === 'chot')).toBe(true);
      expect(mockTimesheetRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('filters by thang', async () => {
      await service.findAll({ thang: '2026-07' });

      expect(mockTimesheetRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, thang: '2026-07' },
      });
    });

    it('defaults isActive filter to true when no filter is given', async () => {
      await service.findAll();

      expect(mockTimesheetRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('filters by employeeId and trangThai', async () => {
      await service.findAll({ employeeId: EMP1, trangThai: 'chot' });

      expect(mockTimesheetRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, employeeId: EMP1, trangThai: 'chot' },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // update — sửa tay
  // ──────────────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('edits manual fields (soGioLamThem, soLanDiMuon, soLanVeSom, ghiChu) without touching chiTietNgay', async () => {
      const id = '507f1f77bcf86cd799439033';
      const existing = {
        _id: id,
        thang: '2026-07',
        employeeId: EMP1,
        chiTietNgay: [{ ngay: 1, kyHieu: 'X' }],
        soNgayCong: 1,
        soGioLamThem: 2,
        soLanDiMuon: 0,
        soLanVeSom: 0,
        trangThai: 'nhap',
        isActive: true,
      };
      mockTimesheetRepo.findOne.mockResolvedValue(existing);

      const result = await service.update(id, {
        soLanDiMuon: 2,
        ghiChu: 'Nghỉ phép 1 ngày',
      });

      expect(result.soLanDiMuon).toBe(2);
      expect(result.ghiChu).toBe('Nghỉ phép 1 ngày');
      // soNgayCong is untouched (still derived from the unchanged grid).
      expect(result.soNgayCong).toBe(1);
      expect(mockTimesheetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          soLanDiMuon: 2,
          ghiChu: 'Nghỉ phép 1 ngày',
        }),
      );
    });

    it('recomputes soNgayCong from a replaced chiTietNgay and ignores any soNgayCong sent in the dto', async () => {
      const id = '507f1f77bcf86cd799439034';
      const existing = {
        _id: id,
        thang: '2026-07',
        employeeId: EMP1,
        chiTietNgay: [{ ngay: 1, kyHieu: 'X' }],
        soNgayCong: 1,
        soGioLamThem: 0,
        soLanDiMuon: 0,
        soLanVeSom: 0,
        trangThai: 'nhap',
        isActive: true,
      };
      mockTimesheetRepo.findOne.mockResolvedValue(existing);

      const result = await service.update(id, {
        // Bogus/stale value — must be ignored; the real total is derived
        // from chiTietNgay below (20 × X + 1 × 1/2 = 20.5).
        soNgayCong: 999,
        chiTietNgay: [
          ...Array.from({ length: 20 }, (_, i) => ({
            ngay: i + 1,
            kyHieu: 'X',
          })),
          { ngay: 21, kyHieu: '1/2' },
        ],
      });

      expect(result.soNgayCong).toBe(20.5);
    });
  });

  describe('findOne — không tồn tại', () => {
    it('throws NotFoundException', async () => {
      mockTimesheetRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('507f1f77bcf86cd799439099')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // setDay — chấm công theo từng ngày (chi tiết ngày) + tự tính tổng công
  // ──────────────────────────────────────────────────────────────────────────
  describe('setDay', () => {
    const id = '507f1f77bcf86cd799439055';

    it('adds a cell and recompute derives soNgayCong (20×X + 1×1/2 = 20.5)', async () => {
      const existing = {
        _id: id,
        thang: '2026-07',
        employeeId: EMP1,
        chiTietNgay: Array.from({ length: 20 }, (_, i) => ({
          ngay: i + 1,
          kyHieu: 'X',
        })),
        soNgayCong: 20,
        isActive: true,
      };
      mockTimesheetRepo.findOne.mockResolvedValue(existing);

      const result = await service.setDay(id, { ngay: 21, kyHieu: '1/2' });

      expect(result.chiTietNgay).toHaveLength(21);
      expect(result.soNgayCong).toBe(20.5);
    });

    it('replaces the symbol for a day that already has one, instead of duplicating it', async () => {
      const existing = {
        _id: id,
        thang: '2026-07',
        employeeId: EMP1,
        chiTietNgay: [{ ngay: 5, kyHieu: 'X' }],
        soNgayCong: 1,
        isActive: true,
      };
      mockTimesheetRepo.findOne.mockResolvedValue(existing);

      const result = await service.setDay(id, { ngay: 5, kyHieu: '1/2' });

      expect(result.chiTietNgay).toEqual([{ ngay: 5, kyHieu: '1/2' }]);
      expect(result.soNgayCong).toBe(0.5);
    });

    it("'P'/'L'/'CT' count as full công (1 each), while 'KL'/'O' contribute 0 công but bump their own counters", async () => {
      const existing = {
        _id: id,
        thang: '2026-07',
        employeeId: EMP1,
        chiTietNgay: [
          { ngay: 1, kyHieu: 'P' },
          { ngay: 2, kyHieu: 'L' },
          { ngay: 3, kyHieu: 'CT' },
        ],
        soNgayCong: 3,
        isActive: true,
      };
      mockTimesheetRepo.findOne.mockResolvedValue(existing);

      // Add one KL day and one O day on top of the existing P/L/CT cells.
      // (mockTimesheetRepo.findOne always resolves the same `existing`
      // object, so the mutation from the first call is visible to the
      // second — same as how a real findOne→save round-trip would behave.)
      await service.setDay(id, { ngay: 4, kyHieu: 'KL' });
      const result = await service.setDay(id, { ngay: 5, kyHieu: 'O' });

      expect(result.soNgayCong).toBe(3); // P+L+CT = 1 each, KL/O = 0
      expect(result.soNgayNghiPhep).toBe(1);
      expect(result.soNgayNghiKhongLuong).toBe(1);
      expect(result.soNgayOm).toBe(1);
    });

    it('removes the day entry entirely when kyHieu is empty', async () => {
      const existing = {
        _id: id,
        thang: '2026-07',
        employeeId: EMP1,
        chiTietNgay: [
          { ngay: 1, kyHieu: 'X' },
          { ngay: 2, kyHieu: 'X' },
        ],
        soNgayCong: 2,
        isActive: true,
      };
      mockTimesheetRepo.findOne.mockResolvedValue(existing);

      const result = await service.setDay(id, { ngay: 1, kyHieu: '' });

      expect(result.chiTietNgay).toEqual([{ ngay: 2, kyHieu: 'X' }]);
      expect(result.soNgayCong).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // remove — soft delete
  // ──────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('sets isActive=false instead of hard deleting', async () => {
      const id = '507f1f77bcf86cd799439044';
      const existing = {
        _id: id,
        thang: '2026-07',
        employeeId: EMP1,
        isActive: true,
      };
      mockTimesheetRepo.findOne.mockResolvedValue(existing);

      await service.remove(id);

      expect(mockTimesheetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// generate() — P3.9: tự sinh ký hiệu. Khuôn repo giả trưởng thành, giống
// `quy-phep.service.spec.ts`: find/findOne trả BẢN SAO NÔNG (không phải tham
// chiếu sống trong `kho`), save xử lý cả insert lẫn update. Bản sao nông là
// điểm mấu chốt: nếu find trả thẳng tham chiếu, service có thể mutate object
// tại chỗ rồi QUÊN gọi save() mà mọi test vẫn xanh — vì đúng tham chiếu đó
// nằm trong `kho`. Đếm `soLanFind` để test "không truy vấn theo từng nhân
// viên" có ý nghĩa thật, không chỉ là mock trả rỗng.
// ────────────────────────────────────────────────────────────────────────────

/** Repo giả dùng chung cho mọi entity mà generate() đọc/ghi. */
function taoRepoGia<T extends { _id?: any }>(banDau: T[] = []) {
  const kho: any[] = [...banDau];
  let seq = 0;
  let soLanFindNoiBo = 0;
  return {
    kho,
    get soLanFind() {
      return soLanFindNoiBo;
    },
    create: (x: any) => ({ ...x }),
    save: async (x: any) => {
      if (!x._id) {
        seq += 1;
        x._id = { toString: () => seq.toString(16).padStart(24, '0') };
        kho.push(x);
        return x;
      }
      const idx = kho.findIndex((y) => String(y._id) === String(x._id));
      if (idx === -1) kho.push(x);
      else kho[idx] = x;
      return x;
    },
    // BẢN SAO NÔNG — xem giải thích ở đầu describe.
    find: async ({ where }: any = {}) => {
      soLanFindNoiBo += 1;
      return kho
        .filter((x) =>
          Object.entries(where ?? {}).every(([k, v]) => (x as any)[k] === v),
        )
        .map((x) => ({ ...x }));
    },
    findOne: async ({ where }: any) => {
      const x = kho.find((x) =>
        Object.entries(where ?? {}).every(
          ([k, v]) => String((x as any)[k]) === String(v),
        ),
      );
      return x ? { ...x } : null;
    },
  };
}

async function dungService(
  opts: {
    nhanVien?: any[];
    banGhi?: any[];
    don?: any[];
    bangCongCoSan?: any[];
    ngayLe?: any[];
    thoiViec?: any[];
  } = {},
) {
  const repoBc = taoRepoGia<any>(opts.bangCongCoSan ?? []);
  const repoNv = taoRepoGia<any>(opts.nhanVien ?? []);
  const repoDon = taoRepoGia<any>(opts.don ?? []);
  const repoBanGhi = taoRepoGia<any>(opts.banGhi ?? []);
  const repoLe = taoRepoGia<any>(opts.ngayLe ?? []);
  const repoThoiViec = taoRepoGia<any>(opts.thoiViec ?? []);

  const moduleRef = await Test.createTestingModule({
    providers: [
      BangCong_Service,
      { provide: getRepositoryToken(Timesheet), useValue: repoBc },
      { provide: getRepositoryToken(Employee), useValue: repoNv },
      { provide: getRepositoryToken(AttendanceRequest), useValue: repoDon },
      { provide: getRepositoryToken(AttendanceRecord), useValue: repoBanGhi },
      { provide: getRepositoryToken(Holiday), useValue: repoLe },
      { provide: getRepositoryToken(Resignation), useValue: repoThoiViec },
    ],
  }).compile();

  return {
    service: moduleRef.get<BangCong_Service>(BangCong_Service),
    repoBc,
    repoNv,
    repoDon,
    repoBanGhi,
    repoLe,
    repoThoiViec,
  };
}

// ID trong test PHẢI là chuỗi hex 24 ký tự: `findOne`/`save` so sánh qua
// `String(_id)`, và nơi khác trong codebase gọi thẳng `new ObjectId(id)`.
const NV1 = '650000000000000000000001';

const HO_SO_NV1 = {
  _id: { toString: () => NV1 },
  employeeId: 'NV0001',
  hoTen: 'Nguyễn Văn A',
  ngayVaoLam: '2020-01-01',
  ngayLamViecTrongTuan: [1, 2, 3, 4, 5, 6],
  trangThai: 'dang_lam_viec',
  isActive: true,
};

describe('BangCong_Service.generate — tự sinh ký hiệu (P3.9)', () => {
  it('điền X cho ngày có chấm công đủ vào/ra', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      banGhi: [
        { employeeId: NV1, ngay: '2026-08-03', loai: 'vao', isActive: true },
        { employeeId: NV1, ngay: '2026-08-03', loai: 'ra', isActive: true },
      ],
    });

    await service.generate('2026-08');

    const o = repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 3);
    expect(o).toMatchObject({ kyHieu: 'X', nguon: 'tu_dong' });
    expect(o.canhBao ?? []).toEqual([]);
  });

  it('điền P cho ngày có đơn nghỉ phép đã duyệt', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      don: [
        {
          employeeId: NV1,
          loaiDon: 'nghi_phep',
          loaiNghi: 'phep_nam',
          ngay: '2026-08-05',
          trangThai: 'da_duyet',
          isActive: true,
        },
      ],
    });

    await service.generate('2026-08');

    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 5)).toMatchObject({
      kyHieu: 'P',
      nguon: 'tu_dong',
    });
  });

  // RÀNG BUỘC QUAN TRỌNG NHẤT CỦA CẢ PLAN.
  it('KHÔNG đè ô HR đã sửa tay', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      banGhi: [{ employeeId: NV1, ngay: '2026-08-03', loai: 'vao', isActive: true }],
      bangCongCoSan: [
        {
          _id: { toString: () => 'bc1' },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [{ ngay: 3, kyHieu: 'CT', nguon: 'hr_sua' }],
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    await service.generate('2026-08');

    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 3)).toMatchObject({
      kyHieu: 'CT',
      nguon: 'hr_sua',
    });
  });

  // Review round 1: chỉ đọc code chưa đủ khẳng định — ô hr_sua được kiểm
  // NGUỒN trước khi suy nên suyKyHieuNgay() không bao giờ chạm tới ngày đó,
  // kể cả khi lịch làm việc trong tuần của NV đã đổi sau lúc HR tick.
  it('ô hr_sua sống sót cả khi lịch làm việc của NV đã đổi sau lúc tick', async () => {
    // NV giờ chỉ làm T2–T6, nhưng ô thứ Bảy đã được HR tick từ trước.
    // 2026-08-01 là thứ Bảy.
    const { service, repoBc } = await dungService({
      nhanVien: [{ ...HO_SO_NV1, ngayLamViecTrongTuan: [1, 2, 3, 4, 5] }],
      bangCongCoSan: [
        {
          _id: { toString: () => 'bc1' },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [{ ngay: 1, kyHieu: 'CT', nguon: 'hr_sua' }],
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    await service.generate('2026-08');

    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 1)).toMatchObject({
      kyHieu: 'CT',
      nguon: 'hr_sua',
    });
  });

  // Dữ liệu trước P3.9 không có `nguon` — phải được bảo vệ y như hr_sua, nếu
  // không lần tổng hợp đầu tiên sau deploy sẽ xoá công sức của nhiều tháng.
  it('KHÔNG đè ô cũ thiếu nguon', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      banGhi: [{ employeeId: NV1, ngay: '2026-08-03', loai: 'vao', isActive: true }],
      bangCongCoSan: [
        {
          _id: { toString: () => 'bc1' },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [{ ngay: 3, kyHieu: 'CT' }],
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    await service.generate('2026-08');

    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 3).kyHieu).toBe('CT');
  });

  // Review round 1: `oMoi` trước fix chỉ dựng từ vòng lặp `cacNgay` (1..N của
  // tháng thật) — ô hr_sua có `ngay` không khớp ngày nào của tháng (dữ liệu
  // bẩn, hoặc PATCH cũ từng lọt `ngay:31` vào một dòng tháng 2) không được
  // mang theo và biến mất khỏi lưới khi lưu, dù đó chính là ô spec gọi là
  // bất khả xâm phạm. T8/2026 có 31 ngày thật; test giả lập một ô hr_sua ở
  // `ngay: 45` — chắc chắn không khớp ngày nào của bất kỳ tháng nào.
  it('ô hr_sua có ngay ngoài số ngày thật của tháng vẫn được giữ, không bị xoá âm thầm', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [
        {
          _id: { toString: () => 'bc1' },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [{ ngay: 45, kyHieu: 'CT', nguon: 'hr_sua' }],
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    await service.generate('2026-08');

    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 45)).toMatchObject({
      kyHieu: 'CT',
      nguon: 'hr_sua',
    });
  });

  it('ĐÈ ô tu_dong khi căn cứ đã đổi', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      don: [
        {
          employeeId: NV1,
          loaiDon: 'nghi_phep',
          loaiNghi: 'phep_nam',
          ngay: '2026-08-03',
          trangThai: 'da_duyet',
          isActive: true,
        },
      ],
      bangCongCoSan: [
        {
          _id: { toString: () => 'bc1' },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [{ ngay: 3, kyHieu: 'X', nguon: 'tu_dong' }],
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    await service.generate('2026-08');

    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 3).kyHieu).toBe('P');
  });

  it('bỏ qua dòng đã chốt và báo lại trong tóm tắt', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      banGhi: [{ employeeId: NV1, ngay: '2026-08-03', loai: 'vao', isActive: true }],
      bangCongCoSan: [
        {
          _id: { toString: () => 'bc1' },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [],
          trangThai: 'chot',
          isActive: true,
        },
      ],
    });

    const tomTat = await service.generate('2026-08');

    expect(tomTat.soDongBoQuaVIChot).toBe(1);
    expect(repoBc.kho[0].chiTietNgay).toEqual([]);
  });

  it('đếm ô trống và ô cảnh báo vào cột của dòng', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      banGhi: [{ employeeId: NV1, ngay: '2026-08-03', loai: 'vao', isActive: true }],
    });

    await service.generate('2026-08');

    const dong = repoBc.kho[0];
    // T8/2026 có 26 ngày T2–T7; ngày 3 có chấm vào nên còn 25 ngày trống.
    expect(dong.soOTrong).toBe(25);
    // Ô ngày 3 mang cờ thiếu giờ ra; 25 ô trống mang cờ chưa xử lý.
    expect(dong.soOCanhBao).toBe(26);
  });

  it('tính lại số lượt đi muộn / về sớm từ bản ghi', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      banGhi: [
        { employeeId: NV1, ngay: '2026-08-03', loai: 'vao', soPhutDiMuon: 10, isActive: true },
        { employeeId: NV1, ngay: '2026-08-03', loai: 'ra', soPhutVeSom: 5, isActive: true },
        { employeeId: NV1, ngay: '2026-08-04', loai: 'vao', soPhutDiMuon: 2, isActive: true },
      ],
    });

    await service.generate('2026-08');

    expect(repoBc.kho[0]).toMatchObject({ soLanDiMuon: 2, soLanVeSom: 1 });
  });

  // Regression của describe cũ 'generate — cộng dồn giờ OT đã duyệt': hành vi
  // giữ nguyên (giờ OT đã duyệt được cộng vào soGioLamThem), chỉ đổi đường đi
  // — nay qua tongGioOt() (Task 3) thay vì sumApprovedOtHours() đã bị xoá.
  it('cộng giờ OT đã duyệt vào soGioLamThem', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      don: [
        {
          employeeId: NV1,
          loaiDon: 'lam_them_gio',
          trangThai: 'da_duyet',
          isActive: true,
          ngay: '2026-08-15',
          gioTu: '18:00',
          gioDen: '20:00',
        },
      ],
    });

    await service.generate('2026-08');

    expect(repoBc.kho[0].soGioLamThem).toBe(2);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Review round 1: duyệt thôi việc chỉ đổi Employee.trangThai, KHÔNG tắt
  // isActive — người đã nghỉ vẫn lọt vào employeeRepo.find({isActive:true})
  // mãi mãi. Nếu không tính đúng mốc kết thúc, mỗi tháng họ đẻ ra hai chục ô
  // "chưa xử lý" vĩnh viễn (thiếu ngayLamViecCuoi), hoặc tệ hơn — một hồ sơ
  // thôi việc cũ xử lý sau cùng âm thầm xoá trắng công của những ngày sau nó
  // mà KHÔNG cảnh báo gì (nhánh "ngoài khoảng làm việc" của suyKyHieuNgay trả
  // chuaXuLy: false).
  // ──────────────────────────────────────────────────────────────────────
  it('hồ sơ thôi việc thiếu ngayLamViecCuoi → rơi về ngayNopDon, không coi là làm việc mãi mãi', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      thoiViec: [
        {
          employeeId: NV1,
          trangThai: 'da_duyet',
          ngayNopDon: '2026-08-05',
          // Thiếu ngayLamViecCuoi — hồ sơ duyệt xong nhưng quên điền ngày.
          isActive: true,
        },
      ],
    });

    await service.generate('2026-08');

    // Không còn đẻ ~26 ô "chưa xử lý" vĩnh viễn: NV coi như nghỉ từ 05/08,
    // nên chỉ những ngày làm việc TỪ 1 đến 5/08 còn tính (sau đó để trống,
    // không cảnh báo — ngoài phạm vi làm việc, không phải lỗi dữ liệu).
    // T8/2026: 01(Bảy),03(Hai),04(Ba),05(Tư) là 4 ngày làm việc trong
    // khoảng 1–5/08 (02 là Chủ nhật, nghỉ theo lịch).
    expect(repoBc.kho[0].soOTrong).toBe(4);
  });

  it('nhiều hồ sơ thôi việc cho cùng một người → lấy ngày làm việc cuối MUỘN NHẤT', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      thoiViec: [
        // Hồ sơ NGÀY MUỘN HƠN đứng TRƯỚC trong mảng — nếu service còn lấy
        // "bản ghi cuối cùng gặp" (bug cũ, ghi đè vô điều kiện) thì ngày
        // 2026-08-05 (đứng sau) sẽ thắng nhầm và xoá trắng công từ 06/08 trở
        // đi mà không một cảnh báo nào.
        {
          employeeId: NV1,
          trangThai: 'da_duyet',
          ngayNopDon: '2026-07-01',
          ngayLamViecCuoi: '2026-08-20',
          isActive: true,
        },
        {
          employeeId: NV1,
          trangThai: 'da_duyet',
          ngayNopDon: '2026-07-01',
          ngayLamViecCuoi: '2026-08-05',
          isActive: true,
        },
      ],
    });

    await service.generate('2026-08');

    // T8/2026: Chủ nhật rơi vào 02, 09, 16 trong 20 ngày đầu (NV làm T2–T7)
    // → 20 - 3 = 17 ngày trống nếu mốc nghỉ thật sự là 20/08 (ngày muộn
    // nhất). Nếu bug cũ còn đó (lấy nhầm 05/08), con số này tụt xuống 4.
    expect(repoBc.kho[0].soOTrong).toBe(17);
  });

  it('không truy vấn thêm theo từng nhân viên', async () => {
    const { service, repoBc, repoBanGhi, repoDon } = await dungService({
      nhanVien: [HO_SO_NV1, { ...HO_SO_NV1, _id: { toString: () => '650000000000000000000002' } }],
    });

    await service.generate('2026-08');

    // Mỗi repo được hỏi đúng một lần cho cả tháng, bất kể bao nhiêu nhân viên.
    expect(repoBanGhi.soLanFind).toBe(1);
    expect(repoDon.soLanFind).toBe(1);
    expect(repoBc.soLanFind).toBe(1);
  });
});
