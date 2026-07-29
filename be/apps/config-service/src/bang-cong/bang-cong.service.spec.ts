import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BangCong_Service, MA_LOI_BANG_CONG } from './bang-cong.service';
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
    findOne: jest.Mock;
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
      // Task 5: setDay/update giờ đếm lại soOTrong sau mỗi lần lưu
      // (demLaiOTrong), việc đó cần tra hồ sơ nhân viên qua findOne — các
      // describe cũ (setDay/update) không quan tâm kết quả này nên trả null
      // là đủ, chỉ cần phương thức tồn tại để không throw.
      findOne: jest.fn().mockResolvedValue(null),
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

    // Finding L (review wave 2): trước bản vá, chốt một tháng KHÔNG có dòng
    // nào (chưa từng bấm "Tổng hợp bảng công") trả "thành công" với mảng
    // rỗng — dễ khiến HR tưởng nhầm tháng đã chốt xong.
    it('ném 409 khi tháng chưa có dòng bảng công nào', async () => {
      timesheetStore = [];

      const loi = await service.finalize('2026-07').catch((e) => e);

      expect(loi).toBeInstanceOf(ConflictException);
      expect((loi as any).getResponse().code).toBe(
        MA_LOI_BANG_CONG.CHUA_CO_BANG_CONG,
      );
      expect(mockTimesheetRepo.save).not.toHaveBeenCalled();
    });

    // Finding L: chốt lại một tháng đã chốt toàn bộ (vd bấm nhầm lần 2)
    // không được ghi lại từng dòng vô ích — dòng đã 'chot' không đổi gì.
    it('không ghi lại dòng đã chốt sẵn khi chốt lại một tháng đã chốt', async () => {
      timesheetStore = [
        {
          _id: 'row-1',
          thang: '2026-07',
          employeeId: EMP1,
          trangThai: 'chot',
          soOTrong: 0,
          isActive: true,
        },
      ];

      const result = await service.finalize('2026-07');

      expect(result).toHaveLength(1);
      expect(result[0].trangThai).toBe('chot');
      expect(mockTimesheetRepo.save).not.toHaveBeenCalled();
    });

    // Vẫn phải chốt được các dòng CHƯA chốt nằm CHUNG tháng với dòng đã chốt
    // sẵn (vd generate() vừa tạo thêm dòng cho NV mới) — chỉ bỏ qua đúng dòng
    // đã 'chot', không bỏ qua cả thao tác.
    it('vẫn chốt dòng chưa chốt khi tháng có lẫn dòng đã chốt sẵn', async () => {
      timesheetStore = [
        {
          _id: 'row-1',
          thang: '2026-07',
          employeeId: EMP1,
          trangThai: 'chot',
          soOTrong: 0,
          isActive: true,
        },
        {
          _id: 'row-2',
          thang: '2026-07',
          employeeId: EMP2,
          trangThai: 'nhap',
          soOTrong: 0,
          isActive: true,
        },
      ];

      const result = await service.finalize('2026-07');

      expect(result.every((r) => r.trangThai === 'chot')).toBe(true);
      expect(mockTimesheetRepo.save).toHaveBeenCalledTimes(1);
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
    // Finding E (review wave 2): soLanDiMuon/soLanVeSom KHÔNG còn ở đây —
    // spec §5.3 đã chuyển hai cột này sang tự tính (xem test
    // "tính lại số lượt đi muộn / về sớm từ bản ghi" ở describe generate()
    // bên dưới), và `UpdateTimesheetDto` không còn khai hai trường này (xem
    // `update-timesheet.dto.spec.ts` — client gửi lên bị 400 luôn ở tầng
    // validate, không lọt được tới đây).
    it('edits manual fields (soGioLamThem, ghiChu) without touching chiTietNgay', async () => {
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
        soGioLamThem: 5,
        ghiChu: 'Nghỉ phép 1 ngày',
      });

      expect(result.soGioLamThem).toBe(5);
      expect(result.ghiChu).toBe('Nghỉ phép 1 ngày');
      // soLanDiMuon is untouched — update() no longer accepts it.
      expect(result.soLanDiMuon).toBe(0);
      // soNgayCong is untouched (still derived from the unchanged grid).
      expect(result.soNgayCong).toBe(1);
      expect(mockTimesheetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          soGioLamThem: 5,
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

      // Task 5: mọi ô HR gõ qua setDay() giờ mang dấu nguon: 'hr_sua' — xem
      // describe 'BangCong_Service.setDay — nguồn ô và chốt (P3.9)' bên dưới.
      expect(result.chiTietNgay).toEqual([{ ngay: 5, kyHieu: '1/2', nguon: 'hr_sua' }]);
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
/**
 * So một giá trị thực với một điều kiện trong `where`. Điều kiện có thể là
 * giá trị trần (so bằng, khuôn cũ) hoặc toán tử Mongo thô (`{ $gte, $lte,
 * ... }`) — review round 2 khiến `generate()` gửi thẳng
 * `{ ngay: { $gte, $lte } }` xuống `recordRepo.find` (xem
 * `bang-cong.service.ts`, driver Mongo ở đây không dịch `Between` của
 * TypeORM). Repo giả PHẢI hiểu dạng này, nếu không mọi test đưa `banGhi` vào
 * `dungService` sẽ âm thầm không match được gì (so một chuỗi với một object
 * luôn ra `false`) và ca "điền X/P/..." sẽ đỏ hết dù service đúng.
 */
function khopGiaTri(giaTriThuc: any, dieuKien: any): boolean {
  if (dieuKien && typeof dieuKien === 'object' && !Array.isArray(dieuKien)) {
    return Object.entries(dieuKien).every(([toanTu, v]) => {
      switch (toanTu) {
        case '$gte':
          return giaTriThuc >= v;
        case '$lte':
          return giaTriThuc <= v;
        case '$gt':
          return giaTriThuc > v;
        case '$lt':
          return giaTriThuc < v;
        case '$in':
          return (v as any[]).includes(giaTriThuc);
        default:
          // Toán tử lạ chưa hỗ trợ trong repo giả — thà báo không khớp còn
          // hơn âm thầm coi là khớp.
          return false;
      }
    });
  }
  return giaTriThuc === dieuKien;
}

function taoRepoGia<T extends { _id?: any }>(banDau: T[] = []) {
  const kho: any[] = [...banDau];
  let seq = 0;
  let soLanFindNoiBo = 0;
  let lanFindCuoiNoiBo: any = undefined;
  const moiLanFindNoiBo: any[] = [];
  return {
    kho,
    get soLanFind() {
      return soLanFindNoiBo;
    },
    // Tham số ĐẦY ĐỦ của lần gọi `find` gần nhất — để test khoá được HÌNH
    // DẠNG truy vấn (vd `where.ngay` có đúng `$gte`/`$lte` của tháng hay
    // không), không chỉ số lần gọi.
    get lanFindCuoi() {
      return lanFindCuoiNoiBo;
    },
    // TOÀN BỘ tham số của MỌI lần gọi `find`, không chỉ lần cuối —
    // `setDay({veTuDong:true})` gọi `find` trên cùng repo này HAI LẦN
    // (suyLaiMotNgay() rồi demLaiOTrong()); nếu chỉ khoá lần cuối thì một
    // trong hai đường không chặn khoảng ngày vẫn lọt qua test không phát hiện
    // được (đường sau che đường trước).
    get moiLanFind() {
      return moiLanFindNoiBo;
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
    find: async (options: any = {}) => {
      soLanFindNoiBo += 1;
      lanFindCuoiNoiBo = options;
      moiLanFindNoiBo.push(options);
      const { where } = options;
      return kho
        .filter((x) =>
          Object.entries(where ?? {}).every(([k, v]) =>
            khopGiaTri((x as any)[k], v),
          ),
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

  // CRITICAL A: `ngayLamViecCuoi` optional, HR duyệt để trống là đường mặc
  // định — rơi về `ngayNopDon` (thường sớm hơn ngày thật sự nghỉ, vì NV còn
  // đi làm suốt thời gian báo trước). Trước bản vá này, chấm công SAU mốc
  // đó biến mất không dấu vết (chuaXuLy: false) — bản vá phải làm nó LOUD:
  // đếm vào soOTrong để chặn chốt, không phải chọn thay HR.
  it('có chấm công SAU mốc ngayNopDon (thiếu ngayLamViecCuoi) → tính vào ô chưa xử lý, không im lặng biến mất', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [{ ...HO_SO_NV1, ngayVaoLam: '2026-08-01' }],
      banGhi: [
        // Trong khoảng (≤ mốc nghỉ) — công bình thường, không liên quan.
        { employeeId: NV1, ngay: '2026-08-01', loai: 'vao', isActive: true },
        { employeeId: NV1, ngay: '2026-08-01', loai: 'ra', isActive: true },
        // SAU mốc ngayNopDon (2026-08-01) — bằng chứng thật của một người
        // vẫn đang đi làm trong thời gian báo trước.
        { employeeId: NV1, ngay: '2026-08-05', loai: 'vao', isActive: true },
      ],
      thoiViec: [
        {
          employeeId: NV1,
          trangThai: 'da_duyet',
          ngayNopDon: '2026-08-01',
          // Thiếu ngayLamViecCuoi — đường mặc định khi duyệt thôi việc.
          isActive: true,
        },
      ],
    });

    await service.generate('2026-08');

    // Chỉ đúng MỘT ngày (08-05) rơi vào diện "có bằng chứng sau ngày nghỉ" —
    // mọi ngày khác sau mốc không có bản ghi nào nên vẫn im lặng như cũ.
    expect(repoBc.kho[0].soOTrong).toBe(1);
  });

  // IMPORTANT C: NV bị soft-delete SAU khi đã có dòng bảng công tháng này
  // (isActive=false → không còn trong employeeRepo.find({isActive:true})).
  // generate() chỉ lặp qua NV đang hoạt động nên KHÔNG BAO GIỜ quay lại dòng
  // này để tính lại soOTrong — mà finalize() đọc mọi dòng active của tháng
  // bất kể NV còn hay không, nên dòng "mồ côi" còn soOTrong > 0 sẽ chặn chốt
  // vĩnh viễn, không có UI nào sửa được ngoài xoá tay.
  it('dòng mồ côi (NV không còn hoạt động) được dọn về 0 ô trống, báo lại số dòng đã dọn', async () => {
    const NV_DA_NGHI = '650000000000000000000099';
    const { service, repoBc } = await dungService({
      // NV_DA_NGHI KHÔNG có mặt trong danh sách NV đang hoạt động.
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [
        {
          _id: { toString: () => 'bc-nv1' },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [],
          trangThai: 'nhap',
          isActive: true,
        },
        {
          _id: { toString: () => 'bc-mo-coi' },
          thang: '2026-08',
          employeeId: NV_DA_NGHI,
          chiTietNgay: [],
          soOTrong: 5,
          soOCanhBao: 2,
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    const tomTat = await service.generate('2026-08');

    const dongMoCoi = repoBc.kho.find((d: any) => d.employeeId === NV_DA_NGHI);
    expect(dongMoCoi.soOTrong).toBe(0);
    expect(dongMoCoi.soOCanhBao).toBe(0);
    expect(tomTat.soDongMoCoi).toBe(1);
  });

  it('dòng mồ côi đã chốt thì không đụng vào — khoá có chủ ý, không phải việc của generate()', async () => {
    const NV_DA_NGHI = '650000000000000000000099';
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [
        {
          _id: { toString: () => 'bc-mo-coi-chot' },
          thang: '2026-08',
          employeeId: NV_DA_NGHI,
          chiTietNgay: [],
          soOTrong: 5,
          trangThai: 'chot',
          isActive: true,
        },
      ],
    });

    const tomTat = await service.generate('2026-08');

    expect(repoBc.kho[0].soOTrong).toBe(5);
    expect(repoBc.kho[0].trangThai).toBe('chot');
    expect(tomTat.soDongMoCoi).toBe(0);
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

  // Review round 2: `attendance_records` ghi MỘT DÒNG MỖI LƯỢT BẤM — 200
  // nhân viên × 2 lượt × 26 ngày ≈ 10 nghìn dòng MỖI THÁNG. Không chặn theo
  // khoảng ngày ở tầng truy vấn thì mỗi lần bấm "Tổng hợp" nạp cả lịch sử
  // chấm công của công ty vào bộ nhớ Node để dùng đúng một tháng. Khoá hình
  // dạng truy vấn thật, không chỉ số lần gọi — nếu ai đó sau này bỏ bộ chặn
  // đi (vô tình đổi lại `{ where: { isActive: true } }` như code cũ), test
  // này đỏ ngay dù `soLanFind` vẫn đúng là 1.
  it('chặn khoảng ngày ngay ở tầng truy vấn, không nạp cả bảng chấm công', async () => {
    const { service, repoBanGhi } = await dungService({ nhanVien: [HO_SO_NV1] });

    await service.generate('2026-08');

    const where = repoBanGhi.lanFindCuoi?.where ?? {};
    expect(where.ngay).toEqual({ $gte: '2026-08-01', $lte: '2026-08-31' });
  });
});

// `findOne()`/`setDay()`/`update()` chạy `new ObjectId(id)` thật trên tham số
// id trước khi hỏi repo — không như `_id: { toString: () => 'bc1' }` của các
// fixture generate() ở trên (không đi qua findOne nên chuỗi ngắn vô hại), ở
// đây id phải là hex 24 ký tự thật, cùng quy ước ID_NV1/ID_Q2026 của
// quy-phep.service.spec.ts.
const ID_BC1 = '650000000000000000000bc1';

describe('BangCong_Service.setDay — nguồn ô và chốt (P3.9)', () => {
  it('HR sửa một ô thì ô đó thành hr_sua và mất cảnh báo', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [
        {
          _id: { toString: () => ID_BC1 },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [{ ngay: 3, kyHieu: 'X', nguon: 'tu_dong', canhBao: ['thieu_gio_ra'] }],
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    await service.setDay(ID_BC1, { ngay: 3, kyHieu: 'CT' } as any);

    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 3)).toMatchObject({
      kyHieu: 'CT',
      nguon: 'hr_sua',
    });
    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 3).canhBao ?? []).toEqual([]);
  });

  it('xoá ký hiệu vẫn đếm lại ô trống', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [
        {
          _id: { toString: () => ID_BC1 },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [{ ngay: 3, kyHieu: 'X', nguon: 'tu_dong' }],
          soOTrong: 0,
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    await service.setDay(ID_BC1, { ngay: 3, kyHieu: '' } as any);

    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 3)).toBeUndefined();
    expect(repoBc.kho[0].soOTrong).toBeGreaterThan(0);
  });

  it('trả ô về tự động thì ô quay lại giá trị máy suy ra', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      banGhi: [
        { employeeId: NV1, ngay: '2026-08-03', loai: 'vao', isActive: true },
        { employeeId: NV1, ngay: '2026-08-03', loai: 'ra', isActive: true },
      ],
      bangCongCoSan: [
        {
          _id: { toString: () => ID_BC1 },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [{ ngay: 3, kyHieu: 'CT', nguon: 'hr_sua' }],
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    await service.setDay(ID_BC1, { ngay: 3, kyHieu: '', veTuDong: true } as any);

    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 3)).toMatchObject({
      kyHieu: 'X',
      nguon: 'tu_dong',
    });
  });

  // Finding G: suyLaiMotNgay() nạp TOÀN BỘ lịch sử chấm công của một NV để
  // suy lại đúng MỘT ngày — bên cạnh nó, demLaiOTrong() đã chặn khoảng ngày
  // theo tháng từ trước. Không chặn giống nhau thì "Trả về tự động" trên một
  // NV lâu năm quét cả nghìn bản ghi chỉ để dùng đúng một ngày.
  it('trả về tự động chặn khoảng ngày theo tháng ở tầng truy vấn, không nạp cả lịch sử chấm công', async () => {
    const { service, repoBanGhi } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [
        {
          _id: { toString: () => ID_BC1 },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [{ ngay: 3, kyHieu: 'CT', nguon: 'hr_sua' }],
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    await service.setDay(ID_BC1, { ngay: 3, kyHieu: '', veTuDong: true } as any);

    // `setDay({veTuDong:true})` gọi recordRepo.find HAI LẦN trên cùng dòng
    // này (suyLaiMotNgay() rồi demLaiOTrong()) — cả hai đều phải chặn khoảng
    // ngày theo tháng, không chỉ đường chạy sau cùng.
    expect(repoBanGhi.moiLanFind.length).toBeGreaterThanOrEqual(2);
    for (const lan of repoBanGhi.moiLanFind) {
      expect(lan.where?.ngay).toEqual({ $gte: '2026-08-01', $lte: '2026-08-31' });
    }
  });

  // Review Task 5: suyLaiMotNgay()/demLaiOTrong() ban đầu chọn hồ sơ thôi
  // việc bằng `thoiViec.find(...)` — LẤY PHẦN TỬ KHỚP ĐẦU TIÊN theo thứ tự
  // mảng, đúng lỗi generate() đã vá ở Task 4 review round 1. NV nghỉ lần 1
  // (08-05) rồi được tuyển lại rồi nghỉ lần 2 (08-20): hồ sơ 08-05 CỐ Ý đứng
  // TRƯỚC trong mảng — đây là thứ tự duy nhất khiến `.find()` trả nhầm hồ sơ
  // cũ (không giống test "MUỘN NHẤT" của generate() ở trên: đó là bug của
  // một vòng lặp ghi-đè-vô-điều-kiện, thứ tự ngược lại mới lộ bug; đây là bug
  // của `.find()` chọn theo VỊ TRÍ, đứng trước là lộ bug). Nếu bắt phải hồ sơ
  // 08-05, ngày 08-10 (nằm giữa hai mốc, tức vẫn đang đi làm thật) sẽ bị coi
  // là ngoài khoảng làm việc — "trả về tự động" sẽ để ô trống thay vì điền
  // đúng ký hiệu X.
  it('nhiều hồ sơ thôi việc cho cùng một người → veTuDong dùng ngày MUỘN NHẤT, không coi ngày giữa hai mốc là ngoài khoảng làm việc', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      banGhi: [
        { employeeId: NV1, ngay: '2026-08-10', loai: 'vao', isActive: true },
        { employeeId: NV1, ngay: '2026-08-10', loai: 'ra', isActive: true },
      ],
      thoiViec: [
        {
          employeeId: NV1,
          trangThai: 'da_duyet',
          ngayNopDon: '2026-06-01',
          ngayLamViecCuoi: '2026-08-05',
          isActive: true,
        },
        {
          employeeId: NV1,
          trangThai: 'da_duyet',
          ngayNopDon: '2026-07-01',
          ngayLamViecCuoi: '2026-08-20',
          isActive: true,
        },
      ],
      bangCongCoSan: [
        {
          _id: { toString: () => ID_BC1 },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [],
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    await service.setDay(ID_BC1, { ngay: 10, kyHieu: '', veTuDong: true } as any);

    expect(repoBc.kho[0].chiTietNgay.find((c: any) => c.ngay === 10)).toMatchObject({
      kyHieu: 'X',
      nguon: 'tu_dong',
    });
  });

  // Lỗ hổng sẵn có trước P3.9: finalize() đặt cờ chot nhưng setDay/update
  // không kiểm gì, nên bảng công đã tính lương vẫn sửa được mà không ai biết.
  it('dòng đã chốt thì setDay ném 409', async () => {
    const { service } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [
        {
          _id: { toString: () => ID_BC1 },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [],
          trangThai: 'chot',
          isActive: true,
        },
      ],
    });

    const loi = await service
      .setDay(ID_BC1, { ngay: 3, kyHieu: 'X' } as any)
      .catch((e) => e);

    expect(loi).toBeInstanceOf(ConflictException);
    // Không chỉ đúng LOẠI lỗi — "mã lỗi có tên" là deliverable của task này;
    // thiếu khẳng định này thì ai đó xoá `code` khỏi ConflictException vẫn
    // qua được test.
    expect((loi as any).getResponse().code).toBe(MA_LOI_BANG_CONG.BANG_CONG_DA_CHOT);
  });

  it('dòng đã chốt thì update ném 409', async () => {
    const { service } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [
        {
          _id: { toString: () => ID_BC1 },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [],
          trangThai: 'chot',
          isActive: true,
        },
      ],
    });

    const loi = await service
      .update(ID_BC1, { ghiChu: 'sửa lén' } as any)
      .catch((e) => e);

    expect(loi).toBeInstanceOf(ConflictException);
    expect((loi as any).getResponse().code).toBe(MA_LOI_BANG_CONG.BANG_CONG_DA_CHOT);
  });

  // Review Task 4: recompute() không đụng soOTrong/soOCanhBao — chỉ
  // generate() từng nuôi hai cột này. update() thay được cả mảng chiTietNgay
  // (PUT nguyên khối), nên nếu chỉ setDay() gọi demLaiOTrong() thì HR lấp đủ
  // ô qua PUT mà cột "ô trống" vẫn đứng yên vĩnh viễn, và nút Chốt ở Task 6
  // (gác bởi soOTrong > 0) sẽ không bao giờ mở dù bảng công đã đầy thật.
  it('update thay cả chiTietNgay cũng đếm lại ô trống', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [
        {
          _id: { toString: () => ID_BC1 },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [{ ngay: 3, kyHieu: 'X', nguon: 'tu_dong' }],
          soOTrong: 0,
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    // Xoá trắng lưới qua update() — không có bản ghi chấm công nào để suy ra
    // ký hiệu, nên mọi ngày làm việc trong tháng đều rơi vào "chưa xử lý".
    await service.update(ID_BC1, { chiTietNgay: [] } as any);

    expect(repoBc.kho[0].soOTrong).toBeGreaterThan(0);
  });

  // Review Task 5 minor #2: soOCanhBao trước bản vá chỉ cộng cảnh báo của ô
  // ĐÃ CÓ trong chiTietNgay cộng với soOTrong — bỏ sót cảnh báo của những
  // ngày CHƯA có ô nhưng máy suy ra được ký hiệu kèm cờ (chuaXuLy: false,
  // không phải "ô trống"). Ca cụ thể: chấm vào không chấm ra.
  //
  // Thu hẹp phạm vi làm việc còn đúng MỘT ngày (ngayVaoLam = ngayLamViecCuoi
  // = 10/08) để mọi ngày khác trong tháng đều "ngoài phạm vi" (không cảnh
  // báo) — nhờ vậy soOCanhBao đo được CHỈ RIÊNG cảnh báo của ngày 10/08, tách
  // bạch khỏi nhiễu của soOTrong.
  it('demLaiOTrong đếm cảnh báo của ngày có ký hiệu nhưng thiếu giờ ra, không chỉ ngày trống', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [{ ...HO_SO_NV1, ngayVaoLam: '2026-08-10' }],
      banGhi: [{ employeeId: NV1, ngay: '2026-08-10', loai: 'vao', isActive: true }],
      thoiViec: [
        {
          employeeId: NV1,
          trangThai: 'da_duyet',
          ngayNopDon: '2026-08-10',
          ngayLamViecCuoi: '2026-08-10',
          isActive: true,
        },
      ],
      bangCongCoSan: [
        {
          _id: { toString: () => ID_BC1 },
          thang: '2026-08',
          employeeId: NV1,
          chiTietNgay: [],
          soOTrong: 0,
          soOCanhBao: 0,
          trangThai: 'nhap',
          isActive: true,
        },
      ],
    });

    // ghiChu-only update vẫn kích hoạt demLaiOTrong() (gọi vô điều kiện).
    await service.update(ID_BC1, { ghiChu: 'kích hoạt demLaiOTrong' } as any);

    // Ngày 10/08 có kyHieu suy ra được (X) nên KHÔNG phải ô trống — soOTrong
    // vẫn 0 — nhưng vẫn phải lên cảnh báo vì thiếu giờ ra.
    expect(repoBc.kho[0].soOTrong).toBe(0);
    expect(repoBc.kho[0].soOCanhBao).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// finalize / moLai (P3.9 Task 6) — chốt bảng công phải chặn khi còn ô trống,
// và cho phép mở lại một cách CÓ CHỦ Ý (khác lỗ hổng cũ: sửa lén một ô sau khi
// đã chốt mà không ai biết kỳ lương đã tính theo con số cũ).
// ──────────────────────────────────────────────────────────────────────────
describe('BangCong_Service.finalize / moLai (P3.9)', () => {
  // Đếm riêng cho mỗi test (đặt trong describe, reset ngầm mỗi describe chạy
  // lại module) để `_id` LUÔN duy nhất — dongCo(0), dongCo(0) trong cùng một
  // test (hai dòng "hết ô trống") có cùng soOTrong/trangThai, nên nếu id chỉ
  // ghép từ hai tham số đó thì hai dòng trùng `_id`, và `save()` của repo giả
  // (so khớp qua `String(_id)`) sẽ âm thầm ghi đè dòng đầu hai lần thay vì
  // cập nhật đúng từng dòng — che luôn service đúng dưới một lỗi fixture.
  let demDongCo = 0;
  function dongCo(soOTrong: number, trangThai = 'nhap') {
    demDongCo += 1;
    // `id` PHẢI chốt vào một const cục bộ ngay tại đây — nếu closure của
    // `toString` đọc thẳng biến `demDongCo` (biến ngoài, còn thay đổi sau đó)
    // thì mọi `_id` sẽ cùng trỏ về giá trị CUỐI CÙNG của bộ đếm tại thời điểm
    // `toString()` thật sự được gọi (lúc `save()` so sánh id), không phải giá
    // trị lúc `dongCo()` được tạo — quay lại đúng lỗi trùng `_id` ban đầu.
    const id = `bc-${soOTrong}-${trangThai}-${demDongCo}`;
    return {
      _id: { toString: () => id },
      thang: '2026-08',
      employeeId: NV1,
      chiTietNgay: [],
      soOTrong,
      trangThai,
      isActive: true,
    };
  }

  it('còn ô trống thì chốt bị chặn 409 và không dòng nào đổi trạng thái', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [dongCo(0), dongCo(3)],
    });

    const loi = await service.finalize('2026-08').catch((e) => e);

    expect(loi).toBeInstanceOf(ConflictException);
    // Không chỉ đúng LOẠI lỗi — bài học từ review Task 5: thiếu khẳng định
    // `code` thì ai đó xoá trường này khỏi ConflictException vẫn qua test.
    expect((loi as any).getResponse().code).toBe(MA_LOI_BANG_CONG.CON_O_CHUA_XU_LY);
    expect(repoBc.kho.every((d: any) => d.trangThai === 'nhap')).toBe(true);
  });

  it('hết ô trống thì chốt được', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [dongCo(0), dongCo(0)],
    });

    await service.finalize('2026-08');

    expect(repoBc.kho.every((d: any) => d.trangThai === 'chot')).toBe(true);
  });

  it('moLai đưa dòng đã chốt về nhap và đếm đúng', async () => {
    const { service, repoBc } = await dungService({
      nhanVien: [HO_SO_NV1],
      bangCongCoSan: [dongCo(0, 'chot'), dongCo(0, 'nhap')],
    });

    const so = await service.moLai('2026-08');

    expect(so).toBe(1);
    expect(repoBc.kho.every((d: any) => d.trangThai === 'nhap')).toBe(true);
  });
});
