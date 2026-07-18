import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BangCong_Service } from './bang-cong.service';
import { Timesheet, Employee, AttendanceRequest } from '@app/entities';

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

  // In-memory stores backing the mocked `find` calls — a `where` filter is
  // applied against these arrays so tests can assert on genuine filtering
  // behaviour (only matching entries make it into the aggregated result),
  // not just on what arguments the service happened to pass.
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
      ],
    }).compile();

    service = module.get<BangCong_Service>(BangCong_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // generate — tạo bảng công theo tháng
  // ──────────────────────────────────────────────────────────────────────────
  describe('generate — tạo mới', () => {
    it('creates one row per active employee, denorming employeeName/employeeCode', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        { _id: EMP1, employeeId: 'NV0001', hoTen: 'Nguyen Van A', isActive: true },
        { _id: EMP2, employeeId: 'NV0002', hoTen: 'Tran Thi B', isActive: true },
      ]);

      const result = await service.generate('2026-07');

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(result).toHaveLength(2);

      const row1 = result.find((r) => r.employeeId === EMP1)!;
      expect(row1.employeeName).toBe('Nguyen Van A');
      expect(row1.employeeCode).toBe('NV0001');
      expect(row1.thang).toBe('2026-07');
      expect(row1.trangThai).toBe('nhap');
      expect(row1.soNgayCong).toBe(0);

      const row2 = result.find((r) => r.employeeId === EMP2)!;
      expect(row2.employeeName).toBe('Tran Thi B');
      expect(row2.employeeCode).toBe('NV0002');
    });
  });

  describe('generate — cộng dồn giờ OT đã duyệt', () => {
    it('sums approved lam_them_gio hours (18:00-20:00 => 2h) into soGioLamThem', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        { _id: EMP1, employeeId: 'NV0001', hoTen: 'Nguyen Van A', isActive: true },
      ]);
      requestStore = [
        {
          employeeId: EMP1,
          loaiDon: 'lam_them_gio',
          trangThai: 'da_duyet',
          isActive: true,
          ngay: '2026-07-15',
          gioTu: '18:00',
          gioDen: '20:00',
        },
      ];

      const [row] = await service.generate('2026-07');

      expect(row.soGioLamThem).toBe(2);
    });

    it('ignores requests that are not approved or not OT type', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        { _id: EMP1, employeeId: 'NV0001', hoTen: 'Nguyen Van A', isActive: true },
      ]);
      requestStore = [
        // pending approval — must not count
        {
          employeeId: EMP1,
          loaiDon: 'lam_them_gio',
          trangThai: 'cho_duyet',
          isActive: true,
          ngay: '2026-07-10',
          gioTu: '18:00',
          gioDen: '20:00',
        },
        // approved but wrong loaiDon — must not count
        {
          employeeId: EMP1,
          loaiDon: 'giai_trinh',
          trangThai: 'da_duyet',
          isActive: true,
          ngay: '2026-07-11',
          gioTu: '18:00',
          gioDen: '22:00',
        },
        // approved OT but a different month — must not count
        {
          employeeId: EMP1,
          loaiDon: 'lam_them_gio',
          trangThai: 'da_duyet',
          isActive: true,
          ngay: '2026-06-30',
          gioTu: '18:00',
          gioDen: '21:00',
        },
      ];

      const [row] = await service.generate('2026-07');

      expect(row.soGioLamThem).toBe(0);
    });
  });

  describe('generate — không ghi đè giá trị nhập tay', () => {
    it('keeps the existing row soNgayCong instead of resetting it', async () => {
      mockEmployeeRepo.find.mockResolvedValue([
        { _id: EMP1, employeeId: 'NV0001', hoTen: 'Nguyen Van A', isActive: true },
      ]);
      timesheetStore = [
        {
          _id: 'existing-row-id',
          thang: '2026-07',
          employeeId: EMP1,
          employeeName: 'Nguyen Van A',
          employeeCode: 'NV0001',
          soNgayCong: 22,
          soGioLamThem: 0,
          soLanDiMuon: 1,
          soLanVeSom: 0,
          trangThai: 'nhap',
          isActive: true,
        },
      ];

      const [row] = await service.generate('2026-07');

      expect(row.soNgayCong).toBe(22);
      expect(row.soLanDiMuon).toBe(1);
      expect(mockTimesheetRepo.create).not.toHaveBeenCalled();
    });
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
    it('edits manual fields (soNgayCong, soGioLamThem, soLanDiMuon, soLanVeSom, ghiChu)', async () => {
      const id = '507f1f77bcf86cd799439033';
      const existing = {
        _id: id,
        thang: '2026-07',
        employeeId: EMP1,
        soNgayCong: 20,
        soGioLamThem: 2,
        soLanDiMuon: 0,
        soLanVeSom: 0,
        trangThai: 'nhap',
        isActive: true,
      };
      mockTimesheetRepo.findOne.mockResolvedValue(existing);

      const result = await service.update(id, {
        soNgayCong: 21,
        soLanDiMuon: 2,
        ghiChu: 'Nghỉ phép 1 ngày',
      });

      expect(result.soNgayCong).toBe(21);
      expect(result.soLanDiMuon).toBe(2);
      expect(result.ghiChu).toBe('Nghỉ phép 1 ngày');
      expect(mockTimesheetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          soNgayCong: 21,
          soLanDiMuon: 2,
          ghiChu: 'Nghỉ phép 1 ngày',
        }),
      );
    });
  });

  describe('findOne — không tồn tại', () => {
    it('throws NotFoundException', async () => {
      mockTimesheetRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('507f1f77bcf86cd799439099'),
      ).rejects.toThrow(NotFoundException);
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
