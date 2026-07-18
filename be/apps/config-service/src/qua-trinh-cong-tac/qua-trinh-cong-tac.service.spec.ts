import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { QuaTrinhCongTac_Service } from './qua-trinh-cong-tac.service';
import { EmploymentHistory, Employee } from '@app/entities';

describe('QuaTrinhCongTac_Service', () => {
  let service: QuaTrinhCongTac_Service;
  let mockHistoryRepo: {
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
    mockHistoryRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) =>
        Promise.resolve({ ...v, _id: v._id ?? 'generated-history-id' }),
      ),
    };

    mockEmployeeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((v) => Promise.resolve(v)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuaTrinhCongTac_Service,
        {
          provide: getRepositoryToken(EmploymentHistory),
          useValue: mockHistoryRepo,
        },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
      ],
    }).compile();

    service = module.get<QuaTrinhCongTac_Service>(QuaTrinhCongTac_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — snapshot + apply
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — điều chuyển (snapshot phòng ban cũ, apply phòng ban mới)', () => {
    it('snapshots the employee current phongBan into phongBanCu, records phongBanMoi from dto, and applies phongBanMoi onto the employee', async () => {
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
        loaiThayDoi: 'dieu_chuyen',
        ngayHieuLuc: '2026-08-01',
        phongBanMoi: 'Phong Nhan Su',
      } as any);

      expect(result.phongBanCu).toBe('Phong Ke Toan');
      expect(result.phongBanMoi).toBe('Phong Nhan Su');
      expect(result.employeeName).toBe('Nguyen Van A');
      expect(result.employeeCode).toBe('NV0001');

      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ phongBan: 'Phong Nhan Su' }),
      );
    });
  });

  describe('create — đổi trạng thái', () => {
    it('updates the employee trangThai to trangThaiMoi', async () => {
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0002',
        hoTen: 'Tran Thi B',
        phongBan: 'Phong Kinh Doanh',
        chucDanh: 'Truong phong',
        trangThai: 'dang_lam_viec',
      };
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.create({
        employeeId: EMP_ID,
        loaiThayDoi: 'doi_trang_thai',
        ngayHieuLuc: '2026-08-01',
        trangThaiMoi: 'tam_nghi',
      } as any);

      expect(result.trangThaiCu).toBe('dang_lam_viec');
      expect(result.trangThaiMoi).toBe('tam_nghi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'tam_nghi' }),
      );
    });
  });

  describe('create — chỉ apply các trường có trong dto', () => {
    it('leaves phongBan and trangThai unchanged when only chucDanhMoi is provided', async () => {
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0003',
        hoTen: 'Le Van C',
        phongBan: 'Phong Ky Thuat',
        chucDanh: 'Nhan vien',
        trangThai: 'dang_lam_viec',
      };
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      await service.create({
        employeeId: EMP_ID,
        loaiThayDoi: 'bo_nhiem',
        ngayHieuLuc: '2026-08-01',
        chucDanhMoi: 'Truong phong',
      } as any);

      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          phongBan: 'Phong Ky Thuat',
          trangThai: 'dang_lam_viec',
          chucDanh: 'Truong phong',
        }),
      );
    });
  });

  describe('create — employeeId không tồn tại', () => {
    it('throws NotFoundException when the employee cannot be found', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          employeeId: '507f1f77bcf86cd799439099',
          loaiThayDoi: 'dieu_chuyen',
          ngayHieuLuc: '2026-08-01',
        } as any),
      ).rejects.toThrow(NotFoundException);

      expect(mockHistoryRepo.save).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('filters by employeeId and returns records sorted newest ngayHieuLuc first', async () => {
      const list = [
        {
          _id: '1',
          employeeId: EMP_ID,
          ngayHieuLuc: '2026-01-01',
          isActive: true,
        },
        {
          _id: '2',
          employeeId: EMP_ID,
          ngayHieuLuc: '2026-06-01',
          isActive: true,
        },
      ];
      mockHistoryRepo.find.mockResolvedValue(list);

      const result = await service.findAll({ employeeId: EMP_ID });

      expect(mockHistoryRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, employeeId: EMP_ID },
      });
      expect(result[0].ngayHieuLuc).toBe('2026-06-01');
      expect(result[1].ngayHieuLuc).toBe('2026-01-01');
    });

    it('defaults isActive filter to true', async () => {
      await service.findAll();

      expect(mockHistoryRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('filters by loaiThayDoi', async () => {
      await service.findAll({ loaiThayDoi: 'tang_luong' });

      expect(mockHistoryRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, loaiThayDoi: 'tang_luong' },
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
      mockHistoryRepo.findOne.mockResolvedValue(existing);

      await service.remove(id);

      expect(mockHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });
});
