import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DonChamCong_Service } from './don-cham-cong.service';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import { AttendanceRequest, Employee } from '@app/entities';

describe('DonChamCong_Service', () => {
  let service: DonChamCong_Service;
  let mockRequestRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockEmployeeRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let mockNgayLeService: {
    timTheoNgay: jest.Mock;
  };

  const EMP_ID = '507f1f77bcf86cd799439011';
  // T2→T6, khớp với lịch làm việc chuẩn dùng xuyên suốt luat-don.spec.ts.
  const T2_DEN_T6 = [1, 2, 3, 4, 5];

  beforeEach(async () => {
    mockRequestRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) =>
        Promise.resolve({ ...v, _id: v._id ?? 'generated-request-id' }),
      ),
    };

    mockEmployeeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((v) => Promise.resolve(v)),
    };

    // Mặc định không có ngày lễ nào — từng test bật lại khi cần mô phỏng lễ.
    mockNgayLeService = {
      timTheoNgay: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonChamCong_Service,
        {
          provide: getRepositoryToken(AttendanceRequest),
          useValue: mockRequestRepo,
        },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: NgayLe_Service, useValue: mockNgayLeService },
      ],
    }).compile();

    service = module.get<DonChamCong_Service>(DonChamCong_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — denorm + default trạng thái
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — giải trình hợp lệ', () => {
    it('denorms employeeName/employeeCode from the employee record and defaults trangThai to cho_duyet', async () => {
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
      };
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.create({
        employeeId: EMP_ID,
        loaiDon: 'giai_trinh',
        ngay: '2026-07-18',
        lyDo: 'Quên chấm công',
      } as any);

      expect(result.employeeName).toBe('Nguyen Van A');
      expect(result.employeeCode).toBe('NV0001');
      expect(result.trangThai).toBe('cho_duyet');
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeName: 'Nguyen Van A',
          employeeCode: 'NV0001',
          trangThai: 'cho_duyet',
        }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — snapshot hệ số OT / số ngày nghỉ lúc tạo đơn (Task 3)
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — lam_them_gio (OT)', () => {
    const employee = { _id: EMP_ID, employeeId: 'NV0001', hoTen: 'Nguyen Van A', ngayLamViecTrongTuan: T2_DEN_T6 };

    it('OT rơi vào ngày lễ → heSoOt 3.0, loaiNgayOt ngay_le', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(employee);
      // 2026-09-02 (thứ Tư) được mô phỏng là ngày lễ qua NgayLe_Service.
      mockNgayLeService.timTheoNgay.mockResolvedValue({
        _id: 'holiday-1',
        tenNgayLe: 'Quốc khánh',
        tuNgay: '2026-09-02',
        denNgay: '2026-09-02',
      });

      const result = await service.create({
        employeeId: EMP_ID,
        loaiDon: 'lam_them_gio',
        ngay: '2026-09-02',
        gioTu: '18:00',
        gioDen: '20:00',
      } as any);

      expect(mockNgayLeService.timTheoNgay).toHaveBeenCalledWith('2026-09-02');
      expect(result.heSoOt).toBe(3.0);
      expect(result.loaiNgayOt).toBe('ngay_le');
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ heSoOt: 3.0, loaiNgayOt: 'ngay_le' }),
      );
    });

    it('OT qua nửa đêm → soGioOt tính đúng (22:00 → 02:00 = 4h)', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.create({
        employeeId: EMP_ID,
        loaiDon: 'lam_them_gio',
        ngay: '2026-07-22',
        gioTu: '22:00',
        gioDen: '02:00',
      } as any);

      expect(result.soGioOt).toBe(4);
    });

    it('client tự khai heSoOt: 3.0 cho ngày thường → backend đè lại thành 1.5', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(employee);
      // 2026-07-22 là thứ Tư, thuộc lịch làm việc T2_DEN_T6, không phải lễ.
      mockNgayLeService.timTheoNgay.mockResolvedValue(null);

      const result = await service.create({
        employeeId: EMP_ID,
        loaiDon: 'lam_them_gio',
        ngay: '2026-07-22',
        gioTu: '18:00',
        gioDen: '20:00',
        heSoOt: 3.0, // client tự khai — backend phải bỏ qua giá trị này
      } as any);

      expect(result.heSoOt).toBe(1.5);
      expect(result.loaiNgayOt).toBe('ngay_thuong');
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ heSoOt: 1.5 }),
      );
    });
  });

  describe('create — nghi_phep / nghi_bu (nghỉ phép)', () => {
    const employee = { _id: EMP_ID, employeeId: 'NV0001', hoTen: 'Nguyen Van A', ngayLamViecTrongTuan: T2_DEN_T6 };

    it('khoảng nghỉ vắt cuối tuần → soNgayNghi bỏ qua T7/CN', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      // 2026-07-24 (T6) → 2026-07-28 (T3): T6,T7,CN,T2,T3 → 3 ngày làm việc.
      const result = await service.create({
        employeeId: EMP_ID,
        loaiDon: 'nghi_phep',
        ngay: '2026-07-24',
        denNgay: '2026-07-28',
        loaiNghi: 'phep_nam',
      } as any);

      expect(result.soNgayNghi).toBe(3);
    });

    it('khoảng nghỉ dài hơn 60 ngày → BadRequestException', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      await expect(
        service.create({
          employeeId: EMP_ID,
          loaiDon: 'nghi_phep',
          ngay: '2026-07-24',
          denNgay: '2026-09-24', // 63 ngày, vượt giới hạn 60
          loaiNghi: 'phep_nam',
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('create — giai_trinh không tính các trường OT/nghỉ phép', () => {
    it('không set soNgayNghi/soGioOt/heSoOt/loaiNgayOt', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        ngayLamViecTrongTuan: T2_DEN_T6,
      });

      const result = await service.create({
        employeeId: EMP_ID,
        loaiDon: 'giai_trinh',
        ngay: '2026-07-18',
        lyDo: 'Quên chấm công',
      } as any);

      expect(result.soNgayNghi).toBeUndefined();
      expect(result.soGioOt).toBeUndefined();
      expect(result.heSoOt).toBeUndefined();
      expect(result.loaiNgayOt).toBeUndefined();
      expect(mockNgayLeService.timTheoNgay).not.toHaveBeenCalled();
    });
  });

  describe('create — employeeId không tồn tại', () => {
    it('throws NotFoundException', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          employeeId: '507f1f77bcf86cd799439099',
          loaiDon: 'giai_trinh',
          ngay: '2026-07-18',
        } as any),
      ).rejects.toThrow(NotFoundException);

      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // updateStatus
  // ──────────────────────────────────────────────────────────────────────────
  describe('updateStatus', () => {
    it('sets trangThai to da_duyet and records nguoiDuyet', async () => {
      const existing = {
        _id: '507f1f77bcf86cd799439099',
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        isActive: true,
      };
      mockRequestRepo.findOne.mockResolvedValue(existing);

      const result = await service.updateStatus(
        '507f1f77bcf86cd799439099',
        'da_duyet',
        'Manager A',
      );

      expect(result.trangThai).toBe('da_duyet');
      expect(result.nguoiDuyet).toBe('Manager A');
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'da_duyet', nguoiDuyet: 'Manager A' }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('defaults isActive filter to true', async () => {
      await service.findAll();

      expect(mockRequestRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('filters by loaiDon', async () => {
      await service.findAll({ loaiDon: 'lam_them_gio' });

      expect(mockRequestRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, loaiDon: 'lam_them_gio' },
      });
    });

    it('filters by employeeId and trangThai', async () => {
      await service.findAll({ employeeId: EMP_ID, trangThai: 'cho_duyet' });

      expect(mockRequestRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, employeeId: EMP_ID, trangThai: 'cho_duyet' },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // remove — soft delete
  // ──────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('sets isActive=false instead of hard deleting', async () => {
      const id = '507f1f77bcf86cd799439099';
      const existing = { _id: id, employeeId: EMP_ID, isActive: true };
      mockRequestRepo.findOne.mockResolvedValue(existing);

      await service.remove(id);

      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('findOne — không tồn tại', () => {
    it('throws NotFoundException', async () => {
      mockRequestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
