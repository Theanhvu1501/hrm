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
function makeService(emp: any, soTepDinhKem = 1) {
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
  // Chứng từ đính kèm là BẮT BUỘC khi ghi nhận thay đổi (yêu cầu d13). Mặc
  // định trả 1 tệp để các bài cũ vẫn kiểm đúng thứ chúng định kiểm; bài nào
  // kiểm chính ràng buộc này thì truyền 0.
  const dinhKem = {
    danhSach: jest
      .fn()
      .mockResolvedValue(Array.from({ length: soTepDinhKem }, () => ({}))),
    ganLai: jest.fn().mockResolvedValue(1),
  };
  // Hai phụ thuộc cuối chỉ dùng cho `phuLuc()`; khai đủ để bài test sau này
  // gọi tới không vỡ vì `undefined`.
  const hopDong = {
    getThongTinCongTy: jest.fn().mockResolvedValue({ tenCongTy: 'CT Test' }),
  };
  const cauHinhLuongRepo = { find: jest.fn().mockResolvedValue([]) };
  const svc = new QuaTrinhCongTac_Service(
    histRepo as any,
    empRepo as any,
    phongBan as any,
    dinhKem as any,
    hopDong as any,
    cauHinhLuongRepo as any,
  );
  return { svc, empRepo, histRepo, phongBan, dinhKem, hopDong };
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
          idNhap: 'nhap-test',
          ngayHieuLuc: '2026-08-01',
          departmentIdMoi: 'd2',
        } as any,
        'Bearer abc',
      );

      expect(phongBan.list).toHaveBeenCalledWith('Bearer abc');
      const hist = histRepo.save.mock.calls[0][0];
      expect(hist.phongBanCu).toBe('Kế toán'); // tên tại thời điểm điều chuyển
      expect(hist.phongBanMoi).toBe('Nhân sự');
      // Denormalized identity of the employee onto the history record — a
      // future refactor that drops entity.employeeName/employeeCode should
      // fail here, not silently ship.
      expect(hist.employeeName).toBe('Lan');
      expect(hist.employeeCode).toBe('NV0001');
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
          idNhap: 'nhap-test',
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
          idNhap: 'nhap-test',
          ngayHieuLuc: '2026-08-01',
          departmentIdMoi: 'd-la',
        } as any,
        'Bearer abc',
      );

      expect(histRepo.save.mock.calls[0][0].phongBanMoi).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — bản ghi không đụng tới phòng ban: KHÔNG được phụ thuộc identity
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — không liên quan phòng ban', () => {
    it('nhân viên chưa có departmentId và dto không có departmentIdMoi thì không gọi danh mục identity', async () => {
      const emp: any = {
        _id: EMP_ID,
        employeeId: 'NV0004',
        hoTen: 'Pham Thi D',
        // Chưa có phòng ban (nhân viên mới) — departmentId cố ý bỏ trống.
        chucDanh: 'Nhan vien',
        trangThai: 'dang_lam_viec',
      };
      const { svc, empRepo, histRepo, phongBan } = makeService(emp);

      const result = await svc.create(
        {
          employeeId: EMP_ID,
          loaiThayDoi: 'tang_luong',
          idNhap: 'nhap-test',
          ngayHieuLuc: '2026-08-01',
          mucLuongMoi: 15000000,
        } as any,
        'Bearer abc',
      );

      // Một bản ghi tăng lương không đụng phòng ban không được phép thất bại
      // chỉ vì identity đang down — nên không gọi list() ở đây.
      expect(phongBan.list).not.toHaveBeenCalled();
      expect(result.phongBanCu).toBeUndefined();
      expect(result.phongBanMoi).toBeUndefined();
      expect(histRepo.save).toHaveBeenCalled();
      expect(empRepo.save).toHaveBeenCalled();
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
          idNhap: 'nhap-test',
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
          idNhap: 'nhap-test',
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
          idNhap: 'nhap-test',
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

// ────────────────────────────────────────────────────────────────────────────
// Yêu cầu d13: chứng từ bắt buộc + lương mới phải ghi vào hồ sơ
// ────────────────────────────────────────────────────────────────────────────
describe('QuaTrinhCongTac_Service — yêu cầu d13', () => {
  function nhanVien(over: any = {}) {
    return {
      _id: EMP_ID,
      employeeId: 'NV0001',
      hoTen: 'Lan',
      chucDanh: 'Nhân viên',
      trangThai: 'dang_lam_viec',
      luongThoaThuan: 10_000_000,
      giaTriKhoan: { PC_XANG_XE: 300_000 },
      ...over,
    };
  }

  it('không có chứng từ thì TỪ CHỐI ghi, không tạo bản ghi nào', async () => {
    const { svc, histRepo, empRepo } = makeService(nhanVien(), 0);

    await expect(
      svc.create(
        {
          employeeId: EMP_ID,
          loaiThayDoi: 'bo_nhiem',
          idNhap: 'nhap-1',
          ngayHieuLuc: '2026-09-01',
          soQuyetDinh: 'QĐ-01',
        } as any,
        'Bearer abc',
      ),
    ).rejects.toThrow(/đính kèm quyết định/);

    expect(histRepo.save).not.toHaveBeenCalled();
    expect(empRepo.save).not.toHaveBeenCalled();
  });

  it('thôi việc do màn Thôi việc sinh ra thì không đòi chứng từ ở đây', async () => {
    const { svc, histRepo } = makeService(nhanVien(), 0);

    await svc.create(
      {
        employeeId: EMP_ID,
        loaiThayDoi: 'thoi_viec',
        ngayHieuLuc: '2026-09-01',
        trangThaiMoi: 'da_nghi',
      } as any,
      'Bearer abc',
    );

    expect(histRepo.save).toHaveBeenCalled();
  });

  it('mức lương mới được ghi THẲNG vào hồ sơ, không chỉ nằm trên quyết định', async () => {
    const emp = nhanVien();
    const { svc, empRepo, histRepo } = makeService(emp);

    await svc.create(
      {
        employeeId: EMP_ID,
        loaiThayDoi: 'tang_luong',
        idNhap: 'nhap-1',
        ngayHieuLuc: '2026-09-01',
        mucLuongMoi: 15_000_000,
      } as any,
      'Bearer abc',
    );

    expect(emp.luongThoaThuan).toBe(15_000_000);
    expect(empRepo.save).toHaveBeenCalled();
    // Ảnh chụp mức cũ để còn đối chiếu và in phụ lục.
    expect(histRepo.save.mock.calls[0][0].mucLuongCu).toBe(10_000_000);
  });

  it('phụ cấp mới GỘP vào bảng cũ, không xoá các khoản không nhắc tới', async () => {
    const emp = nhanVien();
    const { svc, histRepo } = makeService(emp);

    await svc.create(
      {
        employeeId: EMP_ID,
        loaiThayDoi: 'bo_nhiem',
        idNhap: 'nhap-1',
        ngayHieuLuc: '2026-09-01',
        phuCapMoi: { PC_CHUC_VU: 2_000_000 },
      } as any,
      'Bearer abc',
    );

    expect(emp.giaTriKhoan).toStrictEqual({
      PC_XANG_XE: 300_000,
      PC_CHUC_VU: 2_000_000,
    });
    expect(histRepo.save.mock.calls[0][0].phuCapCu).toStrictEqual({
      PC_XANG_XE: 300_000,
    });
  });

  it('không gửi mức lương thì KHÔNG đụng tới lương đang có', async () => {
    const emp = nhanVien();
    const { svc } = makeService(emp);

    await svc.create(
      {
        employeeId: EMP_ID,
        loaiThayDoi: 'dieu_chuyen',
        idNhap: 'nhap-1',
        ngayHieuLuc: '2026-09-01',
      } as any,
      'Bearer abc',
    );

    expect(emp.luongThoaThuan).toBe(10_000_000);
  });

  it('chuyển tệp chứng từ từ id nháp sang id thật sau khi ghi', async () => {
    const { svc, dinhKem } = makeService(nhanVien());

    await svc.create(
      {
        employeeId: EMP_ID,
        loaiThayDoi: 'bo_nhiem',
        idNhap: 'nhap-abc',
        ngayHieuLuc: '2026-09-01',
      } as any,
      'Bearer abc',
    );

    expect(dinhKem.ganLai).toHaveBeenCalledWith(
      'qua_trinh_cong_tac',
      'nhap-abc',
      expect.any(String),
    );
  });
});
