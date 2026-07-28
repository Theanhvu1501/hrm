import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DonChamCong_Service } from './don-cham-cong.service';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { QuyPhep_Service } from '../quy-phep/quy-phep.service';
import { tinhSoNgayNghi } from './luat-don';
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
  let mockNhanVienService: {
    resolveEmployeeFromUser: jest.Mock;
  };
  let mockQuyPhepService: {
    phanBoChoNgayNghi: jest.Mock;
    giuCho: jest.Mock;
    nhaCho: jest.Mock;
    chuyenSangDaDung: jest.Mock;
    hoanTraDaDung: jest.Mock;
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

    // Mặc định: người gọi KHÔNG có hồ sơ nhân viên nào — đúng như
    // `resolveEmployeeFromUser` ném NotFoundException ngoài đời. Chọn mặc
    // định này để test nào cần nhận diện chủ đơn qua hồ sơ thì phải khai
    // tường minh, không được hưởng lợi từ một mock rộng rãi.
    mockNhanVienService = {
      resolveEmployeeFromUser: jest
        .fn()
        .mockRejectedValue(
          new NotFoundException(
            'Tài khoản chưa được liên kết với hồ sơ nhân viên',
          ),
        ),
    };

    // Mặc định vô hại cho các describe cũ không quan tâm tới quỹ phép: trả
    // mảng rỗng nên `create()` không có gì để giữ chỗ (nhánh `phanBoQuy?.length`
    // không chạy). Describe "nối quỹ phép" bên dưới tự cấp provider riêng qua
    // `dungServiceDon()`, không dùng biến này.
    mockQuyPhepService = {
      phanBoChoNgayNghi: jest.fn().mockResolvedValue([]),
      giuCho: jest.fn().mockResolvedValue(undefined),
      nhaCho: jest.fn().mockResolvedValue(undefined),
      chuyenSangDaDung: jest.fn().mockResolvedValue(undefined),
      hoanTraDaDung: jest.fn().mockResolvedValue(undefined),
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
        { provide: NhanVien_Service, useValue: mockNhanVienService },
        { provide: QuyPhep_Service, useValue: mockQuyPhepService },
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
    // ngayChinhThuc: bắt buộc phải có, nếu không P3.8 chặn NGAY ở cửa thử
    // việc (CHUA_LEN_CHINH_THUC) trước khi soNgayNghi kịp tính — hai test
    // dưới đây không nhắm vào luật đó nên fixture phải "đã chính thức".
    const employee = {
      _id: EMP_ID,
      employeeId: 'NV0001',
      hoTen: 'Nguyen Van A',
      ngayLamViecTrongTuan: T2_DEN_T6,
      ngayChinhThuc: '2026-01-01',
    };

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

    // ────────────────────────────────────────────────────────────────────────
    // Task 4c mục 2: luật không-tự-duyệt từng fail-OPEN khi hồ sơ chủ đơn
    // không (còn) gắn `userId` — điều kiện cũ là `chuDon.userId && ...`, nên
    // `userId` rỗng làm cả vế trái thành false và đơn được duyệt trót lọt.
    // `nhan-vien.service.ts` CỐ Ý cho ghi `userId: ''` để HR gỡ liên kết, mà
    // `/nhan-su/ho-so-nhan-vien:sua` + `/cham-cong/don-tu:sua` lại nằm cùng
    // một vai trò trên production — nên "gỡ userId của mình → tự duyệt → gắn
    // lại" là ba bước trong tầm tay HR bình thường, không cần ADMIN.
    // ────────────────────────────────────────────────────────────────────────
    describe('chủ đơn KHÔNG có userId trên hồ sơ (fail-closed)', () => {
      it('chặn khi hồ sơ nhân viên của người gọi CHÍNH LÀ chủ đơn', async () => {
        mockEmployeeRepo.findOne.mockResolvedValue({
          _id: EMP_ID,
          // Vừa bị gỡ liên kết ngay trước khi bấm duyệt.
          userId: '',
        });
        mockNhanVienService.resolveEmployeeFromUser.mockResolvedValue({
          _id: EMP_ID,
        });

        const code = await batMaLoi(() =>
          service.updateStatus(REQ_ID, 'da_duyet', undefined, {
            id: 'sso-chu-don',
          }),
        );

        expect(code).toBe('KHONG_TU_DUYET_DON');
        expect(mockRequestRepo.save).not.toHaveBeenCalled();
      });

      it('vẫn cho qua khi hồ sơ của người gọi là người KHÁC', async () => {
        mockEmployeeRepo.findOne.mockResolvedValue({ _id: EMP_ID, userId: '' });
        mockNhanVienService.resolveEmployeeFromUser.mockResolvedValue({
          _id: '507f1f77bcf86cd7994390ff',
        });

        const result = await service.updateStatus(
          REQ_ID,
          'da_duyet',
          undefined,
          { id: 'sso-nguoi-duyet' },
        );

        expect(result.trangThai).toBe('da_duyet');
      });

      it('cho qua khi người gọi không có hồ sơ nhân viên nào — không tồn tại "chính mình" để so', async () => {
        mockEmployeeRepo.findOne.mockResolvedValue({ _id: EMP_ID, userId: '' });
        // mock mặc định của beforeEach đã ném NotFoundException.

        const result = await service.updateStatus(
          REQ_ID,
          'da_duyet',
          undefined,
          { id: 'sso-khong-co-ho-so' },
        );

        expect(result.trangThai).toBe('da_duyet');
      });

      it('lỗi KHÁC NotFound khi tra hồ sơ người gọi được ném tiếp, không âm thầm cho duyệt', async () => {
        mockEmployeeRepo.findOne.mockResolvedValue({ _id: EMP_ID, userId: '' });
        mockNhanVienService.resolveEmployeeFromUser.mockRejectedValue(
          new Error('mất kết nối DB'),
        );

        await expect(
          service.updateStatus(REQ_ID, 'da_duyet', undefined, {
            id: 'sso-chu-don',
          }),
        ).rejects.toThrow('mất kết nối DB');
        expect(mockRequestRepo.save).not.toHaveBeenCalled();
      });

      it('không tra hồ sơ người gọi khi chủ đơn VẪN có userId — đường cũ không đổi', async () => {
        mockEmployeeRepo.findOne.mockResolvedValue({
          _id: EMP_ID,
          userId: 'sso-chu-don',
        });

        await service.updateStatus(REQ_ID, 'tu_choi', undefined, {
          id: 'sso-nguoi-khac',
        });

        expect(
          mockNhanVienService.resolveEmployeeFromUser,
        ).not.toHaveBeenCalled();
      });
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

    // vòng sửa 2 (task-4-fix2): employeeId là đầu vào của luật KHONG_TU_DUYET_DON
    // (luật đọc chủ đơn qua findEmployee(item.employeeId) tại thời điểm duyệt).
    // Nếu PUT còn ghi được employeeId thì kẻ tấn công đổi đơn về tên đồng
    // nghiệp, nhờ đồng nghiệp (hoặc chính mình với vaiTro ADMIN) duyệt hộ, rồi
    // đổi employeeId về lại chính mình — đơn cuối cùng là "của mình, do mình
    // duyệt" mà không route nào phát hiện được, vì luật chỉ kiểm tra tại thời
    // điểm PATCH :id/trang-thai, không kiểm tra lại sau đó.
    it('PUT mang employeeId khác → employeeId của đơn KHÔNG đổi (chủ đơn chốt lúc tạo, không sửa qua PUT)', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: DON_ID_1,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
      });

      const result = await service.update(DON_ID_1, {
        employeeId: 'nhan-vien-khac-999',
      } as any);

      expect(result.employeeId).toBe(EMP_ID);
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: EMP_ID }),
      );
    });

    // nguoiDuyet (tên hiển thị) chỉ nên di chuyển cùng nguoiDuyetId (id đáng
    // tin) trong updateStatus(). Nếu PUT ghi được nguoiDuyet riêng, tên người
    // xem đọc trên UI và id người soát vết trong nguoiDuyetId lệch nhau mà
    // không ai phát hiện — một dạng giả mạo vết duyệt nhẹ hơn nhưng cùng gốc.
    it('PUT mang nguoiDuyet → không ghi được (chỉ updateStatus() mới được ghi vết duyệt)', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: DON_ID_1,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
      });

      const result = await service.update(DON_ID_1, {
        nguoiDuyet: 'Manager Giả Mạo',
      } as any);

      expect(result.nguoiDuyet).toBeUndefined();
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.not.objectContaining({ nguoiDuyet: 'Manager Giả Mạo' }),
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

// ────────────────────────────────────────────────────────────────────────
// P3.8 — nối quỹ phép vào vòng đời đơn nghỉ phép (Task 8)
//
// Bộ test này KHÔNG dùng harness jest.fn() rời rạc ở đầu file (top-level
// `beforeEach`) — nó cần dựng nhiều tổ hợp (nhân viên thử việc/chính thức,
// nhiều hành vi QuyPhep_Service khác nhau) mà giữ NGUYÊN trạng thái của đơn
// đã lưu qua nhiều lệnh gọi (create → updateStatus/huyDonCuaToi/remove) để
// so khớp `phanBoQuy` snapshot. Vì vậy dùng lại đúng khuôn "repo giả" mature
// đã chứng minh đúng trong quy-phep.service.spec.ts (kho mảng, save xử lý cả
// insert lẫn update, find/findOne trả bản sao nông) thay vì mock jest.fn()
// rời rạc — mock rời rạc không giữ được trạng thái giữa các lệnh gọi trong
// cùng một test mà không tự tay chằng chịt lại `mockResolvedValueOnce`.
// ────────────────────────────────────────────────────────────────────────
describe('DonChamCong_Service — nối quỹ phép (P3.8)', () => {
  const ID_NV1 = '650000000000000000000001';
  const ID_Q2026 = '6500000000000000000000a1';
  const PHAN_BO = [{ balanceId: ID_Q2026, nam: 2026, soNgay: 2 }];

  /** Repo giả tối thiểu: đủ find/findOne/save/create — cùng khuôn với
   * `taoRepoGia` trong quy-phep.service.spec.ts.
   *
   * `save` là `jest.fn()` bọc quanh implementation (review round 1, MINOR
   * 7): repo giả này đẩy CHÍNH tham chiếu vào `kho` và trả lại cùng object,
   * nên bất kỳ đoạn code nào mutate object đó tại chỗ (không gọi lại
   * `save()`) vẫn "vô tình" phản ánh vào `kho` — đọc `kho.at(-1)` sau đó
   * KHÔNG phân biệt được "đã gọi save() lần hai" với "chỉ mutate suông".
   * Bọc `jest.fn()` để test đếm được số lần `save()` thực sự được gọi, thứ
   * duy nhất phản ánh đúng ý đồ implementation. */
  function taoRepoGiaDon<T extends { _id?: any }>(banDau: T[] = []) {
    const kho: any[] = [...banDau];
    let seq = 0;
    const save = jest.fn(async (x: any) => {
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
    });
    return {
      kho,
      create: (x: any) => ({ ...x }),
      save,
      find: async ({ where }: any = {}) =>
        kho
          .filter((x) =>
            Object.entries(where ?? {}).every(
              ([k, v]) => (x as any)[k] === v,
            ),
          )
          .map((x) => ({ ...x })),
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

  function mockQuyPhep(ghiDe: Record<string, any> = {}) {
    return {
      phanBoChoNgayNghi: jest.fn().mockResolvedValue(PHAN_BO),
      giuCho: jest.fn().mockResolvedValue(undefined),
      nhaCho: jest.fn().mockResolvedValue(undefined),
      chuyenSangDaDung: jest.fn().mockResolvedValue(undefined),
      hoanTraDaDung: jest.fn().mockResolvedValue(undefined),
      ...ghiDe,
    };
  }

  /** Nhân viên mặc định: đã chính thức, làm T2→CN (không cần loại trừ ngày
   * nào riêng — các test dưới đây không nhắm vào lịch làm việc trừ khi khai
   * `nhanVien` tường minh). */
  function nhanVienMacDinh() {
    return {
      _id: { toString: () => ID_NV1 },
      employeeId: 'NV0001',
      hoTen: 'Nguyễn Văn A',
      ngayChinhThuc: '2026-01-01',
      ngayLamViecTrongTuan: [0, 1, 2, 3, 4, 5, 6],
    };
  }

  async function dungServiceDon(
    tuyChon: { quyPhep?: any; nhanVien?: any; ngayLe?: any } = {},
  ) {
    const repoDon = taoRepoGiaDon<any>();
    const repoNv = taoRepoGiaDon<any>([tuyChon.nhanVien ?? nhanVienMacDinh()]);
    const quyPhep = tuyChon.quyPhep ?? mockQuyPhep();
    const ngayLe = tuyChon.ngayLe ?? {
      timTheoNgay: jest.fn().mockResolvedValue(null),
    };
    const nhanVienSvc = {
      resolveEmployeeFromUser: jest
        .fn()
        .mockRejectedValue(new NotFoundException()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonChamCong_Service,
        { provide: getRepositoryToken(AttendanceRequest), useValue: repoDon },
        { provide: getRepositoryToken(Employee), useValue: repoNv },
        { provide: NgayLe_Service, useValue: ngayLe },
        { provide: NhanVien_Service, useValue: nhanVienSvc },
        { provide: QuyPhep_Service, useValue: quyPhep },
      ],
    }).compile();

    return {
      service: module.get<DonChamCong_Service>(DonChamCong_Service),
      repoDon,
      quyPhep,
    };
  }

  const DON_PHEP = {
    employeeId: ID_NV1,
    loaiDon: 'nghi_phep',
    loaiNghi: 'phep_nam',
    ngay: '2027-02-01',
    denNgay: '2027-02-02',
  };

  it('NV chưa lên chính thức nộp phep_nam → 409, KHÔNG giữ chỗ', async () => {
    const quyPhep = mockQuyPhep();
    // Hồ sơ không có ngayChinhThuc = còn thử việc.
    const { service } = await dungServiceDon({
      quyPhep,
      nhanVien: { _id: { toString: () => ID_NV1 }, hoTen: 'A', employeeId: 'NV0001' },
    });

    await expect(service.create(DON_PHEP as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(quyPhep.phanBoChoNgayNghi).not.toHaveBeenCalled();
    expect(quyPhep.giuCho).not.toHaveBeenCalled();
  });

  it('loaiNghi khác phep_nam (om_dau) KHÔNG đụng quỹ, kể cả khi còn thử việc', async () => {
    const quyPhep = mockQuyPhep();
    const { service } = await dungServiceDon({
      quyPhep,
      nhanVien: { _id: { toString: () => ID_NV1 }, hoTen: 'A', employeeId: 'NV0001' },
    });

    await service.create({ ...DON_PHEP, loaiNghi: 'om_dau' } as any);

    expect(quyPhep.phanBoChoNgayNghi).not.toHaveBeenCalled();
    expect(quyPhep.giuCho).not.toHaveBeenCalled();
  });

  it('tạo đơn phep_nam giữ chỗ và snapshot phanBoQuy lên đơn', async () => {
    const quyPhep = mockQuyPhep();
    const { service, repoDon } = await dungServiceDon({ quyPhep });

    await service.create(DON_PHEP as any);

    // giuCho(employeeId, phanBo, requestId, nguoiThucHien) — 4 tham số thật
    // (xem quy-phep.service.ts), khác thứ tự với đề bài task ban đầu.
    expect(quyPhep.giuCho).toHaveBeenCalledWith(
      ID_NV1,
      PHAN_BO,
      expect.any(String),
      ID_NV1,
    );
    expect(repoDon.kho.at(-1).phanBoQuy).toEqual(PHAN_BO);
  });

  it('quỹ không đủ → ném 409 và KHÔNG lưu đơn nào', async () => {
    const quyPhep = mockQuyPhep({
      phanBoChoNgayNghi: jest
        .fn()
        .mockRejectedValue(new ConflictException({ code: 'KHONG_DU_SO_DU' })),
    });
    const { service, repoDon } = await dungServiceDon({ quyPhep });
    const truoc = repoDon.kho.length;

    await expect(service.create(DON_PHEP as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repoDon.kho.length).toBe(truoc);
  });

  it('giữ chỗ hỏng sau khi đã lưu đơn → đơn bị vô hiệu hoá, không để lại đơn ma', async () => {
    const quyPhep = mockQuyPhep({
      giuCho: jest.fn().mockRejectedValue(new Error('mất kết nối')),
    });
    const { service, repoDon } = await dungServiceDon({ quyPhep });

    await expect(service.create(DON_PHEP as any)).rejects.toThrow('mất kết nối');

    expect(repoDon.kho.at(-1).isActive).toBe(false);
    // (review round 1, IMPORTANT 3): best-effort nhả phần có thể đã giữ được
    // TRƯỚC khi vô hiệu hoá đơn, và xoá snapshot để không ai nhả lần hai.
    expect(quyPhep.nhaCho).toHaveBeenCalledWith(
      ID_NV1,
      PHAN_BO,
      expect.any(String),
      ID_NV1,
    );
    expect(repoDon.kho.at(-1).phanBoQuy).toBeUndefined();
    // (review round 1, MINOR 7): repo giả trả lại CHÍNH tham chiếu vừa
    // insert, nên `daLuu.isActive = false` mutate tại chỗ cũng "vô tình"
    // hiện trong `kho` dù implementation QUÊN gọi lại `repo.save()`. Đếm số
    // lần `save()` thực sự được gọi mới phân biệt được hai trường hợp: 1
    // (insert) + 1 (update vô hiệu hoá) = 2. Tự thử xoá dòng
    // `await this.repo.save(daLuu)` trong nhánh catch của create() và chạy
    // lại test này để xác nhận nó ĐỎ trên đúng assertion này (đã tự kiểm khi
    // làm fix round 1 — không commit bước thử).
    expect(repoDon.save).toHaveBeenCalledTimes(2);
  });

  it('duyệt đơn → chuyenSangDaDung với đúng phanBoQuy của đơn', async () => {
    const quyPhep = mockQuyPhep();
    const { service, repoDon } = await dungServiceDon({ quyPhep });
    const don = await service.create(DON_PHEP as any);

    await service.updateStatus(
      String((don as any)._id),
      'da_duyet',
      'HR',
      { id: 'user-hr' } as any,
    );

    expect(quyPhep.chuyenSangDaDung).toHaveBeenCalledWith(
      ID_NV1,
      PHAN_BO,
      String((don as any)._id),
      'user-hr',
    );
    expect(quyPhep.nhaCho).not.toHaveBeenCalled();
    expect(repoDon.kho.at(-1).trangThai).toBe('da_duyet');
  });

  it('từ chối đơn → nhaCho, quỹ trở về như trước khi nộp', async () => {
    const quyPhep = mockQuyPhep();
    const { service } = await dungServiceDon({ quyPhep });
    const don = await service.create(DON_PHEP as any);

    await service.updateStatus(
      String((don as any)._id),
      'tu_choi',
      'HR',
      { id: 'user-hr' } as any,
    );

    expect(quyPhep.nhaCho).toHaveBeenCalledWith(
      ID_NV1,
      PHAN_BO,
      String((don as any)._id),
      'user-hr',
    );
    expect(quyPhep.chuyenSangDaDung).not.toHaveBeenCalled();
  });

  it('tự huỷ đơn cho_duyet → nhaCho', async () => {
    const quyPhep = mockQuyPhep();
    const { service } = await dungServiceDon({ quyPhep });
    const don = await service.create(DON_PHEP as any);

    await service.huyDonCuaToi(String((don as any)._id), ID_NV1);

    expect(quyPhep.nhaCho).toHaveBeenCalled();
    expect(quyPhep.hoanTraDaDung).not.toHaveBeenCalled();
  });

  it('xoá đơn ĐÃ DUYỆT → hoanTraDaDung, không phải nhaCho, mặc định nguoiThucHien = he_thong', async () => {
    const quyPhep = mockQuyPhep();
    const { service, repoDon } = await dungServiceDon({ quyPhep });
    const don = await service.create(DON_PHEP as any);
    repoDon.kho.at(-1).trangThai = 'da_duyet';

    await service.remove(String((don as any)._id));

    expect(quyPhep.hoanTraDaDung).toHaveBeenCalledWith(
      ID_NV1,
      PHAN_BO,
      String((don as any)._id),
      'he_thong',
    );
    expect(quyPhep.nhaCho).not.toHaveBeenCalled();
  });

  // (review round 1, MINOR 5): hoanTraDaDung() là thao tác DUY NHẤT trả
  // ngày lại mà ghi vào sổ (leave_balance_entries) — phải ghi đúng tên
  // người xoá thay vì luôn là 'he_thong'.
  it('xoá đơn ĐÃ DUYỆT truyền nguoiThucHien → hoanTraDaDung ghi đúng người xoá', async () => {
    const quyPhep = mockQuyPhep();
    const { service, repoDon } = await dungServiceDon({ quyPhep });
    const don = await service.create(DON_PHEP as any);
    repoDon.kho.at(-1).trangThai = 'da_duyet';

    await service.remove(String((don as any)._id), { id: 'hr-xoa-don' } as any);

    expect(quyPhep.hoanTraDaDung).toHaveBeenCalledWith(
      ID_NV1,
      PHAN_BO,
      String((don as any)._id),
      'hr-xoa-don',
    );
  });

  // (review round 1, IMPORTANT 4): findOne() không lọc isActive — remove()
  // gọi SAU khi huyDonCuaToi() đã vô hiệu hoá đơn (vẫn cho_duyet, vẫn còn
  // phanBoQuy) không được nhả chỗ lần hai, vì soNgayDangChoDuyet dùng chung
  // theo quỹ, không tách theo đơn — nhả lần hai ăn nhầm chỗ giữ của đơn khác.
  it('remove() sau khi đơn đã bị huyDonCuaToi() KHÔNG nhả chỗ lần hai', async () => {
    const quyPhep = mockQuyPhep();
    const { service } = await dungServiceDon({ quyPhep });
    const don = await service.create(DON_PHEP as any);

    await service.huyDonCuaToi(String((don as any)._id), ID_NV1);
    expect(quyPhep.nhaCho).toHaveBeenCalledTimes(1);

    // Đơn vẫn còn trangThai='cho_duyet' (huyDonCuaToi chỉ đổi isActive) —
    // remove() gọi lại trên đúng đơn này phải là no-op về mặt quỹ.
    await service.remove(String((don as any)._id));
    expect(quyPhep.nhaCho).toHaveBeenCalledTimes(1);
    expect(quyPhep.hoanTraDaDung).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Điều kiện sống còn của toàn bộ tính năng: cacNgayTruPhep() (dùng để gọi
  // QuyPhep_Service.phanBoChoNgayNghi) và tinhSoNgayNghi() (dùng để tính
  // soNgayNghi snapshot trên đơn) PHẢI luôn đếm ra cùng một con số, vì
  // phanBoChoNgayNghi() tự ném BadRequestException nếu
  // `soNgayNghi !== cacNgayNghi.length`. Test dưới đây cố tình bắt cả HAI
  // điều kiện gây lệch trong CÙNG một khoảng: cuối tuần (T7/CN) VÀ một ngày
  // lễ giữa tuần.
  // ──────────────────────────────────────────────────────────────────────
  it('cacNgayTruPhep khớp tinhSoNgayNghi khi khoảng vắt qua cả cuối tuần lẫn ngày lễ', async () => {
    // 2027-02-01 (T2) .. 2027-02-08 (T2 tuần sau): 8 ngày, trong đó T7 6/2 và
    // CN 7/2 không thuộc lịch làm việc, và 3/2 (T4) được mô phỏng là ngày lễ.
    const NGAY_LE = '2027-02-03';
    const ngayLe = {
      timTheoNgay: jest
        .fn()
        .mockImplementation((ngay: string) =>
          Promise.resolve(
            ngay === NGAY_LE
              ? { _id: 'hl1', tenNgayLe: 'Ngày lễ test', tuNgay: NGAY_LE, denNgay: NGAY_LE }
              : null,
          ),
        ),
    };
    const quyPhep = mockQuyPhep();
    const { service } = await dungServiceDon({
      quyPhep,
      ngayLe,
      nhanVien: {
        _id: { toString: () => ID_NV1 },
        employeeId: 'NV0001',
        hoTen: 'Nguyễn Văn A',
        ngayChinhThuc: '2026-01-01',
        ngayLamViecTrongTuan: [1, 2, 3, 4, 5], // T2→T6, không làm T7/CN
      },
    });

    const result = await service.create({
      ...DON_PHEP,
      ngay: '2027-02-01',
      denNgay: '2027-02-08',
    } as any);

    // Nguồn đối chiếu độc lập: gọi thẳng tinhSoNgayNghi() (luat-don.ts) —
    // hàm THẬT dùng để tính soNgayNghi snapshot trên đơn.
    const soNgayNghiMongDoi = tinhSoNgayNghi({
      tuNgay: '2027-02-01',
      denNgay: '2027-02-08',
      ngayLeTrongKhoang: [NGAY_LE],
      ngayLamViecTrongTuan: [1, 2, 3, 4, 5],
    });
    expect(soNgayNghiMongDoi).toBe(5); // 8 ngày - T7 - CN - 1 lễ giữa tuần
    expect(result.soNgayNghi).toBe(soNgayNghiMongDoi);

    // cacNgayTruPhep() lộ diện qua danh sách gửi cho phanBoChoNgayNghi().
    expect(quyPhep.phanBoChoNgayNghi).toHaveBeenCalledTimes(1);
    const [employeeIdGoi, cacNgayGoi, soNgayGoi] =
      quyPhep.phanBoChoNgayNghi.mock.calls[0];
    expect(employeeIdGoi).toBe(ID_NV1);
    expect(cacNgayGoi).toEqual([
      '2027-02-01',
      '2027-02-02',
      '2027-02-04',
      '2027-02-05',
      '2027-02-08',
    ]);
    expect(soNgayGoi).toBe(soNgayNghiMongDoi);
    // Đúng điều kiện guard mà phanBoChoNgayNghi() tự kiểm trong QuyPhep_Service.
    expect(cacNgayGoi.length).toBe(soNgayGoi);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Review round 1, CRITICAL — updateStatus() phải rẽ nhánh quỹ theo CẶP
  // (trạng thái CŨ → trạng thái ĐÍCH), không phải theo trạng thái đích một
  // mình. Bảng đầy đủ trong doc-comment của updateStatus().
  // ──────────────────────────────────────────────────────────────────────
  describe('updateStatus — rẽ nhánh quỹ theo CẶP (cũ → mới)', () => {
    async function taoDonVaDuyet(quyPhep: any) {
      const { service, repoDon } = await dungServiceDon({ quyPhep });
      const don = await service.create(DON_PHEP as any);
      return { service, repoDon, id: String((don as any)._id) };
    }

    it('duyệt hai lần liên tiếp (bấm đúp/retry) → lần hai KHÔNG trừ thêm', async () => {
      const quyPhep = mockQuyPhep();
      const { service, id } = await taoDonVaDuyet(quyPhep);

      await service.updateStatus(id, 'da_duyet', 'HR', { id: 'user-hr' } as any);
      await service.updateStatus(id, 'da_duyet', 'HR', { id: 'user-hr' } as any);

      expect(quyPhep.chuyenSangDaDung).toHaveBeenCalledTimes(1);
    });

    it('da_duyet → tu_choi gọi hoanTraDaDung (KHÔNG phải nhaCho) — trả lại phần đã trừ thật', async () => {
      const quyPhep = mockQuyPhep();
      const { service, repoDon, id } = await taoDonVaDuyet(quyPhep);
      await service.updateStatus(id, 'da_duyet', 'HR', { id: 'user-hr' } as any);

      await service.updateStatus(id, 'tu_choi', undefined, { id: 'user-hr-2' } as any);

      expect(quyPhep.hoanTraDaDung).toHaveBeenCalledWith(
        ID_NV1,
        PHAN_BO,
        id,
        'user-hr-2',
      );
      expect(quyPhep.nhaCho).not.toHaveBeenCalled();
      expect(repoDon.kho.at(-1).trangThai).toBe('tu_choi');
    });

    it('tu_choi → cho_duyet gọi giuCho lại (mở lại đơn đã từ chối)', async () => {
      const quyPhep = mockQuyPhep();
      const { service, repoDon, id } = await taoDonVaDuyet(quyPhep);
      await service.updateStatus(id, 'tu_choi', 'HR', { id: 'user-hr' } as any);
      quyPhep.giuCho.mockClear(); // giuCho đã chạy 1 lần lúc create() — đếm sạch lại

      await service.updateStatus(id, 'cho_duyet', undefined, { id: 'user-hr-2' } as any);

      expect(quyPhep.giuCho).toHaveBeenCalledWith(
        ID_NV1,
        PHAN_BO,
        id,
        'user-hr-2',
      );
      expect(repoDon.kho.at(-1).trangThai).toBe('cho_duyet');
    });

    // (P3.8 fix round 2, Part B): giuCho()/nhaCho() KHÔNG ghi sổ — không có
    // dấu vết để tự chống trùng như chuyenSangDaDung()/hoanTraDaDung() (Phần
    // A, quy-phep.service.ts). Nếu giuCho() hỏng giữa chừng trên phanBoQuy
    // ≥2 phần tử, phần đã giữ được (quỹ đầu) phải được NHẢ LẠI best-effort
    // ngay trong catch — nếu không, đơn quay về tu_choi nhưng vẫn còn giữ
    // một phần số dư không ai biết.
    it('tu_choi → cho_duyet: giuCho thiếu số dư → 409, bù best-effort bằng nhaCho, đơn khôi phục về tu_choi', async () => {
      const quyPhep = mockQuyPhep();
      const { service, repoDon, id } = await taoDonVaDuyet(quyPhep);
      await service.updateStatus(id, 'tu_choi', 'HR', { id: 'user-hr' } as any);
      quyPhep.giuCho.mockRejectedValueOnce(
        new ConflictException({ code: 'KHONG_DU_SO_DU' }),
      );
      quyPhep.nhaCho.mockClear(); // nhaCho đã chạy 1 lần lúc tu_choi ở trên — đếm sạch lại

      await expect(
        service.updateStatus(id, 'cho_duyet', undefined, { id: 'user-hr-2' } as any),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(repoDon.kho.at(-1).trangThai).toBe('tu_choi');
      // Bù best-effort: gọi nhaCho() trên TOÀN BỘ phanBoQuy để nhả lại phần
      // giuCho() có thể đã giữ được trước khi hỏng.
      expect(quyPhep.nhaCho).toHaveBeenCalledWith(
        ID_NV1,
        PHAN_BO,
        id,
        'user-hr-2',
      );
    });

    // Nhánh song sinh: nhaCho() (cho_duyet→tu_choi) hỏng giữa chừng → bù
    // best-effort bằng giuCho() lại toàn bộ phanBoQuy, đơn khôi phục về
    // cho_duyet (trạng thái trước khi thử từ chối).
    it('cho_duyet → tu_choi: nhaCho hỏng → bù best-effort bằng giuCho, đơn khôi phục về cho_duyet', async () => {
      const quyPhep = mockQuyPhep({
        nhaCho: jest.fn().mockRejectedValue(new Error('mất kết nối')),
      });
      const { service, repoDon, id } = await taoDonVaDuyet(quyPhep);
      quyPhep.giuCho.mockClear(); // giuCho đã chạy 1 lần lúc create() — đếm sạch lại

      await expect(
        service.updateStatus(id, 'tu_choi', undefined, { id: 'user-hr' } as any),
      ).rejects.toThrow('mất kết nối');

      expect(repoDon.kho.at(-1).trangThai).toBe('cho_duyet');
      // Bù best-effort: gọi giuCho() lại trên TOÀN BỘ phanBoQuy để giữ lại
      // phần nhaCho() có thể đã nhả trước khi hỏng.
      expect(quyPhep.giuCho).toHaveBeenCalledWith(
        ID_NV1,
        PHAN_BO,
        id,
        'user-hr',
      );
    });

    it('da_duyet → cho_duyet BỊ CHẶN 409, trạng thái đơn KHÔNG đổi', async () => {
      const quyPhep = mockQuyPhep();
      const { service, repoDon, id } = await taoDonVaDuyet(quyPhep);
      await service.updateStatus(id, 'da_duyet', 'HR', { id: 'user-hr' } as any);
      quyPhep.giuCho.mockClear(); // giuCho đã chạy 1 lần lúc create() — đếm sạch lại

      const loi = await service
        .updateStatus(id, 'cho_duyet', undefined, { id: 'user-hr-2' } as any)
        .catch((e) => e);

      expect(loi).toBeInstanceOf(ConflictException);
      expect((loi as any).getResponse().code).toBe(
        'CHUYEN_TRANG_THAI_KHONG_HOP_LE',
      );
      expect(repoDon.kho.at(-1).trangThai).toBe('da_duyet');
      expect(quyPhep.giuCho).not.toHaveBeenCalled();
    });

    it('tu_choi → da_duyet BỊ CHẶN 409, trạng thái đơn KHÔNG đổi', async () => {
      const quyPhep = mockQuyPhep();
      const { service, repoDon, id } = await taoDonVaDuyet(quyPhep);
      await service.updateStatus(id, 'tu_choi', 'HR', { id: 'user-hr' } as any);

      const loi = await service
        .updateStatus(id, 'da_duyet', undefined, { id: 'user-hr-2' } as any)
        .catch((e) => e);

      expect(loi).toBeInstanceOf(ConflictException);
      expect((loi as any).getResponse().code).toBe(
        'CHUYEN_TRANG_THAI_KHONG_HOP_LE',
      );
      expect(repoDon.kho.at(-1).trangThai).toBe('tu_choi');
      expect(quyPhep.chuyenSangDaDung).not.toHaveBeenCalled();
    });

    // Review round 1, IMPORTANT 2 — quỹ hỏng SAU KHI trạng thái đã lưu phải
    // khôi phục nguyên vẹn trạng thái/vết duyệt cũ, không để đơn đứng ở
    // trạng thái mới mà quỹ chưa hề bị đụng tới ("nghỉ phép miễn phí").
    it('duyệt hỏng ở tầng quỹ (SAU khi trạng thái đã lưu) → khôi phục cho_duyet, không để lại "nghỉ phép miễn phí"', async () => {
      const quyPhep = mockQuyPhep({
        chuyenSangDaDung: jest
          .fn()
          .mockRejectedValue(new ConflictException({ code: 'KHONG_DU_SO_DU' })),
      });
      const { service, repoDon, id } = await taoDonVaDuyet(quyPhep);

      await expect(
        service.updateStatus(id, 'da_duyet', 'HR', { id: 'user-hr' } as any),
      ).rejects.toBeInstanceOf(ConflictException);

      const donSau = repoDon.kho.at(-1);
      expect(donSau.trangThai).toBe('cho_duyet');
      expect(donSau.nguoiDuyetId).toBeUndefined();
      expect(donSau.thoiDiemDuyet).toBeUndefined();
    });

    // P3.8 fix round 3 — chuỗi này đi qua updateStatus() bốn lần liên tiếp
    // (chính là chuỗi mà thông báo lỗi CHUYEN_TRANG_THAI_KHONG_HOP_LE hướng
    // dẫn HR đi qua). Ở tầng QuyPhep_Service (quy-phep.service.spec.ts) đã
    // có test khẳng định lần chuyenSangDaDung THỨ HAI thực sự áp dụng — test
    // này khẳng định updateStatus() (tầng gọi) không tự chặn/bỏ qua việc
    // dispatch chuyenSangDaDung() lần hai đó, tức lỗi round 2 không tái phát
    // từ CHÍNH updateStatus() (đã bị loại ở round 1 CRITICAL, xem bảng
    // (cũ → mới) — trangThaiCu luôn đọc lại đúng mỗi lần gọi nên không có gì
    // để mà chặn ở tầng này cả).
    it('chuỗi đầy đủ duyệt → từ chối → mở lại → duyệt lại: gọi đúng số lần, đơn kết thúc ở da_duyet', async () => {
      const quyPhep = mockQuyPhep();
      const { service, repoDon, id } = await taoDonVaDuyet(quyPhep);

      await service.updateStatus(id, 'da_duyet', 'HR', { id: 'user-hr-1' } as any); // duyệt
      await service.updateStatus(id, 'tu_choi', undefined, { id: 'user-hr-2' } as any); // từ chối
      await service.updateStatus(id, 'cho_duyet', undefined, { id: 'user-hr-3' } as any); // mở lại
      await service.updateStatus(id, 'da_duyet', undefined, { id: 'user-hr-4' } as any); // duyệt lại

      // giuCho: 1 lần lúc create() + 1 lần lúc mở lại (tu_choi → cho_duyet).
      expect(quyPhep.giuCho).toHaveBeenCalledTimes(2);
      expect(quyPhep.hoanTraDaDung).toHaveBeenCalledTimes(1);
      // chuyenSangDaDung PHẢI được gọi đủ HAI lần — đây là dòng khẳng định
      // chính: nếu updateStatus() (hoặc lớp dưới nó) âm thầm bỏ qua lần
      // duyệt thứ hai, số này sẽ dừng ở 1.
      expect(quyPhep.chuyenSangDaDung).toHaveBeenCalledTimes(2);
      expect(repoDon.kho.at(-1).trangThai).toBe('da_duyet');
    });
  });

  // Review round 1, MINOR 8 — đơn nửa ngày chưa có test nào đụng tới quỹ.
  it('đơn nửa ngày (buoi: sang, đúng 1 ngày) → chạm quỹ với soNgayNghi = 0.5, không phải 1', async () => {
    const quyPhep = mockQuyPhep();
    const { service } = await dungServiceDon({ quyPhep });

    const result = await service.create({
      ...DON_PHEP,
      denNgay: DON_PHEP.ngay, // đúng 1 ngày
      buoi: 'sang',
    } as any);

    expect(result.soNgayNghi).toBe(0.5);
    expect(quyPhep.phanBoChoNgayNghi).toHaveBeenCalledTimes(1);
    const [, cacNgayGoi, soNgayGoi] = quyPhep.phanBoChoNgayNghi.mock.calls[0];
    expect(cacNgayGoi).toHaveLength(1);
    expect(soNgayGoi).toBe(0.5);
  });
});
