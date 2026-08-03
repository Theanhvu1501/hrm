import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ThoiViec_Service } from './thoi-viec.service';
import { Resignation, Employee } from '@app/entities';

describe('ThoiViec_Service', () => {
  let service: ThoiViec_Service;
  let mockResignationRepo: {
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
  const RESIGNATION_ID = '507f1f77bcf86cd799439099';

  beforeEach(async () => {
    mockResignationRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) =>
        Promise.resolve({ ...v, _id: v._id ?? 'generated-resignation-id' }),
      ),
    };

    mockEmployeeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((v) => Promise.resolve(v)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThoiViec_Service,
        {
          provide: getRepositoryToken(Resignation),
          useValue: mockResignationRepo,
        },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
      ],
    }).compile();

    service = module.get<ThoiViec_Service>(ThoiViec_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('denormalizes employeeName/employeeCode from the loaded employee and saves with trangThai cho_duyet', async () => {
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        phongBan: 'Phong Ke Toan',
        chucDanh: 'Nhan vien',
        trangThai: 'dang_lam_viec',
      };
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.create({
        employeeId: EMP_ID,
        ngayNopDon: '2026-07-18',
        loaiThoiViec: 'tu_nguyen',
      } as any);

      expect(result.employeeName).toBe('Nguyen Van A');
      expect(result.employeeCode).toBe('NV0001');
      expect(result.trangThai).toBe('cho_duyet');
      expect(mockResignationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: EMP_ID,
          employeeName: 'Nguyen Van A',
          employeeCode: 'NV0001',
          trangThai: 'cho_duyet',
        }),
      );
    });

    it('throws NotFoundException when the employee cannot be found, and does not save a resignation record', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          employeeId: '507f1f77bcf86cd799439000',
          ngayNopDon: '2026-07-18',
          loaiThoiViec: 'tu_nguyen',
        } as any),
      ).rejects.toThrow(NotFoundException);

      expect(mockResignationRepo.save).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // updateStatus
  // ──────────────────────────────────────────────────────────────────────────
  describe('updateStatus', () => {
    it("sets the employee's trangThai to da_nghi and saves the employee when the new status is hoan_thanh", async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'dang_lam_viec',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'hoan_thanh');

      expect(result.trangThai).toBe('hoan_thanh');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'da_nghi' }),
      );
    });

    it('does NOT touch the employee record when the new status is tu_choi and it was never approved (cho_duyet -> tu_choi)', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);

      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(mockEmployeeRepo.findOne).not.toHaveBeenCalled();
      expect(mockEmployeeRepo.save).not.toHaveBeenCalled();
    });

    // ── Gap 1: huỷ duyệt phải trả lại trạng thái làm việc cho nhân viên ──
    it('restores the employee to dang_lam_viec when an approved resignation is moved back to tu_choi', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        trangThaiNhanVienTruocKhiDuyet: 'dang_lam_viec',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_lam_viec' }),
      );
    });

    it('restores the employee to tam_nghi (not dang_lam_viec) when they were on tam_nghi before the resignation was approved', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        // Chụp lại từ lúc duyệt: NV đang tạm nghỉ (thai sản/không lương) khi
        // hồ sơ thôi việc được duyệt.
        trangThaiNhanVienTruocKhiDuyet: 'tam_nghi',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'tam_nghi' }),
      );
    });

    it('captures the employee trangThai at the moment of first entering da_duyet, for later restore', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'tam_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'da_duyet');

      expect(result.trangThaiNhanVienTruocKhiDuyet).toBe('tam_nghi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'da_nghi' }),
      );
    });

    it('does not re-capture (and does not lose) the prior status when moving da_duyet -> hoan_thanh', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        trangThaiNhanVienTruocKhiDuyet: 'tam_nghi',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'hoan_thanh');

      expect(result.trangThaiNhanVienTruocKhiDuyet).toBe('tam_nghi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'da_nghi' }),
      );
    });

    // ── legacy rows with no captured snapshot (review round 2, Important) ──
    it('falls back to dang_lam_viec when an approved resignation has no captured snapshot (legacy row predating this fix)', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        // Hồ sơ được duyệt TRƯỚC khi cột này tồn tại — không có gì để đọc
        // lại. Xem ops/README.md để biết cách rà các hồ sơ có nguy cơ này
        // trước khi thao tác — trường hợp NV vốn tam_nghi trước khi hồ sơ
        // được duyệt sẽ bị hồi sinh SAI thành dang_lam_viec.
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_lam_viec' }),
      );
    });

    // ── write-employee-first ordering (review round 2, CRITICAL) ──
    it('leaves the resignation untouched in the DB when the employee write fails, so a retry re-attempts the whole operation instead of short-circuiting', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        trangThaiNhanVienTruocKhiDuyet: 'dang_lam_viec',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);
      mockEmployeeRepo.save.mockRejectedValueOnce(new Error('mongo down'));

      await expect(
        service.updateStatus(RESIGNATION_ID, 'tu_choi'),
      ).rejects.toThrow('mongo down');

      // Nếu hồ sơ đã bị lưu với trangThai='tu_choi' trước khi ghi NV thất
      // bại, lần gọi lại sẽ đọc ra hồ sơ đã ở đích, coi đó là "không có
      // chuyển tiếp hiệu lực" và bỏ qua NV vĩnh viễn — đúng lỗi CRITICAL đã
      // bị review bắt.
      expect(mockResignationRepo.save).not.toHaveBeenCalled();
      expect(resignation.trangThai).toBe('da_duyet');

      // Retry: lần này ghi NV thành công, toàn bộ thao tác phải hoàn tất.
      mockEmployeeRepo.save.mockResolvedValue(employee);
      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(mockResignationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'tu_choi' }),
      );
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_lam_viec' }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('filters by trangThai', async () => {
      await service.findAll({ trangThai: 'hoan_thanh' });

      expect(mockResignationRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, trangThai: 'hoan_thanh' },
      });
    });

    it('defaults isActive filter to true', async () => {
      await service.findAll();

      expect(mockResignationRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // remove — soft delete
  // ──────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('sets isActive=false instead of hard deleting', async () => {
      const existing = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        isActive: true,
      };
      mockResignationRepo.findOne.mockResolvedValue(existing);

      await service.remove(RESIGNATION_ID);

      expect(mockResignationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('does not touch the employee record when deleting a resignation that was never approved', async () => {
      const existing = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        isActive: true,
      };
      mockResignationRepo.findOne.mockResolvedValue(existing);

      await service.remove(RESIGNATION_ID);

      expect(mockEmployeeRepo.findOne).not.toHaveBeenCalled();
      expect(mockEmployeeRepo.save).not.toHaveBeenCalled();
    });

    // ── Gap 2: xoá một hồ sơ ĐÃ DUYỆT phải trả lại trạng thái làm việc ──
    it('restores the employee to working (undoes chanNeuDaNghiViec block) when deleting an approved resignation', async () => {
      const existing = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'hoan_thanh',
        trangThaiNhanVienTruocKhiDuyet: 'dang_lam_viec',
        isActive: true,
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(existing);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      await service.remove(RESIGNATION_ID);

      expect(mockResignationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_lam_viec' }),
      );
    });

    it('is a no-op on the employee when called again on an already-inactive resignation', async () => {
      const existing = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'hoan_thanh',
        trangThaiNhanVienTruocKhiDuyet: 'dang_lam_viec',
        isActive: false,
      };
      mockResignationRepo.findOne.mockResolvedValue(existing);

      await service.remove(RESIGNATION_ID);

      expect(mockEmployeeRepo.findOne).not.toHaveBeenCalled();
      expect(mockEmployeeRepo.save).not.toHaveBeenCalled();
    });

    // ── write-employee-first ordering (review round 2, CRITICAL) ──
    it('leaves isActive=true when the employee write fails, so a retry re-attempts the restore instead of no-op-ing on the isActive guard', async () => {
      const existing = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'hoan_thanh',
        trangThaiNhanVienTruocKhiDuyet: 'dang_lam_viec',
        isActive: true,
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(existing);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);
      mockEmployeeRepo.save.mockRejectedValueOnce(new Error('mongo down'));

      await expect(service.remove(RESIGNATION_ID)).rejects.toThrow(
        'mongo down',
      );

      // Nếu isActive đã bị lưu false trước khi ghi NV thất bại, lần gọi lại
      // sẽ chạm guard `!item.isActive` ngay từ đầu và trả về im lặng — NV
      // kẹt vĩnh viễn ở da_nghi, đúng lỗi CRITICAL đã bị review bắt.
      expect(mockResignationRepo.save).not.toHaveBeenCalled();
      expect(existing.isActive).toBe(true);

      // Retry: lần này ghi NV thành công, toàn bộ thao tác phải hoàn tất.
      mockEmployeeRepo.save.mockResolvedValue(employee);
      await service.remove(RESIGNATION_ID);

      expect(mockResignationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_lam_viec' }),
      );
    });
  });
});
