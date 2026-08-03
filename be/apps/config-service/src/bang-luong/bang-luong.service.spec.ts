import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { BangLuong_Service } from './bang-luong.service';
import {
  AttendanceRequest,
  CauHinhLuong,
  DongLuong,
  Employee,
  Timesheet,
} from '@app/entities';
import type { CauHinhLuongData } from '@app/entities';
import { ganCauHinhRieng, lamTronTheo, tinhDongLuong } from '@app/core';
import { CAU_HINH_LUONG_MAC_DINH } from './cau-hinh-luong.seed';

describe('BangLuong_Service', () => {
  let service: BangLuong_Service;

  let mockCauHinhRepo: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockDongLuongRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockEmployeeRepo: {
    find: jest.Mock;
  };
  let mockTimesheetRepo: {
    find: jest.Mock;
  };
  let mockDonRepo: {
    find: jest.Mock;
  };

  // In-memory stores backing the mocked `find` calls — a `where` filter is
  // applied against these arrays so tests can assert on genuine filtering
  // behaviour, not just on what arguments the service happened to pass.
  let cauHinhStore: Partial<CauHinhLuong>[];
  let dongLuongStore: Partial<DongLuong>[];
  let timesheetStore: Partial<Timesheet>[];
  let donStore: any[];

  const EMP1 = '507f1f77bcf86cd799439011';
  const EMP2 = '507f1f77bcf86cd799439022';

  function matchesWhere(item: any, where: Record<string, any>): boolean {
    return Object.entries(where).every(([k, v]) => item[k] === v);
  }

  beforeEach(async () => {
    cauHinhStore = [];
    dongLuongStore = [];
    timesheetStore = [];
    donStore = [];

    mockCauHinhRepo = {
      find: jest.fn(({ where }: any) =>
        Promise.resolve(cauHinhStore.filter((c) => matchesWhere(c, where ?? {}))),
      ),
      create: jest.fn((v) => ({ ...v })),
      save: jest.fn((v) =>
        Promise.resolve({ ...v, _id: v._id ?? 'generated-cauhinh-id' }),
      ),
    };

    mockDongLuongRepo = {
      find: jest.fn(({ where }: any) =>
        Promise.resolve(dongLuongStore.filter((d) => matchesWhere(d, where ?? {}))),
      ),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => ({ ...v })),
      // Actually persists into `dongLuongStore` (push new / replace by _id) so
      // tests can call `tongHop` twice in a row and observe real upsert
      // behaviour (no duplicate row, updated fields) — a plain "echo back"
      // mock (as bang-cong's spec uses) isn't enough for that assertion.
      save: jest.fn((v) => {
        const saved = { ...v, _id: v._id ?? `generated-dongluong-id-${dongLuongStore.length + 1}` };
        const idx = dongLuongStore.findIndex((d) => d._id === saved._id);
        if (idx >= 0) dongLuongStore[idx] = saved;
        else dongLuongStore.push(saved);
        return Promise.resolve(saved);
      }),
    };

    mockEmployeeRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockDonRepo = {
      find: jest.fn(({ where }: any = {}) =>
        Promise.resolve(donStore.filter((d) => matchesWhere(d, where ?? {}))),
      ),
    };

    mockTimesheetRepo = {
      find: jest.fn(({ where }: any) =>
        Promise.resolve(timesheetStore.filter((t) => matchesWhere(t, where ?? {}))),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BangLuong_Service,
        { provide: getRepositoryToken(CauHinhLuong), useValue: mockCauHinhRepo },
        { provide: getRepositoryToken(DongLuong), useValue: mockDongLuongRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(Timesheet), useValue: mockTimesheetRepo },
        { provide: getRepositoryToken(AttendanceRequest), useValue: mockDonRepo },
      ],
    }).compile();

    service = module.get<BangLuong_Service>(BangLuong_Service);
  });

  function seedCauHinh(): void {
    cauHinhStore.push({
      _id: 'ch-1',
      ...(CAU_HINH_LUONG_MAC_DINH as any),
      isActive: true,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // layCauHinh — đọc / auto-seed cấu hình mặc định
  // ──────────────────────────────────────────────────────────────────────────
  describe('layCauHinh', () => {
    it('chưa có bản ghi nào → tự tạo bản mặc định (seed) rồi trả về', async () => {
      const result = await service.layCauHinh();

      expect(mockCauHinhRepo.create).toHaveBeenCalledTimes(1);
      expect(mockCauHinhRepo.save).toHaveBeenCalledTimes(1);
      expect(result.mucKhaiBaoMacDinh).toBe(
        CAU_HINH_LUONG_MAC_DINH.mucKhaiBaoMacDinh,
      );
      expect(result.khoanLuong).toEqual(CAU_HINH_LUONG_MAC_DINH.khoanLuong);
      expect(result.bacThue).toEqual(CAU_HINH_LUONG_MAC_DINH.bacThue);
      expect((result as any).isActive).toBe(true);
    });

    it('đã có bản ghi active → trả về bản đó, không tạo thêm', async () => {
      seedCauHinh();

      const result = await service.layCauHinh();

      expect(mockCauHinhRepo.create).not.toHaveBeenCalled();
      expect(mockCauHinhRepo.save).not.toHaveBeenCalled();
      expect((result as any)._id).toBe('ch-1');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // capNhatCauHinh — sửa cấu hình
  // ──────────────────────────────────────────────────────────────────────────
  describe('capNhatCauHinh', () => {
    it('gộp dto vào bản ghi hiện có rồi lưu', async () => {
      seedCauHinh();

      const result = await service.capNhatCauHinh({ mucKhaiBaoMacDinh: 6_000_000 });

      expect(result.mucKhaiBaoMacDinh).toBe(6_000_000);
      // các trường khác giữ nguyên
      expect(result.congChuan).toBe(CAU_HINH_LUONG_MAC_DINH.congChuan);
      expect(mockCauHinhRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // tongHop — tổng hợp kỳ, chạy engine cho 2 mức
  // ──────────────────────────────────────────────────────────────────────────
  describe('tongHop', () => {
    beforeEach(() => {
      seedCauHinh();
    });

    it('tạo một dòng DongLuong/NV với khaiBao(base=mucKhaiBao) và thucTe(base=luongThoaThuan) khớp tinhDongLuong thật', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        {
          _id: EMP1,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          luongThoaThuan: 15_000_000,
          mucKhaiBao: 5_500_000,
          phuCapCoDinh: 500_000,
          soNguoiPhuThuoc: 1,
          dongBH: true,
          thoiVu: false,
          camKet: false,
          isActive: true,
        },
      ]);
      timesheetStore = [
        { thang: '2026-06', employeeId: EMP1, soNgayCong: 24 },
      ];

      const [row] = await service.tongHop('2026-06');

      expect(row.thang).toBe('2026-06');
      expect(row.employeeId).toBe(EMP1);
      expect(row.employeeName).toBe('Nguyen Van A');
      expect(row.employeeCode).toBe('NV0001');
      expect(row.congThuong).toBe(24);

      const ch = CAU_HINH_LUONG_MAC_DINH as CauHinhLuongData;
      const congChung = {
        congThuong: 24,
        congThuViec: 0,
        congKhac: 0,
        phuCapCoDinh: 500_000,
        soNguoiPhuThuoc: 1,
        tamUng: 0,
        khauTruKhac: 0,
        dongBH: true,
        thoiVu: false,
        camKet: false,
        hopDongThu2: false,
        nhapTheoKy: {},
      };

      const expectedKhaiBao = tinhDongLuong(
        { base: 5_500_000, mucKhaiBao: 5_500_000, ...congChung },
        ch,
      );
      const expectedThucTe = tinhDongLuong(
        { base: 15_000_000, mucKhaiBao: 5_500_000, ...congChung },
        ch,
      );

      expect(row.khaiBao).toEqual(expectedKhaiBao);
      expect(row.thucTe).toEqual(expectedThucTe);
      // Hai mức khác kết quả (base khác nhau) — chứng minh không dùng chung 1 lần chạy.
      expect(row.khaiBao).not.toEqual(row.thucTe);
    });

    it('mucKhaiBao rỗng → dùng mucKhaiBaoMacDinh của cấu hình cho cả base khai báo lẫn BHXH', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        {
          _id: EMP1,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          luongThoaThuan: 10_000_000,
          mucKhaiBao: undefined,
          isActive: true,
        },
      ]);

      const [row] = await service.tongHop('2026-06');

      expect(row.mucKhaiBao).toBe(CAU_HINH_LUONG_MAC_DINH.mucKhaiBaoMacDinh);
      expect(row.khaiBao.giaTriTungKhoan.LUONG_CONG).toBe(0); // công=0 (chưa có timesheet)
    });

    it('chưa có bản ghi công của NV trong tháng → công = 0', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        { _id: EMP1, employeeId: 'NV0001', hoTen: 'A', isActive: true },
      ]);
      timesheetStore = []; // không có bản ghi công

      const [row] = await service.tongHop('2026-06');

      expect(row.congThuong).toBe(0);
      expect(row.congThuViec).toBe(0);
      expect(row.congKhac).toBe(0);
    });

    it('chạy lại KHÔNG nhân đôi dòng (upsert theo {thang, employeeId})', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        {
          _id: EMP1,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          luongThoaThuan: 10_000_000,
          mucKhaiBao: 5_500_000,
          isActive: true,
        },
      ]);
      timesheetStore = [{ thang: '2026-06', employeeId: EMP1, soNgayCong: 24 }];

      await service.tongHop('2026-06');
      expect(dongLuongStore).toHaveLength(1);

      // thêm dữ liệu công khác cho lần chạy lại — mô phỏng cập nhật bảng công
      timesheetStore = [{ thang: '2026-06', employeeId: EMP1, soNgayCong: 20 }];
      await service.tongHop('2026-06');

      expect(dongLuongStore).toHaveLength(1);
      expect(dongLuongStore[0].congThuong).toBe(20);
    });

    it('chạy lại giữ nguyên nhapTheoKy/tamUng/khauTruKhac đã nhập (không mất số đã nhập)', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        {
          _id: EMP1,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          luongThoaThuan: 10_000_000,
          mucKhaiBao: 5_500_000,
          isActive: true,
        },
      ]);
      timesheetStore = [{ thang: '2026-06', employeeId: EMP1, soNgayCong: 24 }];

      await service.tongHop('2026-06');

      // admin nhập tay khoản biến động theo kỳ trên dòng vừa tạo
      dongLuongStore[0].nhapTheoKy = { HIEU_SUAT: 2_000_000 };
      dongLuongStore[0].tamUng = 1_000_000;
      dongLuongStore[0].khauTruKhac = 200_000;

      const [row] = await service.tongHop('2026-06');

      expect(row.nhapTheoKy).toEqual({ HIEU_SUAT: 2_000_000 });
      expect(row.tamUng).toBe(1_000_000);
      expect(row.khauTruKhac).toBe(200_000);
      expect(row.khaiBao.giaTriTungKhoan.HIEU_SUAT).toBe(2_000_000);
    });

    it('dòng đã chốt (trangThai=chot) → bỏ qua, không tính lại/ghi đè; dòng nhap của NV khác vẫn được tính lại', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        {
          _id: EMP1,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          luongThoaThuan: 15_000_000,
          mucKhaiBao: 5_500_000,
          isActive: true,
        },
        {
          _id: EMP2,
          employeeId: 'NV0002',
          hoTen: 'Nguyen Van B',
          luongThoaThuan: 10_000_000,
          mucKhaiBao: 5_000_000,
          isActive: true,
        },
      ]);

      const chotKhaiBao = { giaTriTungKhoan: { LUONG_CONG: 999_999 } } as any;
      const chotThucTe = { giaTriTungKhoan: { LUONG_CONG: 888_888 } } as any;
      dongLuongStore = [
        {
          _id: 'd-chot',
          thang: '2026-06',
          employeeId: EMP1,
          congThuong: 24,
          trangThai: 'chot',
          isActive: true,
          khaiBao: chotKhaiBao,
          thucTe: chotThucTe,
          nhapTheoKy: { HIEU_SUAT: 2_000_000 },
        },
      ];

      // Đổi công trong tháng để nếu bị tính lại thì kết quả CHẮC CHẮN khác.
      timesheetStore = [
        { thang: '2026-06', employeeId: EMP1, soNgayCong: 10 },
        { thang: '2026-06', employeeId: EMP2, soNgayCong: 22 },
      ];

      const rows = await service.tongHop('2026-06');

      const rowEmp1 = rows.find((r) => r.employeeId === EMP1)!;
      const rowEmp2 = rows.find((r) => r.employeeId === EMP2)!;

      // Dòng chốt giữ nguyên snapshot cũ — không bị tính lại/ghi đè.
      expect(rowEmp1.trangThai).toBe('chot');
      expect(rowEmp1.khaiBao).toBe(chotKhaiBao);
      expect(rowEmp1.thucTe).toBe(chotThucTe);
      expect(rowEmp1.nhapTheoKy).toEqual({ HIEU_SUAT: 2_000_000 });
      expect(rowEmp1.congThuong).toBe(24); // không bị ghi đè bằng công mới (10)
      expect(mockDongLuongRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'd-chot' }),
      );

      // Dòng mới (NV2, chưa có bản ghi) vẫn được tính bình thường.
      expect(rowEmp2.congThuong).toBe(22);
      expect(rowEmp2.trangThai).toBe('nhap');
    });

    it('tạo một dòng cho mỗi NV active', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        { _id: EMP1, employeeId: 'NV0001', hoTen: 'A', isActive: true },
        { _id: EMP2, employeeId: 'NV0002', hoTen: 'B', isActive: true },
      ]);

      const rows = await service.tongHop('2026-06');

      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.employeeId).sort()).toEqual([EMP1, EMP2].sort());
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // danhSachDong
  // ──────────────────────────────────────────────────────────────────────────
  describe('danhSachDong', () => {
    it('trả về các dòng active của đúng tháng', async () => {
      dongLuongStore = [
        { _id: 'd1', thang: '2026-06', employeeId: EMP1, isActive: true },
        { _id: 'd2', thang: '2026-07', employeeId: EMP1, isActive: true },
      ];

      const result = await service.danhSachDong('2026-06');

      expect(result).toHaveLength(1);
      expect((result[0] as any)._id).toBe('d1');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // capNhatDong — sửa khoản biến động, tính lại
  // ──────────────────────────────────────────────────────────────────────────
  describe('capNhatDong', () => {
    beforeEach(() => {
      seedCauHinh();
    });

    it('cập nhật snapshot rồi tính lại khaiBao/thucTe khớp tinhDongLuong thật', async () => {
      const id = '507f1f77bcf86cd799439001';
      const existing: Partial<DongLuong> = {
        _id: id,
        thang: '2026-06',
        employeeId: EMP1,
        congThuong: 24,
        congThuViec: 0,
        congKhac: 0,
        luongThoaThuan: 15_000_000,
        mucKhaiBao: 5_500_000,
        phuCapCoDinh: 0,
        soNguoiPhuThuoc: 0,
        dongBH: false,
        thoiVu: false,
        camKet: false,
        tamUng: 0,
        khauTruKhac: 0,
        nhapTheoKy: {},
        trangThai: 'nhap',
        isActive: true,
      };
      mockDongLuongRepo.findOne.mockResolvedValue(existing);

      const result = await service.capNhatDong(id, {
        nhapTheoKy: { HIEU_SUAT: 2_000_000 },
      });

      expect(result.nhapTheoKy).toEqual({ HIEU_SUAT: 2_000_000 });

      const ch = CAU_HINH_LUONG_MAC_DINH as CauHinhLuongData;
      const congChung = {
        congThuong: 24,
        congThuViec: 0,
        congKhac: 0,
        phuCapCoDinh: 0,
        soNguoiPhuThuoc: 0,
        tamUng: 0,
        khauTruKhac: 0,
        dongBH: false,
        thoiVu: false,
        camKet: false,
        hopDongThu2: false,
        nhapTheoKy: { HIEU_SUAT: 2_000_000 },
      };
      const expectedKhaiBao = tinhDongLuong(
        { base: 5_500_000, mucKhaiBao: 5_500_000, ...congChung },
        ch,
      );
      const expectedThucTe = tinhDongLuong(
        { base: 15_000_000, mucKhaiBao: 5_500_000, ...congChung },
        ch,
      );

      expect(result.khaiBao).toEqual(expectedKhaiBao);
      expect(result.thucTe).toEqual(expectedThucTe);
      expect(result.khaiBao.giaTriTungKhoan.HIEU_SUAT).toBe(2_000_000);
    });

    it('nhapTheoKy được GỘP vào khoản hiện có, không thay thế toàn bộ', async () => {
      const id = '507f1f77bcf86cd799439004';
      const existing: Partial<DongLuong> = {
        _id: id,
        thang: '2026-06',
        employeeId: EMP1,
        congThuong: 24,
        congThuViec: 0,
        congKhac: 0,
        luongThoaThuan: 15_000_000,
        mucKhaiBao: 5_500_000,
        phuCapCoDinh: 0,
        soNguoiPhuThuoc: 0,
        dongBH: false,
        thoiVu: false,
        camKet: false,
        tamUng: 0,
        khauTruKhac: 0,
        nhapTheoKy: { HIEU_SUAT: 2_000_000 },
        trangThai: 'nhap',
        isActive: true,
      };
      mockDongLuongRepo.findOne.mockResolvedValue(existing);

      const result = await service.capNhatDong(id, {
        nhapTheoKy: { THUONG: 500_000 },
      });

      expect(result.nhapTheoKy).toEqual({
        HIEU_SUAT: 2_000_000,
        THUONG: 500_000,
      });

      const ch = CAU_HINH_LUONG_MAC_DINH as CauHinhLuongData;
      const congChung = {
        congThuong: 24,
        congThuViec: 0,
        congKhac: 0,
        phuCapCoDinh: 0,
        soNguoiPhuThuoc: 0,
        tamUng: 0,
        khauTruKhac: 0,
        dongBH: false,
        thoiVu: false,
        camKet: false,
        hopDongThu2: false,
        nhapTheoKy: { HIEU_SUAT: 2_000_000, THUONG: 500_000 },
      };
      const expectedKhaiBao = tinhDongLuong(
        { base: 5_500_000, mucKhaiBao: 5_500_000, ...congChung },
        ch,
      );
      const expectedThucTe = tinhDongLuong(
        { base: 15_000_000, mucKhaiBao: 5_500_000, ...congChung },
        ch,
      );

      expect(result.khaiBao).toEqual(expectedKhaiBao);
      expect(result.thucTe).toEqual(expectedThucTe);
      expect(result.khaiBao.giaTriTungKhoan.HIEU_SUAT).toBe(2_000_000);
      expect(result.khaiBao.giaTriTungKhoan.THUONG).toBe(500_000);
    });

    it('kỳ đã chốt → từ chối sửa', async () => {
      const id = '507f1f77bcf86cd799439002';
      mockDongLuongRepo.findOne.mockResolvedValue({
        _id: id,
        thang: '2026-06',
        employeeId: EMP1,
        trangThai: 'chot',
        isActive: true,
      });

      await expect(
        service.capNhatDong(id, { tamUng: 500_000 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDongLuongRepo.save).not.toHaveBeenCalled();
    });

    it('không tồn tại → NotFoundException', async () => {
      mockDongLuongRepo.findOne.mockResolvedValue(null);

      await expect(
        service.capNhatDong('507f1f77bcf86cd799439099', { tamUng: 1 }),
      ).rejects.toThrow();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // chot / moLai
  // ──────────────────────────────────────────────────────────────────────────
  describe('chot / moLai', () => {
    it('chot: đổi trangThai của mọi dòng trong kỳ sang chot', async () => {
      dongLuongStore = [
        { _id: 'd1', thang: '2026-06', employeeId: EMP1, trangThai: 'nhap', isActive: true },
        { _id: 'd2', thang: '2026-06', employeeId: EMP2, trangThai: 'nhap', isActive: true },
        { _id: 'd3', thang: '2026-07', employeeId: EMP1, trangThai: 'nhap', isActive: true },
      ];

      const result = await service.chot('2026-06');

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.trangThai === 'chot')).toBe(true);
      // Dòng của tháng khác không bị đổi.
      expect(dongLuongStore.find((d) => d._id === 'd3')!.trangThai).toBe('nhap');
    });

    it('moLai: đổi trangThai của mọi dòng trong kỳ về nhap; capNhatDong lại sửa được', async () => {
      const id = '507f1f77bcf86cd799439003';
      dongLuongStore = [
        { _id: id, thang: '2026-06', employeeId: EMP1, trangThai: 'chot', isActive: true },
      ];

      const result = await service.moLai('2026-06');

      expect(result.every((r) => r.trangThai === 'nhap')).toBe(true);

      seedCauHinh();
      mockDongLuongRepo.findOne.mockResolvedValue(dongLuongStore[0]);
      await expect(
        service.capNhatDong(id, { tamUng: 100_000 }),
      ).resolves.toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // P4.1 — cấu hình lương riêng theo NV + HĐLĐ thứ 2
  // ──────────────────────────────────────────────────────────────────────────
  describe('cấu hình lương riêng theo NV', () => {
    beforeEach(() => {
      seedCauHinh();
    });

    const CONG_CHUNG_RONG = {
      congThuViec: 0,
      congKhac: 0,
      phuCapCoDinh: 0,
      soNguoiPhuThuoc: 0,
      tamUng: 0,
      khauTruKhac: 0,
      thoiVu: false,
      camKet: false,
      nhapTheoKy: {},
    };

    it('áp override của NV vào cả hai mức khai báo/thực tế', async () => {
      const rieng = { congChuan: 26, thuViecTyLe: 0.9 };
      mockEmployeeRepo.find.mockResolvedValue([
        {
          _id: EMP1,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          luongThoaThuan: 15_000_000,
          mucKhaiBao: 5_500_000,
          isActive: true,
          cauHinhLuongRieng: rieng,
        },
      ]);
      timesheetStore = [{ thang: '2026-07', employeeId: EMP1, soNgayCong: 26 }];

      const [row] = await service.tongHop('2026-07');

      const chNV = ganCauHinhRieng(
        CAU_HINH_LUONG_MAC_DINH as CauHinhLuongData,
        rieng,
      );
      const dv = {
        ...CONG_CHUNG_RONG,
        congThuong: 26,
        dongBH: false,
        hopDongThu2: false,
        mucKhaiBao: 5_500_000,
      };

      expect(row.khaiBao).toEqual(tinhDongLuong({ ...dv, base: 5_500_000 }, chNV));
      expect(row.thucTe).toEqual(tinhDongLuong({ ...dv, base: 15_000_000 }, chNV));
      // Công chuẩn 26 (không phải 24 của cấu hình chung) → số CHẮC CHẮN khác.
      expect(row.khaiBao).not.toEqual(
        tinhDongLuong(
          { ...dv, base: 5_500_000 },
          CAU_HINH_LUONG_MAC_DINH as CauHinhLuongData,
        ),
      );
    });

    it('NV không có override → dùng cấu hình chung (không đổi hành vi cũ)', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        {
          _id: EMP1,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          luongThoaThuan: 15_000_000,
          mucKhaiBao: 5_500_000,
          isActive: true,
        },
      ]);
      timesheetStore = [{ thang: '2026-07', employeeId: EMP1, soNgayCong: 24 }];

      const [row] = await service.tongHop('2026-07');

      const dv = {
        ...CONG_CHUNG_RONG,
        congThuong: 24,
        dongBH: false,
        hopDongThu2: false,
        mucKhaiBao: 5_500_000,
      };
      expect(row.khaiBao).toEqual(
        tinhDongLuong(
          { ...dv, base: 5_500_000 },
          CAU_HINH_LUONG_MAC_DINH as CauHinhLuongData,
        ),
      );
      expect(row.cauHinhApDung).toEqual({
        congChuan: CAU_HINH_LUONG_MAC_DINH.congChuan,
        thuViecTyLe: CAU_HINH_LUONG_MAC_DINH.thuViec.tyLe,
        bhxhTyLe: CAU_HINH_LUONG_MAC_DINH.bhxh.tyLe,
        bhxhCanCu: CAU_HINH_LUONG_MAC_DINH.bhxh.canCu,
      });
    });

    it('ghi cauHinhApDung là giá trị ĐÃ resolve và copy hopDongThu2 từ hồ sơ', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        {
          _id: EMP1,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          luongThoaThuan: 15_000_000,
          mucKhaiBao: 5_500_000,
          isActive: true,
          hopDongThu2: true,
          cauHinhLuongRieng: { congChuan: 26 },
        },
      ]);

      const [row] = await service.tongHop('2026-07');

      expect(row.cauHinhApDung).toEqual({
        congChuan: 26,
        thuViecTyLe: 0.85,
        bhxhTyLe: 0.105,
        bhxhCanCu: 'MUC_KHAI_BAO',
      });
      expect(row.hopDongThu2).toBe(true);
    });

    it('HĐ thứ 2: dòng lương có chiPhiBHCongTy theo 0,5% và bhxh = 0', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        {
          _id: EMP1,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          luongThoaThuan: 15_000_000,
          mucKhaiBao: 5_500_000,
          isActive: true,
          dongBH: true,
          hopDongThu2: true,
        },
      ]);
      timesheetStore = [{ thang: '2026-07', employeeId: EMP1, soNgayCong: 24 }];

      const [row] = await service.tongHop('2026-07');

      expect(row.khaiBao.bhxh).toBe(0);
      expect(row.khaiBao.chiPhiBHCongTy).toBe(
        lamTronTheo(
          CAU_HINH_LUONG_MAC_DINH.bhCongTy.tyLeHopDongThu2 * 5_500_000,
          CAU_HINH_LUONG_MAC_DINH.lamTron,
        ),
      );
    });

    it('capNhatDong dùng cauHinhApDung của dòng, KHÔNG đọc lại Employee', async () => {
      const id = '507f1f77bcf86cd799439077';
      const apDung = {
        congChuan: 26,
        thuViecTyLe: 0.9,
        bhxhTyLe: 0.105,
        bhxhCanCu: 'MUC_KHAI_BAO' as const,
      };
      mockDongLuongRepo.findOne.mockResolvedValue({
        _id: id,
        thang: '2026-07',
        employeeId: EMP1,
        congThuong: 26,
        congThuViec: 0,
        congKhac: 0,
        luongThoaThuan: 15_000_000,
        mucKhaiBao: 5_500_000,
        phuCapCoDinh: 0,
        soNguoiPhuThuoc: 0,
        dongBH: false,
        thoiVu: false,
        camKet: false,
        hopDongThu2: false,
        cauHinhApDung: apDung,
        tamUng: 0,
        khauTruKhac: 0,
        nhapTheoKy: {},
        trangThai: 'nhap',
        isActive: true,
      });

      const row = await service.capNhatDong(id, { tamUng: 1_000_000 });

      expect(mockEmployeeRepo.find).not.toHaveBeenCalled();

      const chNV = ganCauHinhRieng(
        CAU_HINH_LUONG_MAC_DINH as CauHinhLuongData,
        apDung,
      );
      const dv = {
        ...CONG_CHUNG_RONG,
        congThuong: 26,
        tamUng: 1_000_000,
        dongBH: false,
        hopDongThu2: false,
        mucKhaiBao: 5_500_000,
      };
      expect(row.khaiBao).toEqual(tinhDongLuong({ ...dv, base: 5_500_000 }, chNV));
      expect(row.thucTe).toEqual(tinhDongLuong({ ...dv, base: 15_000_000 }, chNV));
    });
  });

  describe('layCauHinh — backfill bhCongTy', () => {
    it('bản ghi tạo trước P4.1 thiếu bhCongTy → backfill từ seed và LƯU lại', async () => {
      cauHinhStore.push({
        _id: 'ch-cu',
        ...(CAU_HINH_LUONG_MAC_DINH as any),
        bhCongTy: undefined,
        isActive: true,
      });

      const ch = await service.layCauHinh();

      expect(ch.bhCongTy).toEqual(CAU_HINH_LUONG_MAC_DINH.bhCongTy);
      expect(mockCauHinhRepo.save).toHaveBeenCalledTimes(1);
      expect(mockCauHinhRepo.create).not.toHaveBeenCalled();
    });

    it('bản ghi đã có bhCongTy → không ghi lại, giữ đúng tỷ lệ admin đã sửa', async () => {
      cauHinhStore.push({
        _id: 'ch-moi',
        ...(CAU_HINH_LUONG_MAC_DINH as any),
        bhCongTy: { tyLe: 0.2, tyLeHopDongThu2: 0.004 },
        isActive: true,
      });

      const ch = await service.layCauHinh();

      expect(ch.bhCongTy).toEqual({ tyLe: 0.2, tyLeHopDongThu2: 0.004 });
      expect(mockCauHinhRepo.save).not.toHaveBeenCalled();
    });
  });
  /**
   * Màn Cấu hình lương cần biết loại ngày nào ĐANG được đơn tham chiếu để
   * chặn xoá nó (spec P4.2b §6): xoá xong thì `phanBoOt` của đơn cũ trỏ vào
   * loại không còn trong `uuTienLoai`, biểu mẫu 03-LĐTL mất cột và `traHeSo()`
   * âm thầm rơi về hệ số ngày thường.
   */
  describe('demDonTheoLoaiOt (P4.2b §6)', () => {
    it('đếm theo phanBoOt — một đơn chẻ hai loại tính vào CẢ HAI', async () => {
      donStore.push({
        _id: 'd1', loaiDon: 'lam_them_gio', isActive: true,
        soGioOt: 6, loaiNgayOt: 'ngay_dem', heSoOt: 1.5,
        phanBoOt: [
          { loaiNgayOt: 'ngay_thuong', soGio: 2, heSoTra: 1.5, heSoTichQuy: 1.5 },
          { loaiNgayOt: 'ngay_dem', soGio: 4, heSoTra: 1.5, heSoTichQuy: 1.5 },
        ],
      });

      await expect(service.demDonTheoLoaiOt()).resolves.toEqual({
        ngay_thuong: 1,
        ngay_dem: 1,
      });
    });

    it('một đơn chỉ góp 1 vào mỗi loại dù phanBoOt có nhiều phần cùng loại', async () => {
      donStore.push({
        _id: 'd1', loaiDon: 'lam_them_gio', isActive: true,
        phanBoOt: [
          { loaiNgayOt: 'ngay_le', soGio: 2, heSoTra: 3, heSoTichQuy: 3 },
          { loaiNgayOt: 'ngay_le', soGio: 3, heSoTra: 3, heSoTichQuy: 3 },
        ],
      });

      // Con số phải đọc được là "bao nhiêu ĐƠN đang tham chiếu loại này",
      // không phải "bao nhiêu dòng phanBoOt".
      await expect(service.demDonTheoLoaiOt()).resolves.toEqual({ ngay_le: 1 });
    });

    it('đơn cũ chưa backfill thì đếm theo loaiNgayOt', async () => {
      donStore.push({
        _id: 'd1', loaiDon: 'lam_them_gio', isActive: true,
        soGioOt: 3, loaiNgayOt: 'ngay_nghi', heSoOt: 2,
      });

      await expect(service.demDonTheoLoaiOt()).resolves.toEqual({ ngay_nghi: 1 });
    });

    it('bỏ qua đơn đã xoá mềm — không chặn xoá loại vì một bản ghi trong thùng rác', async () => {
      donStore.push({
        _id: 'd1', loaiDon: 'lam_them_gio', isActive: false,
        soGioOt: 3, loaiNgayOt: 'ngay_nghi',
      });

      await expect(service.demDonTheoLoaiOt()).resolves.toEqual({});
    });

    it('không có đơn nào thì trả object rỗng, không phải null', async () => {
      await expect(service.demDonTheoLoaiOt()).resolves.toEqual({});
    });
  });
});
