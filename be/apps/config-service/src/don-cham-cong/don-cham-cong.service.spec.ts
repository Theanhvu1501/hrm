import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DonChamCong_Service } from './don-cham-cong.service';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import { AttendanceRequest, Employee } from '@app/entities';

/** Lấy `code` ra khỏi ForbiddenException để assert cho gọn — cùng tiện ích
 * đã dùng ở thiet-bi-cham-cong.service.spec.ts. */
async function batMaLoi(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (e: any) {
    return e?.response?.code ?? e?.getResponse?.()?.code;
  }
  throw new Error('Không ném lỗi như kỳ vọng');
}

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

    // Task 4 (lỗ hổng thứ hai): design spec §3 câu hỏi 7 — HR có thể nộp hộ
    // đơn cho người khác, nhưng đơn vẫn phải qua một bước duyệt để lại vết
    // (nguoiDuyetId/thoiDiemDuyet). Nếu create() tin trangThai client gửi,
    // người nộp đơn tự tạo thẳng một đơn "đã duyệt" mà không ai bấm duyệt cả
    // — cùng họ lỗ hổng với việc né PATCH :id/trang-thai, chỉ khác cửa vào.
    it('trangThai gửi kèm trong payload bị bỏ qua hoàn toàn — đơn luôn được tạo ở cho_duyet', async () => {
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
        trangThai: 'da_duyet',
      } as any);

      expect(result.trangThai).toBe('cho_duyet');
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'cho_duyet' }),
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
  // updateStatus — Task 4: chặn tự duyệt + ghi vết nguoiDuyetId/thoiDiemDuyet
  // ──────────────────────────────────────────────────────────────────────────
  describe('updateStatus', () => {
    const REQ_ID = '507f1f77bcf86cd799439099';

    beforeEach(() => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: REQ_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        isActive: true,
      });
    });

    it('người duyệt KHÁC chủ đơn: set da_duyet, ghi nguoiDuyet/nguoiDuyetId/thoiDiemDuyet', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({
        _id: EMP_ID,
        userId: 'sso-chu-don',
      });

      const result = await service.updateStatus(REQ_ID, 'da_duyet', 'Manager A', {
        id: 'sso-nguoi-duyet-khac',
      });

      expect(result.trangThai).toBe('da_duyet');
      expect(result.nguoiDuyet).toBe('Manager A');
      expect(result.nguoiDuyetId).toBe('sso-nguoi-duyet-khac');
      expect(typeof result.thoiDiemDuyet).toBe('string');
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          trangThai: 'da_duyet',
          nguoiDuyet: 'Manager A',
          nguoiDuyetId: 'sso-nguoi-duyet-khac',
        }),
      );
    });

    it.each(['da_duyet', 'tu_choi'])(
      'từ chối tự duyệt (trangThai=%s) khi req.user.id trùng userId của chủ đơn',
      async (trangThai) => {
        mockEmployeeRepo.findOne.mockResolvedValue({
          _id: EMP_ID,
          userId: 'sso-chu-don',
        });

        const code = await batMaLoi(() =>
          service.updateStatus(REQ_ID, trangThai, undefined, {
            id: 'sso-chu-don',
          }),
        );

        expect(code).toBe('KHONG_TU_DUYET_DON');
        // Tự duyệt bị chặn TRƯỚC khi ghi gì xuống DB — không được để lọt.
        expect(mockRequestRepo.save).not.toHaveBeenCalled();
      },
    );

    it('vẫn chặn tự duyệt dù người gọi có role quản trị (AdminGuard chỉ biết vaiTro, không biết đơn của ai)', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({
        _id: EMP_ID,
        userId: 'sso-chu-don',
      });

      const code = await batMaLoi(() =>
        service.updateStatus(REQ_ID, 'da_duyet', undefined, {
          id: 'sso-chu-don',
          vaiTro: 'ADMIN',
        } as any),
      );

      expect(code).toBe('KHONG_TU_DUYET_DON');
    });

    it('người khác duyệt: KHÔNG bị chặn dù cùng vaiTro ADMIN như chủ đơn', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({
        _id: EMP_ID,
        userId: 'sso-chu-don',
      });

      const result = await service.updateStatus(REQ_ID, 'tu_choi', undefined, {
        id: 'sso-nguoi-khac',
        vaiTro: 'ADMIN',
      } as any);

      expect(result.trangThai).toBe('tu_choi');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // update — Task 4 (đóng lỗ hổng "cửa thứ hai"): PUT :id KHÔNG được phép đổi
  // trangThai dưới bất kỳ hình thức nào. Trước đây update() chỉ
  // Object.assign(item, dto) rồi lưu, nên một ADMIN đồng thời là chủ đơn có
  // thể gọi PUT với { trangThai: 'da_duyet' } để tự duyệt, né hoàn toàn luật
  // KHONG_TU_DUYET_DON chỉ được kiểm trong updateStatus(). Quyết định thiết
  // kế: KHÔNG thêm một bản sao luật tự duyệt ở đây — chặn đứng khả năng
  // trangThai chạm tới repo.save từ nhánh update() luôn, vì vậy hai kịch bản
  // dưới (đơn của chính người gọi / đơn của người khác) đều phải cho cùng
  // một kết quả: trạng thái không đổi. Đó chính là luận điểm — PUT không di
  // chuyển trạng thái, không phải "PUT chặn được chủ đơn nhưng cho người
  // khác qua".
  // ──────────────────────────────────────────────────────────────────────────
  describe('update — PUT :id không được đổi trạng thái đơn', () => {
    const DON_ID_1 = '507f1f77bcf86cd799439021';
    const DON_ID_2 = '507f1f77bcf86cd799439022';

    it('PUT mang trangThai: da_duyet trên đơn của chính người gọi → trạng thái giữ nguyên, đơn KHÔNG được duyệt', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: DON_ID_1,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        lyDo: 'Lý do cũ',
      });

      const result = await service.update(DON_ID_1, {
        trangThai: 'da_duyet',
        lyDo: 'Lý do mới',
      } as any);

      expect(result.trangThai).toBe('cho_duyet');
      expect(result.nguoiDuyetId).toBeUndefined();
      expect(result.thoiDiemDuyet).toBeUndefined();
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'cho_duyet', lyDo: 'Lý do mới' }),
      );
    });

    it('PUT mang trangThai trên đơn của người khác → trạng thái vẫn không đổi (PUT không bao giờ được phép chuyển trạng thái)', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: DON_ID_2,
        employeeId: 'nhan-vien-khac-999',
        trangThai: 'cho_duyet',
      });

      const result = await service.update(DON_ID_2, {
        trangThai: 'tu_choi',
      } as any);

      expect(result.trangThai).toBe('cho_duyet');
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'cho_duyet' }),
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

  // ──────────────────────────────────────────────────────────────────────────
  // huyDonCuaToi — Task 4: tự huỷ đơn CỦA CHÍNH MÌNH, chỉ khi còn cho_duyet
  // ──────────────────────────────────────────────────────────────────────────
  describe('huyDonCuaToi', () => {
    const REQ_ID = '507f1f77bcf86cd799439099';

    it('huỷ thành công (isActive=false) khi đúng chủ đơn và đơn còn cho_duyet', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: REQ_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        isActive: true,
      });

      await service.huyDonCuaToi(REQ_ID, EMP_ID);

      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('chặn huỷ đơn của người khác (employeeId không khớp)', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: REQ_ID,
        employeeId: 'emp-nguoi-khac',
        trangThai: 'cho_duyet',
        isActive: true,
      });

      await expect(
        service.huyDonCuaToi(REQ_ID, EMP_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it.each(['da_duyet', 'tu_choi'])(
      'chặn tự huỷ khi đơn đã xử lý (trangThai=%s)',
      async (trangThai) => {
        mockRequestRepo.findOne.mockResolvedValue({
          _id: REQ_ID,
          employeeId: EMP_ID,
          trangThai,
          isActive: true,
        });

        await expect(
          service.huyDonCuaToi(REQ_ID, EMP_ID),
        ).rejects.toThrow(ForbiddenException);
        expect(mockRequestRepo.save).not.toHaveBeenCalled();
      },
    );
  });
});
