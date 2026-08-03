import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DonChamCong_Service, MA_LOI_DON_CHAM_CONG } from './don-cham-cong.service';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { QuyPhep_Service } from '../quy-phep/quy-phep.service';
import { QuyGio_Service } from '../quy-gio/quy-gio.service';
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
  let mockQuyGioService: {
    soGioMoiNgay: jest.Mock;
    dangKichHoat: jest.Mock;
    cauHinhChiaGio: jest.Mock;
    phanBoChoNghiBu: jest.Mock;
    giuCho: jest.Mock;
    nhaCho: jest.Mock;
    chuyenSangDaDung: jest.Mock;
    hoanTraDaDung: jest.Mock;
    tichTuDonOt: jest.Mock;
    thuHoiTichTuDonOt: jest.Mock;
    soDuKhaDung: jest.Mock;
  };
  let mockQuyPhepService: {
    layQuyCuaNhanVien: jest.Mock;
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
      // (P3.8 review round 5): cửa 1c mới trong create() gọi
      // layQuyCuaNhanVien() TRƯỚC cửa 2 để chẩn đoán "chưa được cấp quỹ" —
      // mặc định trả một quỹ dang_hieu_luc để các describe cũ (không nhắm
      // vào cửa này) đi xuyên qua bình thường tới phanBoChoNgayNghi().
      layQuyCuaNhanVien: jest
        .fn()
        .mockResolvedValue([{ trangThai: 'dang_hieu_luc' }]),
      phanBoChoNgayNghi: jest.fn().mockResolvedValue([]),
      giuCho: jest.fn().mockResolvedValue(undefined),
      nhaCho: jest.fn().mockResolvedValue(undefined),
      chuyenSangDaDung: jest.fn().mockResolvedValue(undefined),
      hoanTraDaDung: jest.fn().mockResolvedValue(undefined),
    };

    // Task 7: mặc định vô hại cho các describe cũ không quan tâm tới quỹ giờ
    // — cùng lý do đã ghi ở mockQuyPhepService phía trên. Describe "nghỉ bù
    // trừ quỹ giờ" bên dưới tự cấp provider riêng qua `dungService()`.
    mockQuyGioService = {
      soGioMoiNgay: jest.fn().mockResolvedValue(8),
      // Mặc định "đã bật" — hầu hết describe cũ dựng đơn nghi_bu với kỳ
      // vọng có giữ chỗ quỹ giờ (phanBoChoNghiBu được gọi). Describe chuyên
      // trách gate opt-in (rollout blocker) tự override thành `false`.
      dangKichHoat: jest.fn().mockResolvedValue(true),
      // `null` = công ty chưa khai `lamThem` → đơn OT KHÔNG bị chẻ theo khung
      // đêm, giữ nguyên hình dạng snapshot trước P4.2b mà cả trăm bài test ở
      // file này đang khẳng định. Đường chẻ THẬT được phủ ở
      // `don-cham-cong.quy-gio.tich-hop.spec.ts`, nơi QuyGio_Service là hàng
      // thật — đúng chỗ nó thuộc về, vì ở đây quỹ bị mock hoàn toàn.
      cauHinhChiaGio: jest.fn().mockResolvedValue(null),
      phanBoChoNghiBu: jest.fn().mockResolvedValue([]),
      giuCho: jest.fn().mockResolvedValue(undefined),
      nhaCho: jest.fn().mockResolvedValue(undefined),
      chuyenSangDaDung: jest.fn().mockResolvedValue(undefined),
      hoanTraDaDung: jest.fn().mockResolvedValue(undefined),
      tichTuDonOt: jest.fn().mockResolvedValue(undefined),
      thuHoiTichTuDonOt: jest.fn().mockResolvedValue(undefined),
      soDuKhaDung: jest.fn().mockResolvedValue({ soGioConLai: 0, theoKy: [] }),
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
        { provide: QuyGio_Service, useValue: mockQuyGioService },
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
  // (P3.8 review round 4, CRITICAL 1): PUT :id là cửa THỨ HAI vào quỹ phép —
  // soNgayNghi/phanBoQuy chỉ backend tính MỘT LẦN lúc create(), update() KHÔNG
  // BAO GIỜ tính lại. Sửa loaiDon/loaiNghi/ngay/denNgay/buoi của một đơn TRỪ
  // QUỸ (trước hoặc sau khi sửa) qua PUT để lại số cũ đứng cạnh ngày/loại
  // mới — ba kịch bản người dùng bình thường dưới đây (a, b, c trong report)
  // đều phải bị chặn 409, và bản ghi đã lưu phải giữ NGUYÊN, không đổi gì.
  // ──────────────────────────────────────────────────────────────────────────
  describe('update — PUT không được sửa các trường ảnh hưởng quỹ phép của đơn trừ quỹ (P3.8 CRITICAL 1)', () => {
    const DON_ID = '507f1f77bcf86cd799439099';

    it('(a) đơn phép năm 1 ngày → PUT kéo dài denNgay → 409, đơn KHÔNG đổi', async () => {
      const donGoc = {
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        loaiDon: 'nghi_phep',
        loaiNghi: 'phep_nam',
        ngay: '2027-02-01',
        denNgay: '2027-02-01',
        soNgayNghi: 1,
        phanBoQuy: [{ balanceId: 'q1', nam: 2027, soNgay: 1 }],
      };
      mockRequestRepo.findOne.mockResolvedValue({ ...donGoc });

      const err = await batMaLoi(() =>
        service.update(DON_ID, { denNgay: '2027-02-15' } as any),
      );

      expect(err).toBe(MA_LOI_DON_CHAM_CONG.KHONG_THE_SUA_DON_TRU_QUY);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('(b) đơn không_lương (không giữ chỗ) → PUT đổi loaiNghi sang phep_nam → 409, đơn KHÔNG đổi', async () => {
      const donGoc = {
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        loaiDon: 'nghi_phep',
        loaiNghi: 'khong_luong',
        ngay: '2027-02-01',
        denNgay: '2027-02-01',
        soNgayNghi: 1,
        // Không có phanBoQuy: đơn không_lương chưa từng giữ chỗ gì.
      };
      mockRequestRepo.findOne.mockResolvedValue({ ...donGoc });

      const err = await batMaLoi(() =>
        service.update(DON_ID, { loaiNghi: 'phep_nam' } as any),
      );

      expect(err).toBe(MA_LOI_DON_CHAM_CONG.KHONG_THE_SUA_DON_TRU_QUY);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('(c) đơn phép năm ĐÃ giữ chỗ → PUT đổi loaiNghi sang khong_luong → 409, đơn KHÔNG đổi', async () => {
      const donGoc = {
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        loaiDon: 'nghi_phep',
        loaiNghi: 'phep_nam',
        ngay: '2027-02-01',
        denNgay: '2027-02-01',
        soNgayNghi: 1,
        phanBoQuy: [{ balanceId: 'q1', nam: 2027, soNgay: 1 }],
      };
      mockRequestRepo.findOne.mockResolvedValue({ ...donGoc });

      const err = await batMaLoi(() =>
        service.update(DON_ID, { loaiNghi: 'khong_luong' } as any),
      );

      expect(err).toBe(MA_LOI_DON_CHAM_CONG.KHONG_THE_SUA_DON_TRU_QUY);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    // Không bị chặn quá tay: sửa một trường KHÔNG ảnh hưởng quỹ (lyDo) trên
    // một đơn phép năm vẫn phải đi qua bình thường.
    //
    // (P3.8 review round 5 — vá hồi quy round 4): dto ở đây PHẢI đúng HÌNH
    // DẠNG mà `dungDtoQuanTri()` (fe/.../donChamCongForm.convert.ts) thực sự
    // gửi cho PUT — form là controlled, gửi lại NGUYÊN state hiện tại chứ
    // không gửi diff, nên với một đơn `nghi_phep` 1 ngày, PUT LUÔN kèm
    // `loaiDon`/`ngay`/`denNgay`/`buoi`/`loaiNghi` dù HR chỉ sửa `lyDo`. Bản
    // test trước gửi dto CHỈ có `{ lyDo }` — payload FE không bao giờ tạo ra
    // — nên tấm lưới an toàn đó xanh giả, không canh đúng đường thật (guard
    // "có mặt khoá" của round 4 chặn nhầm MỌI PUT thật trên đơn phép năm).
    it('sửa lyDo trên đơn phép năm — dto ĐÚNG HÌNH DẠNG dungDtoQuanTri (giữ nguyên 5 trường, chỉ lyDo đổi) vẫn được phép', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        loaiDon: 'nghi_phep',
        loaiNghi: 'phep_nam',
        ngay: '2027-02-01',
        denNgay: '2027-02-01',
        buoi: 'ca_ngay',
        lyDo: 'Lý do cũ',
        soNgayNghi: 1,
        phanBoQuy: [{ balanceId: 'q1', nam: 2027, soNgay: 1 }],
      });

      // Hình dạng thật của dungDtoQuanTri() cho đơn nghi_phep 1 ngày: luôn
      // có employeeId/loaiDon/ngay/denNgay/buoi/loaiNghi kèm lyDo — KHÔNG
      // phải một patch chỉ-lyDo.
      const result = await service.update(DON_ID, {
        employeeId: EMP_ID,
        loaiDon: 'nghi_phep',
        ngay: '2027-02-01',
        denNgay: '2027-02-01',
        buoi: 'ca_ngay',
        loaiNghi: 'phep_nam',
        lyDo: 'Lý do mới',
      } as any);

      expect(result.lyDo).toBe('Lý do mới');
      expect(mockRequestRepo.save).toHaveBeenCalled();
    });

    // Không bị chặn quá tay: sửa ngày trên một đơn KHÔNG trừ quỹ (om_dau) vẫn
    // được phép bình thường, kể cả trước lẫn sau khi sửa.
    it('sửa denNgay trên đơn KHÔNG trừ quỹ (om_dau) vẫn được phép', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        loaiDon: 'nghi_phep',
        loaiNghi: 'om_dau',
        ngay: '2027-02-01',
        denNgay: '2027-02-01',
        soNgayNghi: 1,
      });

      const result = await service.update(DON_ID, { denNgay: '2027-02-05' } as any);

      expect(result.denNgay).toBe('2027-02-05');
      expect(mockRequestRepo.save).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // update — Task 7b (gap 2): PUT :id là cửa THỨ HAI vào quỹ GIỜ, cùng lớp
  // lỗi hệt describe quỹ phép ở trên — mirror trực tiếp exploit (a)/(b)/(c)
  // nhưng cho nghi_bu (giữ chỗ) và lam_them_gio (đã tích lúc duyệt).
  // ──────────────────────────────────────────────────────────────────────────
  describe('update — PUT không được sửa các trường ảnh hưởng quỹ giờ (Task 7b, gap 2)', () => {
    const DON_ID = '507f1f77bcf86cd799439099';

    it('nghi_bu ĐANG GIỮ CHỖ (phanBoQuyGio) → PUT sửa gioDen → 409, đơn KHÔNG đổi', async () => {
      const donGoc = {
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        loaiDon: 'nghi_bu',
        kieuNghi: 'theo_gio',
        ngay: '2027-02-01',
        gioTu: '15:00',
        gioDen: '17:00',
        soGioNghiBu: 2,
        phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2027-01', soGio: 2 }],
      };
      mockRequestRepo.findOne.mockResolvedValue({ ...donGoc });

      const err = await batMaLoi(() =>
        service.update(DON_ID, { gioDen: '19:00' } as any),
      );

      expect(err).toBe(MA_LOI_DON_CHAM_CONG.KHONG_THE_SUA_DON_TRU_QUY);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('nghi_bu ĐANG GIỮ CHỖ → PUT sửa kieuNghi → 409, đơn KHÔNG đổi', async () => {
      const donGoc = {
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        loaiDon: 'nghi_bu',
        kieuNghi: 'theo_gio',
        ngay: '2027-02-01',
        gioTu: '15:00',
        gioDen: '17:00',
        soGioNghiBu: 2,
        phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2027-01', soGio: 2 }],
      };
      mockRequestRepo.findOne.mockResolvedValue({ ...donGoc });

      const err = await batMaLoi(() =>
        service.update(DON_ID, { kieuNghi: 'theo_ngay' } as any),
      );

      expect(err).toBe(MA_LOI_DON_CHAM_CONG.KHONG_THE_SUA_DON_TRU_QUY);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    // Mirror exploit (c) của quỹ phép: đổi loaiDon RA KHỎI nghi_bu để né
    // laDonTruQuyGio() ở mọi đường sau đó (updateStatus/huyDonCuaToi/remove)
    // — giữ chỗ đã có (phanBoQuyGio) sẽ không bao giờ được nhả nữa.
    it('nghi_bu ĐANG GIỮ CHỖ → PUT đổi loaiDon sang giai_trinh → 409, đơn KHÔNG đổi', async () => {
      const donGoc = {
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        loaiDon: 'nghi_bu',
        kieuNghi: 'theo_gio',
        ngay: '2027-02-01',
        gioTu: '15:00',
        gioDen: '17:00',
        soGioNghiBu: 2,
        phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2027-01', soGio: 2 }],
      };
      mockRequestRepo.findOne.mockResolvedValue({ ...donGoc });

      const err = await batMaLoi(() =>
        service.update(DON_ID, { loaiDon: 'giai_trinh' } as any),
      );

      expect(err).toBe(MA_LOI_DON_CHAM_CONG.KHONG_THE_SUA_DON_TRU_QUY);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('OT ĐÃ DUYỆT (đã tích quỹ) → PUT sửa gioTu → 409, đơn KHÔNG đổi', async () => {
      const donGoc = {
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        loaiDon: 'lam_them_gio',
        ngay: '2027-02-01',
        gioTu: '18:00',
        gioDen: '20:00',
        soGioOt: 2,
        heSoOt: 1.5,
        loaiNgayOt: 'ngay_thuong',
      };
      mockRequestRepo.findOne.mockResolvedValue({ ...donGoc });

      const err = await batMaLoi(() =>
        service.update(DON_ID, { gioTu: '17:00' } as any),
      );

      expect(err).toBe(MA_LOI_DON_CHAM_CONG.KHONG_THE_SUA_DON_TRU_QUY);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    // OT còn cho_duyet chưa từng đụng quỹ (tích lúc DUYỆT, không phải lúc
    // nộp) — sửa giờ ở đây KHÔNG chạm gì tới quỹ, phải được phép bình
    // thường. Không bị chặn quá tay là điều kiện sống còn của guard này.
    it('OT còn CHỜ DUYỆT (chưa tích quỹ) → PUT sửa gioTu vẫn được phép', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        loaiDon: 'lam_them_gio',
        ngay: '2027-02-01',
        gioTu: '18:00',
        gioDen: '20:00',
        soGioOt: 2,
        heSoOt: 1.5,
        loaiNgayOt: 'ngay_thuong',
      });
      // (review round 2): sửa gioTu/gioDen/ngay trên OT còn cho_duyet giờ
      // TÍNH LẠI snapshot qua tinhCacTruongSnapshot() — cần tra hồ sơ nhân
      // viên (ngayLamViecTrongTuan) như create() vẫn cần.
      mockEmployeeRepo.findOne.mockResolvedValue({
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        ngayLamViecTrongTuan: T2_DEN_T6,
      });

      const result = await service.update(DON_ID, { gioTu: '17:00' } as any);

      expect(result.gioTu).toBe('17:00');
      expect(mockRequestRepo.save).toHaveBeenCalled();
    });

    // Không bị chặn quá tay: sửa lyDo (không ảnh hưởng quỹ giờ) trên một đơn
    // OT ĐÃ DUYỆT vẫn phải đi qua bình thường — cùng tinh thần với test
    // "sửa lyDo trên đơn phép năm" ở describe quỹ phép phía trên.
    it('sửa lyDo trên OT ĐÃ DUYỆT (giá trị các trường ảnh hưởng quỹ giữ nguyên) vẫn được phép', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        loaiDon: 'lam_them_gio',
        ngay: '2027-02-01',
        gioTu: '18:00',
        gioDen: '20:00',
        soGioOt: 2,
        heSoOt: 1.5,
        loaiNgayOt: 'ngay_thuong',
        lyDo: 'Lý do cũ',
      });

      const result = await service.update(DON_ID, {
        loaiDon: 'lam_them_gio',
        ngay: '2027-02-01',
        gioTu: '18:00',
        gioDen: '20:00',
        lyDo: 'Lý do mới',
      } as any);

      expect(result.lyDo).toBe('Lý do mới');
      expect(mockRequestRepo.save).toHaveBeenCalled();
    });

    // Task 7b (gap 2b): phanBoQuyGio gửi kèm trong body PUT không được phép
    // chạm tới entity dưới bất kỳ hình thức nào — cùng lý do phanBoQuy đã bị
    // bóc từ P3.8. Đơn ở đây KHÔNG giữ chỗ gì (nghi_bu nhưng phanBoQuyGio
    // rỗng từ đầu) để cô lập đúng assertion: guard 2a không nhúng vào đây
    // (không có gì để mà chặn 409), chỉ còn phép bóc-và-bỏ ở đầu update() là
    // thứ duy nhất có thể ngăn phanBoQuyGio-giả-mạo chạm entity.
    it('phanBoQuyGio gửi kèm trong body PUT không được ghi vào entity', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        _id: DON_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        loaiDon: 'nghi_bu',
        kieuNghi: 'theo_gio',
        ngay: '2027-02-01',
        gioTu: '15:00',
        gioDen: '17:00',
        lyDo: 'cũ',
        // Không có phanBoQuyGio trên item gốc — đơn này chưa từng giữ chỗ.
      });

      const result = await service.update(DON_ID, {
        lyDo: 'mới',
        phanBoQuyGio: [{ balanceId: 'gia-mao', kyTich: '2099-01', soGio: 999 }],
      } as any);

      expect(result.phanBoQuyGio).toBeUndefined();
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.not.objectContaining({
          phanBoQuyGio: [{ balanceId: 'gia-mao', kyTich: '2099-01', soGio: 999 }],
        }),
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
      // (P3.8 review round 5): cửa 1c mới trong create() gọi
      // layQuyCuaNhanVien() TRƯỚC cửa 2 — mặc định trả một quỹ dang_hieu_luc
      // để các test không nhắm vào cửa này đi xuyên qua bình thường.
      layQuyCuaNhanVien: jest
        .fn()
        .mockResolvedValue([{ trangThai: 'dang_hieu_luc' }]),
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
    // Task 7: describe này nhắm vào quỹ phép (phep_nam), không đơn nào ở đây
    // là nghi_bu/lam_them_gio nên quyGio_Service không bao giờ thực sự được
    // gọi tới — vẫn phải cấp provider để DonChamCong_Service resolve được.
    const quyGio = {
      soGioMoiNgay: jest.fn().mockResolvedValue(8),
      dangKichHoat: jest.fn().mockResolvedValue(true),
      // `null` = công ty chưa khai `lamThem` → đơn OT KHÔNG bị chẻ theo khung
      // đêm, giữ nguyên hình dạng snapshot trước P4.2b mà cả trăm bài test ở
      // file này đang khẳng định. Đường chẻ THẬT được phủ ở
      // `don-cham-cong.quy-gio.tich-hop.spec.ts`, nơi QuyGio_Service là hàng
      // thật — đúng chỗ nó thuộc về, vì ở đây quỹ bị mock hoàn toàn.
      cauHinhChiaGio: jest.fn().mockResolvedValue(null),
      phanBoChoNghiBu: jest.fn().mockResolvedValue([]),
      giuCho: jest.fn().mockResolvedValue(undefined),
      nhaCho: jest.fn().mockResolvedValue(undefined),
      chuyenSangDaDung: jest.fn().mockResolvedValue(undefined),
      hoanTraDaDung: jest.fn().mockResolvedValue(undefined),
      tichTuDonOt: jest.fn().mockResolvedValue(undefined),
      thuHoiTichTuDonOt: jest.fn().mockResolvedValue(undefined),
      soDuKhaDung: jest.fn().mockResolvedValue({ soGioConLai: 0, theoKy: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonChamCong_Service,
        { provide: getRepositoryToken(AttendanceRequest), useValue: repoDon },
        { provide: getRepositoryToken(Employee), useValue: repoNv },
        { provide: NgayLe_Service, useValue: ngayLe },
        { provide: NhanVien_Service, useValue: nhanVienSvc },
        { provide: QuyPhep_Service, useValue: quyPhep },
        { provide: QuyGio_Service, useValue: quyGio },
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

  // (P3.8 review round 4, IMPORTANT 3): spec §6.1 quy tắc 1 chặn CẢ HAI vế —
  // "chưa có ngayChinhThuc" (test ở trên) VÀ "ngayChinhThuc > ngày nghỉ".
  // Thiếu vế sau, một NV vừa lên chính thức HÔM NAY vẫn xin nghỉ phép năm cho
  // một ngày TRONG QUÁ KHỨ, lúc còn thử việc — quỹ không phân biệt được đó là
  // thời gian thử việc chưa đủ điều kiện.
  it('NV đã chính thức nhưng ngayChinhThuc > ngày nghỉ đầu tiên → 409, KHÔNG giữ chỗ', async () => {
    const quyPhep = mockQuyPhep();
    const { service } = await dungServiceDon({
      quyPhep,
      // Chính thức từ 2027-02-15, nhưng đơn xin nghỉ 2027-02-01 → 2027-02-02
      // (trước ngày lên chính thức).
      nhanVien: { ...nhanVienMacDinh(), ngayChinhThuc: '2027-02-15' },
    });

    const err = await batMaLoi(() => service.create(DON_PHEP as any));

    expect(err).toBe('CHUA_LEN_CHINH_THUC');
    expect(quyPhep.phanBoChoNgayNghi).not.toHaveBeenCalled();
    expect(quyPhep.giuCho).not.toHaveBeenCalled();
  });

  // Ranh giới ĐÚNG bằng ngày lên chính thức phải được PHÉP — quy tắc chặn
  // "ngayChinhThuc > ngày nghỉ", không phải ">=". Nghỉ ĐÚNG NGÀY lên chính
  // thức là hợp lệ.
  it('ngày nghỉ TRÙNG đúng ngayChinhThuc (ranh giới) → được phép, không bị chặn', async () => {
    const quyPhep = mockQuyPhep();
    const { service } = await dungServiceDon({
      quyPhep,
      nhanVien: { ...nhanVienMacDinh(), ngayChinhThuc: '2027-02-01' },
    });

    await service.create(DON_PHEP as any);

    expect(quyPhep.phanBoChoNgayNghi).toHaveBeenCalled();
    expect(quyPhep.giuCho).toHaveBeenCalled();
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

  // (P3.8 review round 5): đây là ca "CÓ quỹ dang_hieu_luc nhưng không đủ
  // ngày/sai kỳ" — mockQuyPhep() mặc định trả một quỹ dang_hieu_luc nên cửa
  // 1c (chẩn đoán "chưa được cấp") đi qua bình thường, và lỗi 409 thật sự
  // đến từ phanBoChoNgayNghi() (cửa 2) — đúng mã KHONG_DU_SO_DU.
  it('CÓ quỹ dang_hieu_luc nhưng không đủ số dư → ném 409 KHONG_DU_SO_DU và KHÔNG lưu đơn nào', async () => {
    const quyPhep = mockQuyPhep({
      phanBoChoNgayNghi: jest
        .fn()
        .mockRejectedValue(new ConflictException({ code: 'KHONG_DU_SO_DU' })),
    });
    const { service, repoDon } = await dungServiceDon({ quyPhep });
    const truoc = repoDon.kho.length;

    const err = await batMaLoi(() => service.create(DON_PHEP as any));

    expect(err).toBe('KHONG_DU_SO_DU');
    expect(repoDon.kho.length).toBe(truoc);
  });

  // (P3.8 review round 5 — vá hồi quy round 4 IMPORTANT 2/4): NV có
  // ngayChinhThuc TƯƠNG LAI đã tới hạn (đã qua được cửa 1/1b) nhưng chưa ai
  // bấm "Cấp phép đầu năm"/"Mở khoá" sau đó — repo này không có cron/backfill
  // lúc đọc, nên KHÔNG có quỹ dang_hieu_luc nào tồn tại. Trước fix, ca này
  // rơi thẳng vào phanBoChoNgayNghi() và bị chẩn đoán SAI thành
  // KHONG_DU_SO_DU ("không đủ số dư" — ngụ ý đã dùng hết), khiến HR đi tìm
  // nhầm chỗ. Chẩn đoán ĐÚNG phải là CHUA_DUOC_CAP_QUY, và phanBoChoNgayNghi
  // không được gọi tới (chặn sớm hơn, không cần hỏi FIFO của một quỹ không
  // tồn tại).
  it('đã chính thức nhưng CHƯA CÓ quỹ dang_hieu_luc nào → 409 CHUA_DUOC_CAP_QUY, không phải KHONG_DU_SO_DU', async () => {
    const quyPhep = mockQuyPhep({
      layQuyCuaNhanVien: jest.fn().mockResolvedValue([]),
    });
    const { service, repoDon } = await dungServiceDon({ quyPhep });
    const truoc = repoDon.kho.length;

    const err = await batMaLoi(() => service.create(DON_PHEP as any));

    expect(err).toBe('CHUA_DUOC_CAP_QUY');
    expect(quyPhep.phanBoChoNgayNghi).not.toHaveBeenCalled();
    expect(quyPhep.giuCho).not.toHaveBeenCalled();
    expect(repoDon.kho.length).toBe(truoc);
  });

  // Cùng ca trên nhưng quỹ hiện có TOÀN BỘ đã da_dong (vd hết hạn từ năm
  // trước, HR đã bấm đóng quỹ) — vẫn phải chẩn đoán CHUA_DUOC_CAP_QUY, không
  // phải KHONG_DU_SO_DU: không có quỹ NÀO tiêu được nữa, đúng bản chất
  // "chưa được cấp" (cho kỳ hiện tại) chứ không phải "đã dùng hết phép".
  it('quỹ hiện có TOÀN BỘ đã da_dong (không còn quỹ dang_hieu_luc nào) → vẫn 409 CHUA_DUOC_CAP_QUY', async () => {
    const quyPhep = mockQuyPhep({
      layQuyCuaNhanVien: jest
        .fn()
        .mockResolvedValue([{ trangThai: 'da_dong' }]),
    });
    const { service } = await dungServiceDon({ quyPhep });

    const err = await batMaLoi(() => service.create(DON_PHEP as any));

    expect(err).toBe('CHUA_DUOC_CAP_QUY');
    expect(quyPhep.phanBoChoNgayNghi).not.toHaveBeenCalled();
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

// ────────────────────────────────────────────────────────────────────────
// Task 7 (P4.2a) — nối quỹ giờ vào vòng đời đơn: đơn lam_them_gio tích quỹ
// lúc duyệt/thu hồi khi rời khỏi da_duyet; đơn nghi_bu giữ chỗ lúc nộp rồi
// chuyển đã dùng/nhả/hoàn theo ĐÚNG bảng chuyển trạng thái đã dùng cho quỹ
// phép ở describe phía trên — xem updateStatus().
//
// `dungService()` dùng harness jest.fn() rời rạc (cùng khuôn với beforeEach
// đầu file), KHÔNG dùng "kho" mảng bền trạng thái như `dungServiceDon()`:
// nhóm test này chỉ cần đọc lại BẢN GHI CUỐI CÙNG mà repo.save() nhận (biến
// `luu`), không cần giữ nhiều bản ghi qua nhiều lệnh gọi cho cùng một đơn.
// `luu` là một object BỀN THAM CHIẾU (không bao giờ gán lại `luu = ...`, chỉ
// Object.assign lên chính nó) — nên test destructure `luu` TRƯỚC khi gọi
// service.create() vẫn đọc đúng giá trị SAU cùng, vì destructure chỉ lấy
// tham chiếu, không sao chép giá trị tại thời điểm đó.
// ────────────────────────────────────────────────────────────────────────
describe('DonChamCong_Service — nghỉ bù trừ quỹ giờ (Task 7)', () => {
  // ObjectId hợp lệ (24 hex) — findEmployee()/findOne() đều tự tạo
  // `new ObjectId(...)` từ id truyền vào TRƯỚC khi chạm tới repo giả, nên id
  // kiểu 'nv1'/'d1' sẽ ném BSONError ngay cả khi repo.findOne() đã được mock.
  const ID_NV1 = '650000000000000000000101';

  function mockQuyGio(ghiDe: Record<string, any> = {}) {
    return {
      soGioMoiNgay: jest.fn().mockResolvedValue(8),
      // Mặc định "đã bật" — describe này nhắm vào đúng luồng trừ quỹ giờ.
      // Nhóm test "gate opt-in" bên dưới tự override thành `false`.
      dangKichHoat: jest.fn().mockResolvedValue(true),
      // Trả đúng số giờ ĐƯỢC YÊU CẦU (soGioCan) thay vì một giá trị cố định
      // — test "giữ chỗ ngay lúc tạo đơn" đối chiếu đúng số đã giữ.
      phanBoChoNghiBu: jest
        .fn()
        .mockImplementation((_employeeId: string, soGioCan: number) =>
          Promise.resolve([{ balanceId: 'b1', kyTich: '2026-01', soGio: soGioCan }]),
        ),
      giuCho: jest.fn().mockResolvedValue(undefined),
      nhaCho: jest.fn().mockResolvedValue(undefined),
      chuyenSangDaDung: jest.fn().mockResolvedValue(undefined),
      hoanTraDaDung: jest.fn().mockResolvedValue(undefined),
      tichTuDonOt: jest.fn().mockResolvedValue(undefined),
      thuHoiTichTuDonOt: jest.fn().mockResolvedValue(undefined),
      soDuKhaDung: jest.fn().mockResolvedValue({ soGioConLai: 0, theoKy: [] }),
      // Xem lập luận ở khối mock đầu file: `null` = chưa khai `lamThem`, đơn
      // OT không bị chẻ, giữ nguyên hình dạng snapshot trước P4.2b.
      cauHinhChiaGio: jest.fn().mockResolvedValue(null),
      ...ghiDe,
    };
  }

  async function dungService(
    tuyChon: { don?: any; quyGio?: any; nhanVien?: any; ngayLe?: any } = {},
  ) {
    const luu: Record<string, any> = {};
    const mockRequestRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(tuyChon.don ?? null),
      create: jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => {
        Object.assign(luu, v);
        if (!luu._id) luu._id = 'generated-request-id';
        return luu;
      }),
    };
    const mockEmployeeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(
        tuyChon.nhanVien ?? {
          _id: ID_NV1,
          employeeId: 'NV0001',
          hoTen: 'Nguyễn Văn A',
          ngayLamViecTrongTuan: [0, 1, 2, 3, 4, 5, 6],
        },
      ),
      save: jest.fn((v: any) => Promise.resolve(v)),
    };
    const mockNgayLeService =
      tuyChon.ngayLe ?? { timTheoNgay: jest.fn().mockResolvedValue(null) };
    const mockNhanVienService = {
      resolveEmployeeFromUser: jest
        .fn()
        .mockRejectedValue(new NotFoundException()),
    };
    // Không đơn nào trong describe này là phep_nam — quỹ phép không bao giờ
    // thực sự được gọi tới, chỉ cần cấp đủ provider để DI resolve được.
    const mockQuyPhepService = {
      layQuyCuaNhanVien: jest.fn().mockResolvedValue([{ trangThai: 'dang_hieu_luc' }]),
      phanBoChoNgayNghi: jest.fn().mockResolvedValue([]),
      giuCho: jest.fn().mockResolvedValue(undefined),
      nhaCho: jest.fn().mockResolvedValue(undefined),
      chuyenSangDaDung: jest.fn().mockResolvedValue(undefined),
      hoanTraDaDung: jest.fn().mockResolvedValue(undefined),
    };
    const quyGio = tuyChon.quyGio ?? mockQuyGio();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonChamCong_Service,
        { provide: getRepositoryToken(AttendanceRequest), useValue: mockRequestRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: NgayLe_Service, useValue: mockNgayLeService },
        { provide: NhanVien_Service, useValue: mockNhanVienService },
        { provide: QuyPhep_Service, useValue: mockQuyPhepService },
        { provide: QuyGio_Service, useValue: quyGio },
      ],
    }).compile();

    return {
      service: module.get<DonChamCong_Service>(DonChamCong_Service),
      quyGio,
      luu,
    };
  }

  it('đơn theo_ngay quy ra giờ theo soGioMoiNgay', async () => {
    const { service, quyGio } = await dungService();
    await service.create({
      employeeId: ID_NV1, loaiDon: 'nghi_bu', ngay: '2026-02-10',
      denNgay: '2026-02-10', buoi: 'ca_ngay', kieuNghi: 'theo_ngay',
    } as any);

    expect(quyGio.phanBoChoNghiBu).toHaveBeenCalledWith(ID_NV1, 8, expect.any(String));
  });

  it('đơn theo_ngay nửa buổi trừ nửa số giờ', async () => {
    const { service, quyGio } = await dungService();
    await service.create({
      employeeId: ID_NV1, loaiDon: 'nghi_bu', ngay: '2026-02-10',
      denNgay: '2026-02-10', buoi: 'sang', kieuNghi: 'theo_ngay',
    } as any);

    expect(quyGio.phanBoChoNghiBu).toHaveBeenCalledWith(ID_NV1, 4, expect.any(String));
  });

  it('đơn theo_gio trừ đúng số giờ khai', async () => {
    const { service, quyGio } = await dungService();
    await service.create({
      employeeId: ID_NV1, loaiDon: 'nghi_bu', ngay: '2026-02-10',
      gioTu: '15:00', gioDen: '17:30', kieuNghi: 'theo_gio',
    } as any);

    expect(quyGio.phanBoChoNghiBu).toHaveBeenCalledWith(ID_NV1, 2.5, expect.any(String));
  });

  it('giữ chỗ ngay lúc tạo đơn và snapshot phanBoQuyGio', async () => {
    const { service, quyGio, luu } = await dungService();
    await service.create({
      employeeId: ID_NV1, loaiDon: 'nghi_bu', ngay: '2026-02-10',
      gioTu: '15:00', gioDen: '17:00', kieuNghi: 'theo_gio',
    } as any);

    expect(quyGio.giuCho).toHaveBeenCalled();
    expect(luu.phanBoQuyGio).toEqual([{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }]);
    expect(luu.soGioNghiBu).toBe(2);
  });

  it('duyệt đơn OT thì tích quỹ', async () => {
    const { service, quyGio } = await dungService({
      don: {
        _id: '650000000000000000000201', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
        ngay: '2026-01-15', soGioOt: 8, loaiNgayOt: 'ngay_thuong', trangThai: 'cho_duyet',
      },
    });

    await service.updateStatus(
      '650000000000000000000201', 'da_duyet', 'HR', { id: 'hr1' } as any,
    );

    expect(quyGio.tichTuDonOt).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: ID_NV1, soGioOt: 8, loaiNgayOt: 'ngay_thuong' }),
    );
  });

  it('từ chối đơn OT ĐÃ duyệt thì thu hồi giờ đã tích', async () => {
    const { service, quyGio } = await dungService({
      don: {
        _id: '650000000000000000000206', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
        ngay: '2026-01-15', soGioOt: 8, loaiNgayOt: 'ngay_thuong', trangThai: 'da_duyet',
      },
    });

    await service.updateStatus(
      '650000000000000000000206', 'tu_choi', undefined, { id: 'hr1' } as any,
    );

    expect(quyGio.thuHoiTichTuDonOt).toHaveBeenCalledWith(
      '650000000000000000000206', ID_NV1, 'hr1',
    );
    expect(quyGio.tichTuDonOt).not.toHaveBeenCalled();
  });

  it('duyệt đơn nghỉ bù thì chuyển giữ chỗ sang đã dùng', async () => {
    const { service, quyGio } = await dungService({
      don: {
        _id: '650000000000000000000202', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
        ngay: '2026-02-10', trangThai: 'cho_duyet',
        phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      },
    });

    await service.updateStatus(
      '650000000000000000000202', 'da_duyet', 'HR', { id: 'hr1' } as any,
    );

    expect(quyGio.chuyenSangDaDung).toHaveBeenCalledWith(
      ID_NV1,
      [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      '650000000000000000000202',
      'hr1',
    );
  });

  it('từ chối đơn nghỉ bù đang chờ thì nhả chỗ', async () => {
    const { service, quyGio } = await dungService({
      don: {
        _id: '650000000000000000000203', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
        ngay: '2026-02-10', trangThai: 'cho_duyet',
        phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      },
    });

    await service.updateStatus(
      '650000000000000000000203', 'tu_choi', 'HR', { id: 'hr1' } as any,
    );

    // Assertion đủ tham số — với một fund service bị mock TOÀN BỘ, đối
    // chiếu tham số là thứ DUY NHẤT phát hiện được nhầm employeeId với _id.
    expect(quyGio.nhaCho).toHaveBeenCalledWith(
      ID_NV1,
      [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      '650000000000000000000203',
      'hr1',
    );
    expect(quyGio.chuyenSangDaDung).not.toHaveBeenCalled();
  });

  it('từ chối đơn nghỉ bù ĐÃ duyệt thì hoàn trả', async () => {
    const { service, quyGio } = await dungService({
      don: {
        _id: '650000000000000000000204', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
        ngay: '2026-02-10', trangThai: 'da_duyet',
        phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      },
    });

    await service.updateStatus(
      '650000000000000000000204', 'tu_choi', 'HR', { id: 'hr1' } as any,
    );

    expect(quyGio.hoanTraDaDung).toHaveBeenCalledWith(
      ID_NV1,
      [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      '650000000000000000000204',
      'hr1',
    );
    expect(quyGio.nhaCho).not.toHaveBeenCalled();
  });

  it('mở lại đơn nghỉ bù đã từ chối (tu_choi → cho_duyet) thì giữ chỗ lại', async () => {
    const { service, quyGio } = await dungService({
      don: {
        _id: '650000000000000000000207', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
        ngay: '2026-02-10', trangThai: 'tu_choi',
        phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      },
    });

    await service.updateStatus(
      '650000000000000000000207', 'cho_duyet', undefined, { id: 'hr1' } as any,
    );

    expect(quyGio.giuCho).toHaveBeenCalledWith(
      ID_NV1,
      [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      '650000000000000000000207',
      'hr1',
    );
  });

  // ── Self-review: "Does the failed-reservation rollback actually run on
  // the throw path? Prove it with a test." — mirror trực tiếp test cùng tên
  // ở describe "nối quỹ phép (P3.8)" phía trên, cho quỹ giờ.
  it('giữ chỗ quỹ giờ hỏng sau khi đã lưu đơn → đơn bị vô hiệu hoá, không để lại đơn ma', async () => {
    const quyGio = mockQuyGio({
      giuCho: jest.fn().mockRejectedValue(new Error('mất kết nối')),
    });
    const { service, luu } = await dungService({ quyGio });

    await expect(
      service.create({
        employeeId: ID_NV1, loaiDon: 'nghi_bu', ngay: '2026-02-10',
        gioTu: '15:00', gioDen: '17:00', kieuNghi: 'theo_gio',
      } as any),
    ).rejects.toThrow('mất kết nối');

    expect(luu.isActive).toBe(false);
    expect(luu.phanBoQuyGio).toBeUndefined();
    // Best-effort nhả phần có thể đã giữ được TRƯỚC khi vô hiệu hoá đơn —
    // cùng khuôn với create() bên quỹ phép.
    expect(quyGio.nhaCho).toHaveBeenCalledWith(
      ID_NV1,
      [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      expect.any(String),
      ID_NV1,
    );
  });

  // ── Self-review: guard mở rộng có thực sự chặn nghi_bu-có-phanBoQuyGio,
  // không chỉ đơn phep_nam.
  it('nghi_bu có phanBoQuyGio: da_duyet → cho_duyet bị chặn 409 (không có lối quỹ hợp lệ)', async () => {
    const { service, quyGio } = await dungService({
      don: {
        _id: '650000000000000000000205', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
        ngay: '2026-02-10', trangThai: 'da_duyet',
        phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      },
    });

    const loi = await service
      .updateStatus('650000000000000000000205', 'cho_duyet', undefined, { id: 'hr1' } as any)
      .catch((e) => e);

    expect(loi).toBeInstanceOf(ConflictException);
    expect((loi as any).getResponse().code).toBe('CHUYEN_TRANG_THAI_KHONG_HOP_LE');
    expect(quyGio.giuCho).not.toHaveBeenCalled();
  });

  it('nghi_bu có phanBoQuyGio: tu_choi → da_duyet bị chặn 409 (không có lối quỹ hợp lệ)', async () => {
    const { service, quyGio } = await dungService({
      don: {
        _id: '650000000000000000000208', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
        ngay: '2026-02-10', trangThai: 'tu_choi',
        phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
      },
    });

    const loi = await service
      .updateStatus('650000000000000000000208', 'da_duyet', undefined, { id: 'hr1' } as any)
      .catch((e) => e);

    expect(loi).toBeInstanceOf(ConflictException);
    expect((loi as any).getResponse().code).toBe('CHUYEN_TRANG_THAI_KHONG_HOP_LE');
    expect(quyGio.chuyenSangDaDung).not.toHaveBeenCalled();
  });

  // ── Self-review: theo_ngay thực sự đi qua tinhSoNgayNghi (bỏ ngày lễ +
  // ngày ngoài lịch làm việc), không đếm ngày lịch thô.
  it('theo_ngay bỏ ngày lễ và ngày ngoài lịch làm việc khi tính soGioNghiBu', async () => {
    const NGAY_LE = '2026-03-04'; // thứ Tư, giữa khoảng
    const ngayLe = {
      timTheoNgay: jest
        .fn()
        .mockImplementation((ngay: string) =>
          Promise.resolve(ngay === NGAY_LE ? { _id: 'hl1' } : null),
        ),
    };
    const { service, quyGio } = await dungService({
      ngayLe,
      nhanVien: {
        _id: ID_NV1, employeeId: 'NV0001', hoTen: 'Nguyễn Văn A',
        ngayLamViecTrongTuan: [1, 2, 3, 4, 5], // T2→T6
      },
    });

    // 2026-03-02 (T2) .. 2026-03-08 (CN): 7 ngày, trừ T7(7/3)+CN(8/3)+lễ(4/3)
    // giữa tuần → còn 4 ngày làm việc thật (2,3,5,6/3) → soGioNghiBu = 4*8=32.
    await service.create({
      employeeId: ID_NV1, loaiDon: 'nghi_bu', ngay: '2026-03-02',
      denNgay: '2026-03-08', kieuNghi: 'theo_ngay',
    } as any);

    expect(quyGio.phanBoChoNghiBu).toHaveBeenCalledWith(ID_NV1, 32, expect.any(String));
  });

  // ── Self-review: soGioMoiNgay() gọi ĐÚNG MỘT LẦN cho một đơn nhiều ngày,
  // không phải một lần mỗi ngày trong khoảng.
  it('soGioMoiNgay() chỉ được gọi một lần cho một đơn theo_ngay nhiều ngày', async () => {
    const { service, quyGio } = await dungService();
    await service.create({
      employeeId: ID_NV1, loaiDon: 'nghi_bu', ngay: '2026-02-09',
      denNgay: '2026-02-13', kieuNghi: 'theo_ngay',
    } as any);

    expect(quyGio.soGioMoiNgay).toHaveBeenCalledTimes(1);
  });

  // ────────────────────────────────────────────────────────────────────
  // Review round 1, CRITICAL 1 — updateStatus() phải khôi phục NGUYÊN VẸN
  // trạng thái/vết duyệt cũ khi quỹ giờ hỏng SAU KHI trangThai đã lưu,
  // cùng khuôn với khối quỹ phép (xem doc-comment ở updateStatus()). Thiếu
  // khối này: đơn kẹt ở trạng thái MỚI mà quỹ giờ chưa hề đổi — ca xấu nhất
  // là "tu_choi → cho_duyet" trên nghi_bu để lại một đơn cho_duyet mang
  // phanBoQuyGio mà quỹ chưa hề giữ lại, và duyệt đơn đó sau này sẽ chi
  // tiêu giờ chưa từng được giữ.
  //
  // Mỗi test dưới đây: (1) mock đúng MỘT hàm quỹ giờ ném lỗi, (2) gọi
  // updateStatus(), (3) assert nó ném lại lỗi gốc, VÀ (4) đọc `luu` (bản ghi
  // CUỐI CÙNG mà repo.save() nhận) để xác nhận trangThai/vết duyệt đã được
  // khôi phục về đúng giá trị TRƯỚC lệnh gọi — không phải chỉ đọc lỗi ném ra
  // mà bỏ qua trạng thái đã persist.
  // ────────────────────────────────────────────────────────────────────
  describe('updateStatus — quỹ giờ hỏng SAU khi trangThai đã lưu ⇒ khôi phục nguyên vẹn (review CRITICAL 1)', () => {
    it('OT: tichTuDonOt hỏng (cho_duyet → da_duyet) → khôi phục cho_duyet, không vết duyệt', async () => {
      const quyGio = mockQuyGio({
        tichTuDonOt: jest.fn().mockRejectedValue(new Error('mất kết nối')),
      });
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000301', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
          ngay: '2026-01-15', soGioOt: 8, loaiNgayOt: 'ngay_thuong', trangThai: 'cho_duyet',
        },
      });

      await expect(
        service.updateStatus('650000000000000000000301', 'da_duyet', 'HR', { id: 'hr1' } as any),
      ).rejects.toThrow('mất kết nối');

      expect(luu.trangThai).toBe('cho_duyet');
      expect(luu.nguoiDuyetId).toBeUndefined();
      expect(luu.thoiDiemDuyet).toBeUndefined();
    });

    it('OT: thuHoiTichTuDonOt hỏng (da_duyet → tu_choi) → khôi phục da_duyet + vết duyệt cũ nguyên vẹn', async () => {
      const quyGio = mockQuyGio({
        thuHoiTichTuDonOt: jest
          .fn()
          .mockRejectedValue(new ConflictException({ code: 'QUY_GIO_DA_TIEU' })),
      });
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000302', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
          ngay: '2026-01-15', soGioOt: 8, loaiNgayOt: 'ngay_thuong', trangThai: 'da_duyet',
          nguoiDuyet: 'HR cũ', nguoiDuyetId: 'hr-cu', thoiDiemDuyet: '2026-01-16T00:00:00.000Z',
        },
      });

      await expect(
        service.updateStatus('650000000000000000000302', 'tu_choi', 'HR mới', { id: 'hr-moi' } as any),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(luu.trangThai).toBe('da_duyet');
      expect(luu.nguoiDuyet).toBe('HR cũ');
      expect(luu.nguoiDuyetId).toBe('hr-cu');
      expect(luu.thoiDiemDuyet).toBe('2026-01-16T00:00:00.000Z');
    });

    it('nghi_bu: chuyenSangDaDung hỏng (cho_duyet → da_duyet) → khôi phục cho_duyet', async () => {
      const quyGio = mockQuyGio({
        chuyenSangDaDung: jest.fn().mockRejectedValue(new Error('mất kết nối')),
      });
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000303', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
          ngay: '2026-02-10', trangThai: 'cho_duyet',
          phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        },
      });

      await expect(
        service.updateStatus('650000000000000000000303', 'da_duyet', 'HR', { id: 'hr1' } as any),
      ).rejects.toThrow('mất kết nối');

      expect(luu.trangThai).toBe('cho_duyet');
      expect(luu.nguoiDuyetId).toBeUndefined();
      expect(luu.thoiDiemDuyet).toBeUndefined();
    });

    it('nghi_bu: nhaCho hỏng (cho_duyet → tu_choi) → khôi phục cho_duyet', async () => {
      const quyGio = mockQuyGio({
        nhaCho: jest.fn().mockRejectedValue(new Error('mất kết nối')),
      });
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000304', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
          ngay: '2026-02-10', trangThai: 'cho_duyet',
          phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        },
      });

      await expect(
        service.updateStatus('650000000000000000000304', 'tu_choi', 'HR', { id: 'hr1' } as any),
      ).rejects.toThrow('mất kết nối');

      expect(luu.trangThai).toBe('cho_duyet');
    });

    it('nghi_bu: hoanTraDaDung hỏng (da_duyet → tu_choi) → khôi phục da_duyet + vết duyệt cũ', async () => {
      const quyGio = mockQuyGio({
        hoanTraDaDung: jest.fn().mockRejectedValue(new Error('mất kết nối')),
      });
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000305', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
          ngay: '2026-02-10', trangThai: 'da_duyet',
          nguoiDuyet: 'HR cũ', nguoiDuyetId: 'hr-cu', thoiDiemDuyet: '2026-01-16T00:00:00.000Z',
          phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        },
      });

      await expect(
        service.updateStatus('650000000000000000000305', 'tu_choi', 'HR mới', { id: 'hr-moi' } as any),
      ).rejects.toThrow('mất kết nối');

      expect(luu.trangThai).toBe('da_duyet');
      expect(luu.nguoiDuyet).toBe('HR cũ');
      expect(luu.nguoiDuyetId).toBe('hr-cu');
      expect(luu.thoiDiemDuyet).toBe('2026-01-16T00:00:00.000Z');
    });

    // Path A từ review — ca quan trọng nhất: "mở lại" một đơn nghi_bu đã bị
    // từ chối, nhưng giờ đã bị tiêu ở chỗ khác trong lúc đơn chờ. Nếu
    // trangThai không được khôi phục về tu_choi, đơn sống ở cho_duyet mang
    // phanBoQuyGio mà quỹ CHƯA HỀ giữ lại — duyệt đơn đó sau này sẽ chi tiêu
    // giờ chưa từng được giữ (chuyenSangDaDung không có gì để mà chặn, vì nó
    // tin phanBoQuyGio trên đơn là đã được giữ thật).
    it('nghi_bu: giuCho hỏng khi MỞ LẠI (tu_choi → cho_duyet) → khôi phục tu_choi, không để đơn sống ở cho_duyet mang giữ chỗ ma', async () => {
      const quyGio = mockQuyGio({
        giuCho: jest
          .fn()
          .mockRejectedValue(new ConflictException({ code: 'QUY_GIO_KHONG_DU_SO_DU' })),
      });
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000306', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
          ngay: '2026-02-10', trangThai: 'tu_choi',
          phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        },
      });

      await expect(
        service.updateStatus('650000000000000000000306', 'cho_duyet', undefined, { id: 'hr1' } as any),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(luu.trangThai).toBe('tu_choi');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Review round 1, CRITICAL 2 — huyDonCuaToi() và remove() phải nhả/hoàn
  // quỹ giờ cho đơn nghi_bu, mirror hệt cách chúng đã làm cho phanBoQuy
  // (quỹ phép). Thiếu khối này: tự huỷ một đơn nghi_bu còn cho_duyet để
  // soGioDangChoDuyet của quỹ đó bị KẸT VĨNH VIỄN (không bao giờ được nhả),
  // và xoá một đơn nghi_bu ĐÃ DUYỆT để soGioDaDung bị trừ oan vĩnh viễn —
  // cả hai đều không bị doiSoat() (Task 12) phát hiện vì ledger vẫn khớp
  // balance (hai bên cùng "quên" một khoản như nhau, không lệch số).
  // ────────────────────────────────────────────────────────────────────
  describe('huyDonCuaToi() / remove() — nhả/hoàn quỹ giờ cho đơn nghi_bu (review CRITICAL 2)', () => {
    it('huyDonCuaToi() trên đơn nghi_bu cho_duyet → nhaCho quỹ giờ, isActive=false, phanBoQuyGio xoá', async () => {
      const quyGio = mockQuyGio();
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000401', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
          ngay: '2026-02-10', trangThai: 'cho_duyet', isActive: true,
          phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        },
      });

      await service.huyDonCuaToi('650000000000000000000401', ID_NV1);

      expect(quyGio.nhaCho).toHaveBeenCalledWith(
        ID_NV1,
        [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        '650000000000000000000401',
        ID_NV1,
      );
      expect(luu.isActive).toBe(false);
      expect(luu.phanBoQuyGio).toBeUndefined();
    });

    it('remove() trên đơn nghi_bu CHỜ DUYỆT → nhaCho quỹ giờ (chưa từng trừ thật)', async () => {
      const quyGio = mockQuyGio();
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000402', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
          ngay: '2026-02-10', trangThai: 'cho_duyet', isActive: true,
          phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        },
      });

      await service.remove('650000000000000000000402');

      expect(quyGio.nhaCho).toHaveBeenCalledWith(
        ID_NV1,
        [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        '650000000000000000000402',
        'he_thong',
      );
      expect(quyGio.hoanTraDaDung).not.toHaveBeenCalled();
      expect(luu.isActive).toBe(false);
      expect(luu.phanBoQuyGio).toBeUndefined();
    });

    it('remove() trên đơn nghi_bu ĐÃ DUYỆT → hoanTraDaDung quỹ giờ (không phải nhaCho), đúng người xoá', async () => {
      const quyGio = mockQuyGio();
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000403', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
          ngay: '2026-02-10', trangThai: 'da_duyet', isActive: true,
          phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        },
      });

      await service.remove('650000000000000000000403', { id: 'hr-xoa-don' } as any);

      expect(quyGio.hoanTraDaDung).toHaveBeenCalledWith(
        ID_NV1,
        [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        '650000000000000000000403',
        'hr-xoa-don',
      );
      expect(quyGio.nhaCho).not.toHaveBeenCalled();
      expect(luu.isActive).toBe(false);
      expect(luu.phanBoQuyGio).toBeUndefined();
    });

    it('remove() sau khi đơn nghi_bu đã bị huyDonCuaToi() KHÔNG nhả chỗ lần hai', async () => {
      const quyGio = mockQuyGio();
      const { service } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000404', employeeId: ID_NV1, loaiDon: 'nghi_bu', kieuNghi: 'theo_gio',
          ngay: '2026-02-10', trangThai: 'cho_duyet', isActive: true,
          phanBoQuyGio: [{ balanceId: 'b1', kyTich: '2026-01', soGio: 2 }],
        },
      });

      await service.huyDonCuaToi('650000000000000000000404', ID_NV1);
      expect(quyGio.nhaCho).toHaveBeenCalledTimes(1);

      // isActive đã false, phanBoQuyGio đã xoá — remove() gọi lại trên
      // cùng đơn phải là no-op về mặt quỹ.
      await service.remove('650000000000000000000404');
      expect(quyGio.nhaCho).toHaveBeenCalledTimes(1);
      expect(quyGio.hoanTraDaDung).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Task 7b (gap 1) — remove() trên đơn OT ĐÃ DUYỆT phải THU HỒI giờ đã
  // tích, mirror hệt cách remove() đã xử lý phanBoQuy/phanBoQuyGio ở trên
  // — nhưng theo hướng NGƯỢC LẠI (đây là fund đã CẤP, không phải đã GIỮ).
  //
  // Quyết định thiết kế (xem lý do đầy đủ ở doc-comment `canThuHoiOt` trong
  // remove()): nếu `thuHoiTichTuDonOt()` ném DA_TIEU_KHONG_THU_HOI_DUOC
  // (giờ đã bị TIÊU một phần qua nghỉ bù), remove() PHẢI CHẶN việc xoá —
  // không soft-delete, không lưu gì cả — chứ không được nuốt lỗi rồi xoá
  // tiếp. Message của lỗi đó tự nói "xử lý tay TRƯỚC KHI hủy đơn": nếu
  // remove() nuốt lỗi và xoá đơn như bình thường, HR mất luôn đầu mối duy
  // nhất (đơn) để mà biết cần xử lý tay ở đâu — một soft-delete "thành
  // công" trong khi quỹ sai chính là cách cái leak gốc (Critical 2) đã xảy
  // ra, lặp lại nó ở đây để đổi lấy UX xoá mượt hơn là đánh đổi sai chỗ.
  // ────────────────────────────────────────────────────────────────────
  describe('remove() — đơn OT ĐÃ DUYỆT phải thu hồi giờ đã tích (Task 7b, gap 1)', () => {
    it('xoá đơn OT ĐÃ DUYỆT → thuHoiTichTuDonOt được gọi, đơn bị vô hiệu hoá', async () => {
      const quyGio = mockQuyGio();
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000501', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
          ngay: '2026-01-15', soGioOt: 8, loaiNgayOt: 'ngay_thuong', trangThai: 'da_duyet',
          isActive: true,
        },
      });

      await service.remove('650000000000000000000501', { id: 'hr-xoa-don' } as any);

      expect(quyGio.thuHoiTichTuDonOt).toHaveBeenCalledWith(
        '650000000000000000000501',
        ID_NV1,
        'hr-xoa-don',
      );
      expect(luu.isActive).toBe(false);
    });

    it('xoá đơn OT còn CHỜ DUYỆT (chưa tích quỹ) → KHÔNG gọi thuHoiTichTuDonOt', async () => {
      const quyGio = mockQuyGio();
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000502', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
          ngay: '2026-01-15', soGioOt: 8, loaiNgayOt: 'ngay_thuong', trangThai: 'cho_duyet',
          isActive: true,
        },
      });

      await service.remove('650000000000000000000502');

      expect(quyGio.thuHoiTichTuDonOt).not.toHaveBeenCalled();
      expect(luu.isActive).toBe(false);
    });

    it('xoá đơn OT ĐÃ BỊ TỪ CHỐI (đã thu hồi từ updateStatus rồi) → KHÔNG gọi thuHoiTichTuDonOt lần hai', async () => {
      const quyGio = mockQuyGio();
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000503', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
          ngay: '2026-01-15', soGioOt: 8, loaiNgayOt: 'ngay_thuong', trangThai: 'tu_choi',
          isActive: true,
        },
      });

      await service.remove('650000000000000000000503');

      expect(quyGio.thuHoiTichTuDonOt).not.toHaveBeenCalled();
      expect(luu.isActive).toBe(false);
    });

    // Quyết định thiết kế chính của gap 1: giờ đã TIÊU một phần (nghỉ bù đã
    // ăn vào) → thuHoiTichTuDonOt() ném DA_TIEU_KHONG_THU_HOI_DUOC → remove()
    // PHẢI NÉM LẠI, KHÔNG được soft-delete. `luu` (bản ghi cuối cùng
    // repo.save() nhận, khởi tạo `{}` trong dungService()) phải vẫn rỗng —
    // repo.save() chưa từng được gọi, không có gì để mà rollback vì chưa có
    // gì được ghi xuống DB.
    it('giờ đã bị tiêu một phần → thuHoiTichTuDonOt ném lỗi → remove() ném lại, KHÔNG soft-delete, KHÔNG gọi repo.save()', async () => {
      const quyGio = mockQuyGio({
        thuHoiTichTuDonOt: jest
          .fn()
          .mockRejectedValue(new ConflictException({ code: 'QUY_GIO_DA_TIEU' })),
      });
      const { service, luu } = await dungService({
        quyGio,
        don: {
          _id: '650000000000000000000504', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
          ngay: '2026-01-15', soGioOt: 8, loaiNgayOt: 'ngay_thuong', trangThai: 'da_duyet',
          isActive: true,
        },
      });

      await expect(
        service.remove('650000000000000000000504', { id: 'hr-xoa-don' } as any),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(luu).toEqual({});
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Task 7b, review round 2 (IMPORTANT) — guard gap 2a chỉ CHẶN sửa
  // gioTu/gioDen/ngay trên OT ĐÃ DUYỆT; sửa trên OT còn cho_duyet vẫn được
  // PHÉP (đúng — quỹ chưa đụng gì). Nhưng cho phép sửa không đồng nghĩa
  // snapshot soGioOt/heSoOt/loaiNgayOt được tính lại — trước bản vá này,
  // update() chỉ Object.assign() giá trị gioTu/gioDen/ngay MỚI xuống trong
  // khi snapshot vẫn đứng yên ở số create() tính lúc nộp. Duyệt sau đó
  // tichTuDonOt() theo snapshot CŨ — lệch với số giờ HR vừa nhìn thấy trên
  // màn hình lúc bấm duyệt. Vá bằng cách tính lại qua tinhCacTruongSnapshot()
  // — cùng một nguồn luật với create(), không chép công thức lần hai.
  // ────────────────────────────────────────────────────────────────────
  describe('update() — PUT sửa OT còn cho_duyet phải tính lại snapshot (Task 7b, review round 2)', () => {
    // T2→T6, không phải ngày lễ mặc định — cùng lịch làm việc dùng xuyên
    // suốt file (T2_DEN_T6 ở describe ngoài cùng, lặp lại cục bộ ở đây vì
    // describe này nằm trong khối dùng dungService(), không có T2_DEN_T6
    // trong scope).
    const T2_DEN_T6_CUC_BO = [1, 2, 3, 4, 5];

    it('sửa gioTu 18:00→17:00 trên OT còn cho_duyet → soGioOt tính lại thành 3 (không phải 2) ngay trên kết quả update()', async () => {
      const { service, luu } = await dungService({
        nhanVien: {
          _id: ID_NV1, employeeId: 'NV0001', hoTen: 'Nguyễn Văn A',
          ngayLamViecTrongTuan: T2_DEN_T6_CUC_BO,
        },
        don: {
          _id: '650000000000000000000601', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
          ngay: '2026-07-22', gioTu: '18:00', gioDen: '20:00',
          soGioOt: 2, heSoOt: 1.5, loaiNgayOt: 'ngay_thuong',
          trangThai: 'cho_duyet',
        },
      });

      const result = await service.update(
        '650000000000000000000601',
        { gioTu: '17:00' } as any,
      );

      expect(result.soGioOt).toBe(3);
      expect(luu.soGioOt).toBe(3);
    });

    // Kịch bản chính xác từ review: sửa rồi duyệt phải tích ĐÚNG số giờ MỚI.
    // Dùng dungService() vì mock findOne() trong đó trả lại CHÍNH tham chiếu
    // `don` — update() mutate tại chỗ nên updateStatus() gọi sau đọc lại
    // đúng snapshot đã tính lại, mô phỏng đúng luồng thật (PUT rồi mới bấm
    // Duyệt trên cùng một bản ghi).
    it('duyệt SAU KHI sửa giờ → tichTuDonOt() tích đúng 3 giờ (số MỚI), không phải 2 giờ (số CŨ)', async () => {
      const quyGio = mockQuyGio();
      const { service } = await dungService({
        quyGio,
        nhanVien: {
          _id: ID_NV1, employeeId: 'NV0001', hoTen: 'Nguyễn Văn A',
          ngayLamViecTrongTuan: T2_DEN_T6_CUC_BO,
        },
        don: {
          _id: '650000000000000000000602', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
          ngay: '2026-07-22', gioTu: '18:00', gioDen: '20:00',
          soGioOt: 2, heSoOt: 1.5, loaiNgayOt: 'ngay_thuong',
          trangThai: 'cho_duyet',
        },
      });

      await service.update('650000000000000000000602', { gioTu: '17:00' } as any);
      await service.updateStatus(
        '650000000000000000000602', 'da_duyet', 'HR', { id: 'hr1' } as any,
      );

      expect(quyGio.tichTuDonOt).toHaveBeenCalledWith(
        expect.objectContaining({ soGioOt: 3 }),
      );
    });

    it('ngay chuyển sang ngày lễ khi sửa → loaiNgayOt/heSoOt tính lại theo ngày mới (ngay_le, 3.0)', async () => {
      const NGAY_LE_MOI = '2026-07-23';
      const ngayLe = {
        timTheoNgay: jest
          .fn()
          .mockImplementation((ngay: string) =>
            Promise.resolve(
              ngay === NGAY_LE_MOI
                ? { _id: 'hl1', tenNgayLe: 'Lễ test', tuNgay: NGAY_LE_MOI, denNgay: NGAY_LE_MOI }
                : null,
            ),
          ),
      };
      const { service } = await dungService({
        ngayLe,
        nhanVien: {
          _id: ID_NV1, employeeId: 'NV0001', hoTen: 'Nguyễn Văn A',
          ngayLamViecTrongTuan: T2_DEN_T6_CUC_BO,
        },
        don: {
          _id: '650000000000000000000603', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
          ngay: '2026-07-22', gioTu: '18:00', gioDen: '20:00',
          soGioOt: 2, heSoOt: 1.5, loaiNgayOt: 'ngay_thuong',
          trangThai: 'cho_duyet',
        },
      });

      const result = await service.update(
        '650000000000000000000603',
        { ngay: NGAY_LE_MOI } as any,
      );

      expect(result.loaiNgayOt).toBe('ngay_le');
      expect(result.heSoOt).toBe(3.0);
    });

    // Không bị tính lại quá tay: sửa một trường KHÔNG nuôi công thức OT
    // (lyDo) phải để soGioOt/heSoOt/loaiNgayOt đứng yên, và không được kéo
    // theo một lượt hỏi NgayLe_Service/EmployeeRepo vô ích — chứng minh
    // guard "chỉ tính lại khi cần" hoạt động đúng, không phải lúc nào cũng
    // tính lại rồi tình cờ ra cùng số.
    it('sửa lyDo (không nuôi công thức OT) trên OT còn cho_duyet → soGioOt/heSoOt/loaiNgayOt KHÔNG đổi, không hỏi NgayLe_Service', async () => {
      const ngayLe = { timTheoNgay: jest.fn().mockResolvedValue(null) };
      const { service } = await dungService({
        ngayLe,
        don: {
          _id: '650000000000000000000604', employeeId: ID_NV1, loaiDon: 'lam_them_gio',
          ngay: '2026-07-22', gioTu: '18:00', gioDen: '20:00',
          soGioOt: 2, heSoOt: 1.5, loaiNgayOt: 'ngay_thuong',
          trangThai: 'cho_duyet', lyDo: 'cũ',
        },
      });

      const result = await service.update(
        '650000000000000000000604',
        { lyDo: 'mới' } as any,
      );

      expect(result.lyDo).toBe('mới');
      expect(result.soGioOt).toBe(2);
      expect(result.heSoOt).toBe(1.5);
      expect(result.loaiNgayOt).toBe('ngay_thuong');
      expect(ngayLe.timTheoNgay).not.toHaveBeenCalled();
    });
  });

  /**
   * (review nhánh, IMPORTANT 5) Áp dụng MỘT PHẦN rồi hỏng — khác hẳn RETRY.
   *
   * `phanBoQuyGio` trải 2 kỳ; `giuCho()` giữ xong kỳ 1 rồi ném ở kỳ 2. Bản
   * trước chỉ khôi phục trạng thái, nên chỗ giữ ở kỳ 1 kẹt vĩnh viễn: lần
   * bấm lại bị `demRongTheoLyDo()` bỏ qua kỳ 1 (ròng > 0) và lại hỏng ở kỳ
   * 2; `remove()` trên đơn `tu_choi` không đi vào nhánh nhả nào; và
   * `doiSoat()` không thấy gì bất thường vì một chỗ giữ bị rò vẫn nhất quán
   * giữa sổ và số dư. Chỉ sửa thẳng DB mới gỡ được.
   */
  describe('bù best-effort khi quỹ giờ hỏng GIỮA CHỪNG (IMPORTANT 5)', () => {
    const HAI_KY = [
      { balanceId: 'b1', kyTich: '2026-01', soGio: 2 },
      { balanceId: 'b2', kyTich: '2026-02', soGio: 1 },
    ];
    const donTuChoi = () => ({
      _id: '650000000000000000000701',
      employeeId: ID_NV1,
      loaiDon: 'nghi_bu',
      kieuNghi: 'theo_gio',
      ngay: '2026-03-10',
      soGioNghiBu: 3,
      phanBoQuyGio: HAI_KY,
      trangThai: 'tu_choi',
      isActive: true,
    });

    it('tu_choi → cho_duyet: giuCho hỏng ở kỳ 2 thì NHẢ lại TOÀN BỘ phân bổ', async () => {
      const daGiu: string[] = [];
      const quyGio = mockQuyGio({
        // Mô phỏng áp dụng MỘT PHẦN thật: kỳ 1 giữ xong mới ném ở kỳ 2.
        giuCho: jest.fn(async (_nv: string, p: any[]) => {
          for (const x of p) {
            if (x.kyTich === '2026-02') throw new Error('kỳ 2 hỏng');
            daGiu.push(x.kyTich);
          }
        }),
      });
      const { service, luu } = await dungService({ don: donTuChoi(), quyGio });

      await expect(
        service.updateStatus(
          '650000000000000000000701', 'cho_duyet', 'HR', { id: 'hr1' } as any,
        ),
      ).rejects.toThrow('kỳ 2 hỏng');

      // Vế then chốt: nhả lại trên TOÀN BỘ phân bổ, không chỉ kỳ đã giữ —
      // nơi gọi không biết hàm kia dừng ở đâu, và `nhaCho()` an toàn trên kỳ
      // chưa bị đụng (Math.max kẹp + apDung bỏ qua khi không có gì đổi).
      expect(daGiu).toEqual(['2026-01']);
      // Tham số thứ 5 `chiPhanDaGiuCuaDon = true`: nhả TRÊN TOÀN BỘ phân bổ
      // nhưng chỉ ở kỳ mà SỔ xác nhận đơn NÀY đang giữ. Nhả mù sẽ ăn mất chỗ
      // giữ của đơn KHÁC ở kỳ chưa bị đụng (`soGioDangChoDuyet` là bộ đếm
      // dùng chung theo quỹ) — và kỳ đó gần như chắc chắn đang có đơn khác
      // giữ, vì đó chính là lý do `giuCho()` vừa ném ở đấy. Bài tích hợp
      // `don-cham-cong.quy-gio.tich-hop.spec.ts` chứng minh hậu quả thật.
      expect(quyGio.nhaCho).toHaveBeenCalledWith(
        ID_NV1, HAI_KY, '650000000000000000000701', 'hr1', true,
      );
      // Trạng thái vẫn phải được khôi phục — bù không thay thế việc đó.
      expect(luu.trangThai).toBe('tu_choi');
    });

    it('cho_duyet → tu_choi: nhaCho hỏng giữa chừng thì GIỮ lại toàn bộ phân bổ', async () => {
      const quyGio = mockQuyGio({
        nhaCho: jest.fn(async (_nv: string, p: any[]) => {
          for (const x of p) if (x.kyTich === '2026-02') throw new Error('kỳ 2 hỏng');
        }),
      });
      const { service } = await dungService({
        don: { ...donTuChoi(), trangThai: 'cho_duyet' },
        quyGio,
      });

      await expect(
        service.updateStatus(
          '650000000000000000000701', 'tu_choi', 'HR', { id: 'hr1' } as any,
        ),
      ).rejects.toThrow('kỳ 2 hỏng');

      expect(quyGio.giuCho).toHaveBeenCalledWith(
        ID_NV1, HAI_KY, '650000000000000000000701', 'hr1',
      );
    });

    it('chính lời gọi bù cũng hỏng thì vẫn ném LỖI GỐC, không nuốt mất', async () => {
      const quyGio = mockQuyGio({
        giuCho: jest.fn().mockRejectedValue(new Error('lỗi gốc')),
        nhaCho: jest.fn().mockRejectedValue(new Error('lỗi phụ khi bù')),
      });
      const { service, luu } = await dungService({ don: donTuChoi(), quyGio });

      await expect(
        service.updateStatus(
          '650000000000000000000701', 'cho_duyet', 'HR', { id: 'hr1' } as any,
        ),
      ).rejects.toThrow('lỗi gốc');
      expect(luu.trangThai).toBe('tu_choi');
    });

    // Hai nhánh duyệt/hoàn CỐ Ý không bù (xem comment trong service): chúng
    // dùng chung lý do sổ `huy_nghi_bu` với cặp giữ/nhả nên một lời gọi bù sẽ
    // làm sai bộ đếm chống trùng của giuCho().
    it('cho_duyet → da_duyet hỏng thì KHÔNG gọi hoanTraDaDung để bù', async () => {
      const quyGio = mockQuyGio({
        chuyenSangDaDung: jest.fn().mockRejectedValue(new Error('hỏng')),
      });
      const { service } = await dungService({
        don: { ...donTuChoi(), trangThai: 'cho_duyet' },
        quyGio,
      });

      await expect(
        service.updateStatus(
          '650000000000000000000701', 'da_duyet', 'HR', { id: 'hr1' } as any,
        ),
      ).rejects.toThrow('hỏng');

      expect(quyGio.hoanTraDaDung).not.toHaveBeenCalled();
      expect(quyGio.nhaCho).not.toHaveBeenCalled();
      expect(quyGio.giuCho).not.toHaveBeenCalled();
    });
  });
});
