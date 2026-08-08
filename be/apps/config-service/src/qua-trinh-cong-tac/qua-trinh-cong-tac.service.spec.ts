import { NotFoundException } from '@nestjs/common';
import { QuaTrinhCongTac_Service } from './qua-trinh-cong-tac.service';

const EMP_ID = '507f1f77bcf86cd799439011';

/** Danh mục phòng ban trả về từ identity qua PhongBanService.list(token). */
const DANH_MUC = [
  { id: 'd1', maPhong: 'KT', tenPhong: 'Kế toán', parentId: null, path: [], thuTu: 0 },
  { id: 'd2', maPhong: 'NS', tenPhong: 'Nhân sự', parentId: null, path: [], thuTu: 1 },
];

/**
 * Khởi tạo service bằng cách gọi constructor trực tiếp (không qua
 * Nest TestingModule) — service chỉ có 3 phụ thuộc đơn giản, tự mock đủ.
 */
function makeService(emp: any) {
  const empRepo = {
    findOne: jest.fn().mockResolvedValue(emp),
    save: jest.fn(async (e: any) => e),
  };
  const histRepo = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (d: any) => ({
      ...d,
      _id: d._id ?? 'generated-history-id',
    })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };
  const phongBan = { list: jest.fn().mockResolvedValue(DANH_MUC) };
  const svc = new QuaTrinhCongTac_Service(
    histRepo as any,
    empRepo as any,
    phongBan as any,
  );
  return { svc, empRepo, histRepo, phongBan };
}

describe('QuaTrinhCongTac_Service', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // create — điều chuyển phòng ban: chọn id, lịch sử chụp TÊN tại thời điểm đó
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — điều chuyển phòng ban', () => {
    it('lưu lịch sử bằng TÊN phòng, cập nhật departmentId của nhân viên', async () => {
      const emp: any = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Lan',
        departmentId: 'd1',
        chucDanh: 'Nhan vien',
        trangThai: 'dang_lam_viec',
      };
      const { svc, empRepo, histRepo, phongBan } = makeService(emp);

      await svc.create(
        {
          employeeId: EMP_ID,
          loaiThayDoi: 'dieu_chuyen',
          ngayHieuLuc: '2026-08-01',
          departmentIdMoi: 'd2',
        } as any,
        'Bearer abc',
      );

      expect(phongBan.list).toHaveBeenCalledWith('Bearer abc');
      const hist = histRepo.save.mock.calls[0][0];
      expect(hist.phongBanCu).toBe('Kế toán'); // tên tại thời điểm điều chuyển
      expect(hist.phongBanMoi).toBe('Nhân sự');
      expect(emp.departmentId).toBe('d2');
      expect(empRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: 'd2' }),
      );
    });

    it('không truyền departmentIdMoi thì giữ nguyên phòng của nhân viên', async () => {
      const emp: any = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Lan',
        departmentId: 'd1',
        chucDanh: 'Nhan vien',
        trangThai: 'dang_lam_viec',
      };
      const { svc, histRepo } = makeService(emp);

      await svc.create(
        {
          employeeId: EMP_ID,
          loaiThayDoi: 'bo_nhiem',
          ngayHieuLuc: '2026-08-01',
        } as any,
        'Bearer abc',
      );

      expect(emp.departmentId).toBe('d1');
      expect(histRepo.save.mock.calls[0][0].phongBanMoi).toBeUndefined();
    });

    it('id phòng mới không có trong danh mục thì tên là null, không ném lỗi', async () => {
      const emp: any = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Lan',
        departmentId: 'd1',
        chucDanh: 'Nhan vien',
        trangThai: 'dang_lam_viec',
      };
      const { svc, histRepo } = makeService(emp);

      await svc.create(
        {
          employeeId: EMP_ID,
          loaiThayDoi: 'dieu_chuyen',
          ngayHieuLuc: '2026-08-01',
          departmentIdMoi: 'd-la',
        } as any,
        'Bearer abc',
      );

      expect(histRepo.save.mock.calls[0][0].phongBanMoi).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — đổi trạng thái
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — đổi trạng thái', () => {
    it('updates the employee trangThai to trangThaiMoi', async () => {
      const emp: any = {
        _id: EMP_ID,
        employeeId: 'NV0002',
        hoTen: 'Tran Thi B',
        departmentId: 'd1',
        chucDanh: 'Truong phong',
        trangThai: 'dang_lam_viec',
      };
      const { svc, empRepo } = makeService(emp);

      const result = await svc.create(
        {
          employeeId: EMP_ID,
          loaiThayDoi: 'doi_trang_thai',
          ngayHieuLuc: '2026-08-01',
          trangThaiMoi: 'tam_nghi',
        } as any,
        'Bearer abc',
      );

      expect(result.trangThaiCu).toBe('dang_lam_viec');
      expect(result.trangThaiMoi).toBe('tam_nghi');
      expect(empRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'tam_nghi' }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — chỉ apply các trường có trong dto
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — chỉ apply các trường có trong dto', () => {
    it('leaves departmentId and trangThai unchanged when only chucDanhMoi is provided', async () => {
      const emp: any = {
        _id: EMP_ID,
        employeeId: 'NV0003',
        hoTen: 'Le Van C',
        departmentId: 'd1',
        chucDanh: 'Nhan vien',
        trangThai: 'dang_lam_viec',
      };
      const { svc, empRepo } = makeService(emp);

      await svc.create(
        {
          employeeId: EMP_ID,
          loaiThayDoi: 'bo_nhiem',
          ngayHieuLuc: '2026-08-01',
          chucDanhMoi: 'Truong phong',
        } as any,
        'Bearer abc',
      );

      expect(empRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: 'd1',
          trangThai: 'dang_lam_viec',
          chucDanh: 'Truong phong',
        }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — employeeId không tồn tại
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — employeeId không tồn tại', () => {
    it('throws NotFoundException when the employee cannot be found', async () => {
      const { svc, histRepo } = makeService(null);

      await expect(
        svc.create(
          {
            employeeId: '507f1f77bcf86cd799439099',
            loaiThayDoi: 'dieu_chuyen',
            ngayHieuLuc: '2026-08-01',
          } as any,
          'Bearer abc',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(histRepo.save).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('filters by employeeId and returns records sorted newest ngayHieuLuc first', async () => {
      const { svc, histRepo } = makeService(null);
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
      histRepo.find.mockResolvedValue(list);

      const result = await svc.findAll({ employeeId: EMP_ID });

      expect(histRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, employeeId: EMP_ID },
      });
      expect(result[0].ngayHieuLuc).toBe('2026-06-01');
      expect(result[1].ngayHieuLuc).toBe('2026-01-01');
    });

    it('defaults isActive filter to true', async () => {
      const { svc, histRepo } = makeService(null);

      await svc.findAll();

      expect(histRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('filters by loaiThayDoi', async () => {
      const { svc, histRepo } = makeService(null);

      await svc.findAll({ loaiThayDoi: 'tang_luong' });

      expect(histRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, loaiThayDoi: 'tang_luong' },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // remove — soft delete
  // ──────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('sets isActive=false instead of hard deleting', async () => {
      const { svc, histRepo } = makeService(null);
      const id = '507f1f77bcf86cd799439099';
      const existing = { _id: id, employeeId: EMP_ID, isActive: true };
      histRepo.findOne.mockResolvedValue(existing);

      await svc.remove(id);

      expect(histRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });
});
