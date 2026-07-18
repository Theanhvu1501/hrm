import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DonChamCong_Service } from './don-cham-cong.service';
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

  const EMP_ID = '507f1f77bcf86cd799439011';

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonChamCong_Service,
        {
          provide: getRepositoryToken(AttendanceRequest),
          useValue: mockRequestRepo,
        },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
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
