import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { BanGhiChamCong_Service } from './ban-ghi-cham-cong.service';
import { ChamCongRules_Service, khoangCachMet } from './cham-cong-rules.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { ThietBiChamCong_Service } from '../thiet-bi-cham-cong/thiet-bi-cham-cong.service';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import { CauHinhChamCong_Service } from '../cau-hinh-cham-cong/cau-hinh-cham-cong.service';
import {
  AttendanceRecord,
  WorkShift,
  AttendanceLocation,
  AttendanceRequest,
} from '@app/entities';

const USER = { id: 'sso-1', email: 'hai@cty.vn' };

const NV: any = {
  _id: 'emp-1',
  hoTen: 'Nguyễn Văn Hải',
  employeeId: 'NV0001',
  workShiftId: '507f1f77bcf86cd799439011',
  ngayLamViecTrongTuan: [1, 2, 3, 4, 5],
  // KHÔNG miễn trừ, đúng với mặc định thật của entity
  // (`@Column({ default: false })` trên Employee.choPhepChamNgoaiVung). Cấp
  // cờ miễn trừ ở đây là con đường tắt rẻ nhất để test xanh nhưng lại che
  // mất chính hành vi chặn mà Task 2 thêm vào — mọi test dùng NV mặc định sẽ
  // "miễn nhiễm" một cách vô hình, kể cả khi không hề định kiểm tra
  // geofencing. Để phần lớn test (giờ, ca, ngày nghỉ…) không vô tình dính
  // chặn mà KHÔNG cần cờ giả, `beforeEach` bên dưới cho locationRepo trả về
  // một địa điểm khớp đúng phuongThuc/maQr của DTO mặc định — mô phỏng đúng
  // tình huống thật của một nhân viên đang đứng trong vùng được phép. Test
  // cần một nhân viên được miễn trừ hoặc đang ở ngoài vùng phải tự khai báo
  // rõ ràng (xem NV_KHONG_CO_CO/NV_CO_CO trong describe('chặn chấm công
  // ngoài bán kính', ...) và test wifi "IP không khớp" bên dưới).
  choPhepChamNgoaiVung: false,
};

const CA: any = {
  _id: '507f1f77bcf86cd799439011',
  ten: 'Ca hành chính',
  gioBatDau: '08:00',
  gioKetThuc: '17:00',
  laCaQuaDem: false,
  laLinhHoat: false,
};

const CA_DEM: any = {
  _id: '507f1f77bcf86cd799439022',
  ten: 'Ca đêm',
  gioBatDau: '22:00',
  gioKetThuc: '06:00',
  laCaQuaDem: true,
  laLinhHoat: false,
};

/** Ngày lịch VN của một mốc thời gian — không phụ thuộc TZ của tiến trình test. */
const ngayVNCua = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

/** Ngày hôm nay theo giờ VN — không phụ thuộc TZ của tiến trình test. */
const homNayVN = () => ngayVNCua(new Date());

/** Ngày hôm qua theo giờ VN (VN không có DST nên trừ đúng 24h là chính xác). */
const homQuaVN = () => ngayVNCua(new Date(Date.now() - 86_400_000));

describe('BanGhiChamCong_Service', () => {
  let service: BanGhiChamCong_Service;
  let recordRepo: any;
  let shiftRepo: any;
  let locationRepo: any;
  let nhanVien: any;
  let thietBi: any;
  let ngayLe: any;
  let cauHinhChamCong: any;
  /** Đơn từ — chỉ được hỏi tới khi lượt bấm rơi ra ngoài vùng. */
  let requestRepo: any;

  beforeEach(async () => {
    recordRepo = {
      find: jest.fn().mockResolvedValue([]),
      // Service không gọi findOne() ở đâu cả (banGhiCuoiCung dùng find +
      // take:1) — mock này chỉ để test soCong gọi được mà không vỡ khi lỡ
      // set giá trị không dùng tới.
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v: any) => v),
      save: jest.fn((v: any) =>
        Promise.resolve({ ...v, _id: v._id ?? 'rec-new' }),
      ),
    };
    shiftRepo = { findOne: jest.fn().mockResolvedValue(CA) };
    requestRepo = { find: jest.fn().mockResolvedValue([]) };
    // Khớp đúng phuongThuc/maQr của DTO mặc định bên dưới ('qr'/'MA-QR') —
    // đây là tình huống thật của một nhân viên bình thường đang đứng trong
    // vùng được phép, KHÔNG phải một cách né guard chặn ngoài bán kính. Test
    // nào cần mô phỏng "ngoài vùng" hoặc "không có địa điểm nào khớp" phải tự
    // ghi đè locationRepo.find.mockResolvedValue(...) một cách rõ ràng.
    locationRepo = {
      find: jest.fn().mockResolvedValue([
        {
          _id: 'loc-mac-dinh',
          ten: 'Văn phòng chính',
          loai: 'qr',
          maQr: 'MA-QR',
          isActive: true,
        },
      ]),
    };
    nhanVien = {
      resolveEmployeeFromUser: jest.fn().mockResolvedValue(NV),
      findOne: jest.fn().mockResolvedValue(NV),
    };
    thietBi = { kiemTraThietBi: jest.fn().mockResolvedValue(undefined) };
    ngayLe = { timTheoNgay: jest.fn().mockResolvedValue(null) };
    // (P4.5) lịch chung mặc định T2–T6 — cùng giá trị NV.ngayLamViecTrongTuan
    // ở trên, nên hầu hết test (NV luôn khai riêng) không bao giờ thực sự
    // đọc tới nhánh fallback này. Test nào cố tình bỏ trống lịch riêng của
    // NV (dòng ~296, ~325 trở xuống) tự override biến này khi cần.
    cauHinhChamCong = {
      lichTuanChung: jest.fn().mockResolvedValue([1, 2, 3, 4, 5]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BanGhiChamCong_Service,
        ChamCongRules_Service,
        { provide: getRepositoryToken(AttendanceRecord), useValue: recordRepo },
        { provide: getRepositoryToken(WorkShift), useValue: shiftRepo },
        {
          provide: getRepositoryToken(AttendanceRequest),
          useValue: requestRepo,
        },
        {
          provide: getRepositoryToken(AttendanceLocation),
          useValue: locationRepo,
        },
        { provide: NhanVien_Service, useValue: nhanVien },
        { provide: ThietBiChamCong_Service, useValue: thietBi },
        { provide: NgayLe_Service, useValue: ngayLe },
        { provide: CauHinhChamCong_Service, useValue: cauHinhChamCong },
      ],
    }).compile();

    service = module.get<BanGhiChamCong_Service>(BanGhiChamCong_Service);
  });

  const DTO = {
    deviceId: 'dev-A',
    phuongThuc: 'qr' as const,
    maQr: 'MA-QR',
  };

  describe('checkIn', () => {
    it('tạo bản ghi vao với thời điểm từ đồng hồ máy chủ', async () => {
      const truoc = Date.now();
      const rec = await service.checkIn(USER, DTO);
      const sau = Date.now();

      expect(rec.loai).toBe('vao');
      expect(rec.nguonTao).toBe('tu_cham');
      expect(rec.employeeId).toBe('emp-1');
      expect(rec.employeeCode).toBe('NV0001');
      expect(rec.deviceId).toBe('dev-A');

      const t = new Date(rec.thoiDiem).getTime();
      expect(t).toBeGreaterThanOrEqual(truoc);
      expect(t).toBeLessThanOrEqual(sau);
    });

    it('ngay của bản ghi là ngày lịch theo giờ VN', async () => {
      const rec = await service.checkIn(USER, DTO);
      expect(rec.ngay).toBe(homNayVN());
    });

    it('snapshot thông tin ca vào bản ghi', async () => {
      const rec = await service.checkIn(USER, DTO);

      expect(rec.workShiftId).toBe('507f1f77bcf86cd799439011');
      expect(rec.caTen).toBe('Ca hành chính');
      expect(rec.caGioBatDau).toBe('08:00');
      expect(rec.caGioKetThuc).toBe('17:00');
    });

    it('kiểm tra thiết bị TRƯỚC khi đọc địa điểm — máy lạ không biết gì về công ty', async () => {
      thietBi.kiemTraThietBi.mockRejectedValue(
        new ForbiddenException({ code: 'THIET_BI_CHO_DUYET' }),
      );

      await expect(service.checkIn(USER, DTO)).rejects.toThrow(
        ForbiddenException,
      );

      expect(locationRepo.find).not.toHaveBeenCalled();
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('đã check-in hôm nay mà chưa ra → 409', async () => {
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: homNayVN(),
          thoiDiem: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        },
      ]);

      await expect(service.checkIn(USER, DTO)).rejects.toThrow(
        ConflictException,
      );
    });

    it('bấm hai lần trong 60 giây → trả về chính bản ghi cũ, không tạo dòng mới', async () => {
      const banGhiCu = {
        _id: 'rec-1',
        loai: 'vao',
        ngay: homNayVN(),
        thoiDiem: new Date(Date.now() - 5000).toISOString(),
      };
      recordRepo.find.mockResolvedValue([banGhiCu]);

      const rec = await service.checkIn(USER, DTO);

      expect(rec).toBe(banGhiCu);
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('bấm hai lần cách 20 giây qua ranh giới nửa đêm → không tạo dòng vao thứ hai', async () => {
      // Chạm lúc 23:59:50 (ngay = hôm qua), chạm lại lúc 00:00:10 hôm nay.
      const banGhiCu = {
        _id: 'rec-1',
        loai: 'vao',
        ngay: homQuaVN(),
        thoiDiem: new Date(Date.now() - 20_000).toISOString(),
      };
      recordRepo.find.mockResolvedValue([banGhiCu]);

      const rec = await service.checkIn(USER, DTO);

      expect(rec).toBe(banGhiCu);
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('bản ghi cuối ở TƯƠNG LAI không được coi là bấm trùng — không nuốt cú chấm thật', async () => {
      // HR nhập trước lượt vao 12:00 hôm nay, nhân viên chấm thật lúc 08:05.
      const banGhiTuongLai = {
        _id: 'rec-hr',
        loai: 'vao',
        ngay: homNayVN(),
        thoiDiem: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      };
      recordRepo.find.mockResolvedValue([banGhiTuongLai]);

      // Phải báo lỗi rõ ràng, tuyệt đối không im lặng trả về bản của HR.
      await expect(service.checkIn(USER, DTO)).rejects.toThrow(
        ConflictException,
      );
    });

    it('nhân viên đã nghỉ việc không được chấm công', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        trangThai: 'da_nghi',
      });

      await expect(service.checkIn(USER, DTO)).rejects.toThrow(
        ForbiddenException,
      );
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('workShiftId không phải ObjectId → bỏ snapshot ca, không chặn chấm công', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        workShiftId: 'ca-hanh-chinh',
      });

      const rec = await service.checkIn(USER, DTO);

      expect(rec.loai).toBe('vao');
      expect(rec.workShiftId).toBeUndefined();
      expect(rec.caTen).toBeUndefined();
      expect(rec.soPhutDiMuon).toBe(0);
      expect(shiftRepo.findOne).not.toHaveBeenCalled();
    });

    it('lượt vao còn mở từ HÔM QUA không chặn check-in hôm nay', async () => {
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: '2020-01-01',
          thoiDiem: '2020-01-01T01:00:00.000Z',
        },
      ]);

      const rec = await service.checkIn(USER, DTO);
      expect(rec.loai).toBe('vao');
    });

    it('đánh dấu laNgayNghi khi ngày là ngày lễ', async () => {
      ngayLe.timTheoNgay.mockResolvedValue({ ten: 'Quốc khánh', loai: 'le' });

      const rec = await service.checkIn(USER, DTO);

      expect(rec.laNgayNghi).toBe(true);
      // Ngày nghỉ thì không đánh giá đi muộn.
      expect(rec.soPhutDiMuon).toBe(0);
    });

    it('ngayLamViecTrongTuan rỗng nghĩa là CHƯA cấu hình → không suy ra ngày nghỉ', async () => {
      // (P4.5) NV rỗng giờ rơi về lịch CÔNG TY qua lichTuanApDung() — để giữ
      // đúng ý test gốc ("CHƯA cấu hình Ở CẢ HAI TẦNG"), phải tắt luôn lịch
      // công ty ở đây, nếu không assertion sẽ phụ thuộc ngày chạy test (chỉ
      // đúng vào các ngày rơi trong mock mặc định T2–T6 của beforeEach).
      cauHinhChamCong.lichTuanChung.mockResolvedValue(undefined);
      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        ngayLamViecTrongTuan: [] as number[],
      });

      const rec = await service.checkIn(USER, DTO);
      expect(rec.laNgayNghi).toBe(false);
    });

    it('NV không khai lịch riêng thì theo lịch công ty', async () => {
      // Không dùng homNayVN() để suy ra kỳ vọng: hàm đó chạy đúng công thức
      // MÀ code sản xuất cũng dùng (thứ trong tuần của ngày hôm nay), nên một
      // bug lật ngược includes()/laNgayNghi vẫn cho ra kỳ vọng khớp — test sẽ
      // xanh giả bất kể code đúng hay sai. Cố định một ngày THẬT (2026-08-08,
      // thứ Bảy) làm `thoiDiem` giả lập qua fake timer, để cả kỳ vọng lẫn
      // input đều là hằng số độc lập với logic đang được kiểm.
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T03:00:00.000Z'));
      try {
        // Bỏ hẳn khai riêng ⇒ rơi về lịch chung T2–T6 đã mock ở beforeEach.
        nhanVien.resolveEmployeeFromUser.mockResolvedValue({
          ...NV,
          ngayLamViecTrongTuan: undefined,
        });

        // 2026-08-08 là thứ Bảy — ngoài lịch chung T2–T6 ⇒ phải là ngày nghỉ.
        expect((await service.checkIn(USER, DTO)).laNgayNghi).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });

    it('đánh dấu laNgayNghi khi ngày ngoài lịch làm việc của NV', async () => {
      // Lịch chỉ chứa đúng thứ của hôm nay → không phải ngày nghỉ.
      const [nam, thang, ngay] = homNayVN().split('-').map(Number);
      const thuHomNay = new Date(Date.UTC(nam, thang - 1, ngay)).getUTCDay();

      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        ngayLamViecTrongTuan: [thuHomNay],
      });
      expect((await service.checkIn(USER, DTO)).laNgayNghi).toBe(false);

      // Lịch chứa mọi thứ TRỪ hôm nay → là ngày nghỉ.
      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        ngayLamViecTrongTuan: [0, 1, 2, 3, 4, 5, 6].filter(
          (t) => t !== thuHomNay,
        ),
      });
      expect((await service.checkIn(USER, DTO)).laNgayNghi).toBe(true);
    });

    it('chuẩn hoá IP trước khi đối chiếu wifi — ::ffff: và X-Forwarded-For nhiều chặng', async () => {
      locationRepo.find.mockResolvedValue([
        {
          _id: 'loc-wifi',
          ten: 'Văn phòng Hà Nội',
          loai: 'wifi',
          ipWifi: '113.161.20.5',
          isActive: true,
        },
      ]);

      const rec = await service.checkIn(
        USER,
        { deviceId: 'dev-A', phuongThuc: 'wifi' as const },
        '::ffff:113.161.20.5, 10.0.0.1',
      );

      expect(rec.ngoaiVung).toBe(false);
      expect(rec.locationId).toBe('loc-wifi');
      expect(rec.locationTen).toBe('Văn phòng Hà Nội');
      // Lưu bản đã chuẩn hoá để báo cáo đọc được.
      expect(rec.ipAddress).toBe('113.161.20.5');
    });

    it('IP không khớp địa điểm wifi nào → ngoài vùng', async () => {
      // Test này kiểm tra riêng việc GẮN CỜ ngoaiVung khi IP lệch, không phải
      // hành vi chặn (có test riêng ở describe('chặn chấm công ngoài bán
      // kính', ...)). IP lệch nghĩa là NV thật sự đang ở ngoài vùng, nên với
      // NV mặc định (không miễn trừ) cú gọi này sẽ bị chặn 403 thay vì tạo
      // được bản ghi để kiểm tra cờ — khai rõ miễn trừ ở đây để không phải
      // âm thầm nhờ vào cờ mặc định của NV (đó chính là điều Task 2 review
      // yêu cầu sửa).
      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        choPhepChamNgoaiVung: true,
      });
      locationRepo.find.mockResolvedValue([
        {
          _id: 'loc-wifi',
          ten: 'Văn phòng Hà Nội',
          loai: 'wifi',
          ipWifi: '113.161.20.5',
          isActive: true,
        },
      ]);

      const rec = await service.checkIn(
        USER,
        { deviceId: 'dev-A', phuongThuc: 'wifi' as const },
        '::ffff:1.2.3.4',
      );

      expect(rec.ngoaiVung).toBe(true);
    });
  });

  describe('checkOut', () => {
    it('chưa có lượt vao đang mở → 409', async () => {
      recordRepo.find.mockResolvedValue([]);

      await expect(service.checkOut(USER, DTO)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lấy ngay từ bản ghi vao đang mở — ca qua đêm tự đúng', async () => {
      // Lượt vao tối HÔM QUA (ca 22:00–06:00, laCaQuaDem: true) vẫn còn hiệu
      // lực sáng nay — chỉ ca qua đêm mới được đóng sang ngày lịch hôm sau.
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: homQuaVN(),
          thoiDiem: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
          laCaQuaDem: true,
        },
      ]);

      const rec = await service.checkOut(USER, DTO);

      expect(rec.loai).toBe('ra');
      expect(rec.ngay).toBe(homQuaVN());
    });

    it('lượt vao mở đã quá hạn → 409, không gán bản ghi ra về ngày cũ', async () => {
      // NV vao ngày 20/07 rồi quên bấm ra, 21–24/07 nghỉ phép, sáng 25/07 bấm ra.
      recordRepo.find.mockResolvedValue([
        {
          _id: 'rec-treo',
          loai: 'vao',
          ngay: '2026-07-20',
          thoiDiem: '2026-07-20T01:00:00.000Z',
        },
      ]);

      await expect(service.checkOut(USER, DTO)).rejects.toThrow(
        ConflictException,
      );
      // Thông báo phải nêu rõ ngày của lượt chưa đóng để NV biết báo HR.
      await expect(service.checkOut(USER, DTO)).rejects.toThrow(/2026-07-20/);
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('bản ghi ra ở TƯƠNG LAI không được coi là bấm trùng', async () => {
      recordRepo.find.mockResolvedValue([
        {
          _id: 'rec-tuong-lai',
          loai: 'ra',
          ngay: homNayVN(),
          thoiDiem: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        },
      ]);

      await expect(service.checkOut(USER, DTO)).rejects.toThrow(
        ConflictException,
      );
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('bản ghi ra kế thừa snapshot ca của lượt vao đang mở, không lấy ca hiện tại', async () => {
      // HR đổi ca của NV giữa lúc vào và lúc ra: hai nửa một phiên phải cùng ca.
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: homQuaVN(),
          thoiDiem: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
          workShiftId: CA_DEM._id,
          caTen: CA_DEM.ten,
          caGioBatDau: CA_DEM.gioBatDau,
          caGioKetThuc: CA_DEM.gioKetThuc,
          laCaQuaDem: true,
        },
      ]);
      shiftRepo.findOne.mockResolvedValue(CA); // ca hiện tại đã bị đổi

      const rec = await service.checkOut(USER, DTO);

      expect(rec.caTen).toBe('Ca đêm');
      expect(rec.caGioBatDau).toBe('22:00');
      expect(rec.caGioKetThuc).toBe('06:00');
      expect(rec.laCaQuaDem).toBe(true);
      expect(rec.workShiftId).toBe(CA_DEM._id);
    });

    it('nhân viên đã nghỉ việc không được check-out', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        trangThai: 'da_nghi',
      });

      await expect(service.checkOut(USER, DTO)).rejects.toThrow(
        ForbiddenException,
      );
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('bấm ra hai lần trong 60 giây → trả về bản ghi cũ', async () => {
      const banGhiCu = {
        _id: 'rec-9',
        loai: 'ra',
        ngay: '2026-07-15',
        thoiDiem: new Date(Date.now() - 3000).toISOString(),
      };
      recordRepo.find.mockResolvedValue([banGhiCu]);

      const rec = await service.checkOut(USER, DTO);

      expect(rec).toBe(banGhiCu);
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    // P3.5 đảo ngược luật cũ: bản ghi cuối là 'ra' không còn tự động bị chặn
    // (xem describe('luật vào/ra mới (P3.5)', ...) cho trường hợp NGƯỢC LẠI —
    // đã có vao thì chấm ra lần hai phải được chấp nhận). Test này vẫn giữ
    // nguyên kỳ vọng 409 vì lý do khác: ngày công '2026-07-15' của bản ghi
    // 'ra' cũ đó KHÔNG có lượt vao nào — đúng luật mới "chưa có vao thì vẫn
    // chặn".
    it('ngày công của bản ghi ra cũ (quá 60 giây) không có lượt vao nào → vẫn 409', async () => {
      // recordRepo.find gọi hai lần: banGhiCuoiCung (bản ghi 'ra' cũ) rồi
      // luotVaoCuaNgayCong tra lượt vao của ngày '2026-07-15' — rỗng, đúng
      // với giả thiết của test.
      recordRepo.find
        .mockResolvedValueOnce([
          {
            _id: 'rec-9',
            employeeId: 'emp-1',
            loai: 'ra',
            ngay: '2026-07-15',
            thoiDiem: new Date(Date.now() - 5 * 60_000).toISOString(),
          },
        ])
        .mockResolvedValueOnce([]); // không có lượt vao nào cho ngày công đó

      // Chỉ assert class ConflictException thì không phân biệt được với
      // nhánh 409 còn lại (`luotVaoConHieuLuc` false — "quá hạn để tự
      // check-out") — assert đúng thông điệp để ghim đúng nhánh mà tên test
      // này khẳng định đã chạy: "chưa có vao nào" (`if (!moc)`), không phải
      // "có vao nhưng đã treo quá hạn".
      await expect(service.checkOut(USER, DTO)).rejects.toThrow(
        'Chưa có lượt check-in nào đang mở để check-out.',
      );
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('kiểm tra thiết bị TRƯỚC khi đọc địa điểm ở cả check-out', async () => {
      thietBi.kiemTraThietBi.mockRejectedValue(
        new ForbiddenException({ code: 'THIET_BI_BI_THU_HOI' }),
      );

      await expect(service.checkOut(USER, DTO)).rejects.toThrow(
        ForbiddenException,
      );
      expect(locationRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('luật vào/ra mới (P3.5): không quay lại chấm vào, cho phép chấm ra lặp lại', () => {
    const banGhi = (over: any) => ({
      _id: 'r',
      employeeId: 'emp-1',
      ngay: homNayVN(),
      thoiDiem: new Date(Date.now() - 3600_000),
      ...over,
    });

    // Trường hợp "lượt vào treo quá hạn → hanhDongKeTiep" đã được kiểm tra ở
    // describe('homNay', ...) → 'hanhDongKeTiep là vao khi lượt vao mở đã quá
    // hạn — không dẫn NV vào cái bẫy check-out': ngày công bị đẩy về hôm nay
    // (không chứa lượt vào cũ) nên kết quả đúng là 'vao', không phải 'ra' —
    // KHÔNG lặp lại test đó ở đây với kỳ vọng ngược lại.

    /**
     * recordRepo.find được gọi HAI lần trong homNay(): banGhiCuoiCung (DESC,
     * take 1) rồi danh sách bản ghi của ngày công. Phải mock riêng từng lần
     * để `cuoi` đúng là bản ghi 'ra' mới nhất — nếu chỉ mockResolvedValue một
     * mảng chung [vao, ra] như brief gốc, `cuoi` sẽ luôn là phần tử ĐẦU của
     * mảng ('vao'), không hề dựng được tình huống "bản ghi cuối là ra".
     */
    it('đã đủ vào và ra → vẫn là ra, để bấm lại cập nhật giờ ra', async () => {
      const vao = banGhi({ _id: 'r1', loai: 'vao' });
      const ra = banGhi({ _id: 'r2', loai: 'ra' });
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.find
        .mockResolvedValueOnce([ra]) // banGhiCuoiCung: bản ghi cuối là 'ra'
        .mockResolvedValueOnce([vao, ra]); // danh sách bản ghi của ngày công

      const kq = await service.homNay(USER);

      expect(kq.hanhDongKeTiep).toBe('ra');
    });

    it('ngày công chưa có gì → vao', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.find.mockResolvedValue([]);

      const kq = await service.homNay(USER);

      expect(kq.hanhDongKeTiep).toBe('vao');
    });

    /**
     * Đây là thứ làm "bấm lại để cập nhật giờ ra" chạy được. Trước P3.5
     * nhánh này ném 409 và người lỡ bấm ra sớm bị khoá cả ngày.
     *
     * Hai chỗ sửa so với brief gốc (service KHÔNG dùng `recordRepo.findOne`
     * — banGhiCuoiCung dùng `find` + `take: 1` — và guard ngoài bán kính của
     * Task 2 vẫn đứng nguyên):
     * - `recordRepo.findOne.mockResolvedValue(raCu)` là mock chết, không ảnh
     *   hưởng gì tới `cuoi` thật. Đổi sang hai lần `recordRepo.find`: lần
     *   đầu trả bản ghi cuối (raCu), lần sau trả lượt vao của ngày công đó.
     * - DTO dùng `phuongThuc: 'gps'` mà `locationRepo.find` trả `[]` thì
     *   `doiChieuGps` không có địa điểm gps nào để so khớp → ngoaiVung: true
     *   → NV (không có cờ miễn trừ ngoài vùng) bị chặn 403 bởi guard Task 2
     *   TRƯỚC khi kịp chạm tới hành vi đang test. Phải cấp một địa điểm gps
     *   đúng toạ độ DTO để ở trong bán kính.
     */
    it('chấm ra lần hai trong cùng ngày công → ghi thêm bản ghi ra', async () => {
      const vao = banGhi({ _id: 'r1', loai: 'vao' });
      const raCu = banGhi({
        _id: 'r2',
        loai: 'ra',
        thoiDiem: new Date(Date.now() - 1800_000),
      });
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.find
        .mockResolvedValueOnce([raCu]) // banGhiCuoiCung: bản ghi cuối là 'ra'
        .mockResolvedValueOnce([vao]); // luotVaoCuaNgayCong: lượt vao của ngày công đó
      recordRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      locationRepo.find.mockResolvedValue([
        {
          _id: 'loc-gps',
          ten: 'VP',
          loai: 'gps',
          latitude: 21.0,
          longitude: 105.8,
          banKinh: 100,
          isActive: true,
        },
      ]);

      const kq = await service.checkOut(USER, {
        deviceId: 'd1',
        phuongThuc: 'gps',
        latitude: 21.0,
        longitude: 105.8,
      });

      expect(kq.loai).toBe('ra');
      // Phải mang cùng ngày công với lượt vào, không phải ngày lịch hiện tại
      // — nếu không ca qua đêm sẽ đẻ lượt ra lạc sang ngày sau.
      expect(kq.ngay).toBe(vao.ngay);
    });

    it('ngày công chưa có lượt vao nào → chấm ra vẫn bị chặn', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.find.mockResolvedValue([]);

      await expect(
        service.checkOut(USER, { deviceId: 'd1', phuongThuc: 'gps' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('homNay', () => {
    it('hanhDongKeTiep là ra khi lượt cuối là vao', async () => {
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: homNayVN(),
          thoiDiem: new Date().toISOString(),
        },
      ]);

      const kq = await service.homNay(USER);

      expect(kq.ngay).toBe(homNayVN());
      expect(kq.hanhDongKeTiep).toBe('ra');
      expect(kq.nhanVien.employeeCode).toBe('NV0001');
      expect(kq.ca?.ten).toBe('Ca hành chính');
    });

    it('hanhDongKeTiep là vao khi chưa có bản ghi nào', async () => {
      const kq = await service.homNay(USER);
      expect(kq.hanhDongKeTiep).toBe('vao');
    });

    it('hanhDongKeTiep là ra khi lượt vao mở từ hôm qua là CA QUA ĐÊM', async () => {
      // Ca qua đêm (laCaQuaDem: true) 22:00–06:00: lượt vào hôm qua vẫn đang
      // trong ca, phải chấm ra được sang hôm sau.
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: homQuaVN(),
          thoiDiem: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
          laCaQuaDem: true,
        },
      ]);

      const kq = await service.homNay(USER);
      expect(kq.hanhDongKeTiep).toBe('ra');
    });

    it('hanhDongKeTiep là vao khi lượt vao treo từ hôm qua là CA THƯỜNG (quên chấm ra)', async () => {
      // Ca thường (laCaQuaDem: false) quên chấm ra hôm qua: hôm nay là NGÀY
      // MỚI, không phải phần đuôi của ngày công cũ. Nút phải hiện "chấm VÀO"
      // và 3 ô hôm nay phải rỗng — nếu vẫn coi lượt treo là còn hiệu lực thì
      // dữ liệu hôm qua hiện lên như thể hôm nay đã chấm (đúng bug NV0009 báo
      // trên production). Lượt treo chờ HR nhập bù giờ ra cho ngày cũ.
      //
      // Mock PHẢI lọc theo where.ngay như DB thật: nếu không, banGhi của ngày
      // công vẫn rỗng dù ngayCong bị kéo về hôm qua, và test xanh cả trước
      // khi sửa — che mất chính bug đang chữa.
      const luotVaoTreo = {
        loai: 'vao',
        ngay: homQuaVN(),
        thoiDiem: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        laCaQuaDem: false,
      };
      recordRepo.find.mockImplementation((opts: any) => {
        const ngay = opts?.where?.ngay;
        // banGhiCuoiCung: không lọc theo ngay → trả lượt cuối cùng.
        if (ngay === undefined) return Promise.resolve([luotVaoTreo]);
        // Danh sách của một NGÀY CÔNG cụ thể: chỉ hôm qua mới có lượt treo.
        if (ngay === homQuaVN()) return Promise.resolve([luotVaoTreo]);
        return Promise.resolve([]);
      });

      const kq = await service.homNay(USER);
      expect(kq.hanhDongKeTiep).toBe('vao');
      expect(kq.banGhi).toEqual([]);
      expect(kq.ngayCong).toBe(homNayVN());
    });

    it('hanhDongKeTiep là vao khi lượt vao mở đã quá hạn — không dẫn NV vào cái bẫy check-out', async () => {
      // recordRepo.find được gọi HAI lần trong homNay(): banGhiCuoiCung (lấy
      // lượt vao treo quá hạn) rồi danh sách bản ghi của NGÀY CÔNG đang xét
      // (= hôm nay, vì lượt vao treo không còn hiệu lực nên không kéo
      // ngayCong về quá khứ). Ngày công hôm nay chưa có bản ghi nào — phải
      // mock hai lần find riêng biệt, nếu không lượt vao treo của ngày
      // 2026-07-20 sẽ lẫn vào danh sách của hôm nay (mock dùng chung một
      // mảng cho cả hai lần gọi, không lọc theo `where.ngay` như DB thật).
      recordRepo.find
        .mockResolvedValueOnce([
          {
            loai: 'vao',
            ngay: '2026-07-20',
            thoiDiem: '2026-07-20T01:00:00.000Z',
          },
        ])
        .mockResolvedValueOnce([]); // ngày công hôm nay chưa có bản ghi nào

      const kq = await service.homNay(USER);
      expect(kq.hanhDongKeTiep).toBe('vao');
    });

    /**
     * Ca qua đêm 22:00–06:00, nhân viên mở app lúc 00:30.
     *
     * Trước đây `banGhi` lọc theo ngày lịch HÔM NAY còn `hanhDongKeTiep` suy
     * từ bản ghi cuối bất kể ngày, nên hai phần nói ngược nhau: nút hiện
     * "Chấm công RA" mà ngay dưới là "Chưa có lượt chấm công nào" — đọc như
     * hệ thống vừa mất dữ liệu, trong khi lượt vào vẫn còn nguyên ở ngày
     * công hôm trước.
     */
    it('ca qua đêm: danh sách hiện đúng lượt vào của ngày công đang mở, không rỗng', async () => {
      const luotVao = {
        loai: 'vao',
        ngay: homQuaVN(),
        thoiDiem: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
        laCaQuaDem: true,
      };
      // Lần find đầu = banGhiCuoiCung (DESC, take 1); lần sau = danh sách
      // bản ghi của ngày công.
      recordRepo.find
        .mockResolvedValueOnce([luotVao])
        .mockResolvedValueOnce([luotVao]);

      const kq = await service.homNay(USER);

      expect(kq.hanhDongKeTiep).toBe('ra');
      expect(kq.ngayCong).toBe(homQuaVN());
      expect(kq.banGhi).toHaveLength(1);
      // Truy vấn danh sách phải hỏi đúng ngày công đang mở, không phải hôm nay.
      expect(recordRepo.find).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { employeeId: 'emp-1', ngay: homQuaVN(), isActive: true },
        }),
      );
    });

    it('ngày thường: ngayCong trùng ngày lịch hôm nay', async () => {
      recordRepo.find.mockResolvedValue([]);

      const kq = await service.homNay(USER);

      expect(kq.ngay).toBe(homNayVN());
      expect(kq.ngayCong).toBe(homNayVN());
    });

    it('lượt vao quá hạn không kéo ngayCong về quá khứ — nút hiện "vao" thì danh sách cũng là của hôm nay', async () => {
      // Cùng lý do mock hai lần như test ngay phía trên: lần đầu là
      // banGhiCuoiCung (lượt vao treo), lần sau là danh sách của ngày công
      // hôm nay — rỗng, vì lượt vao treo không thuộc về hôm nay.
      recordRepo.find
        .mockResolvedValueOnce([
          {
            loai: 'vao',
            ngay: '2026-07-20',
            thoiDiem: '2026-07-20T01:00:00.000Z',
          },
        ])
        .mockResolvedValueOnce([]);

      const kq = await service.homNay(USER);

      expect(kq.hanhDongKeTiep).toBe('vao');
      expect(kq.ngayCong).toBe(homNayVN());
    });
  });

  describe('homNay — soCong', () => {
    it('trả 0 khi chưa có bản ghi nào', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.find.mockResolvedValue([]);
      recordRepo.findOne.mockResolvedValue(null);

      const kq = await service.homNay(USER);

      expect(kq.soCong).toBe(0);
    });

    it('trả null khi mới có lượt vào — màn hình hiện "—", không hiện 0', async () => {
      const vao = {
        _id: 'r1',
        employeeId: 'emp-1',
        ngay: homNayVN(),
        loai: 'vao',
        thoiDiem: new Date(),
      };
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.find.mockResolvedValue([vao]);
      recordRepo.findOne.mockResolvedValue(null);

      const kq = await service.homNay(USER);

      expect(kq.soCong).toBeNull();
    });

    it('trả 1 khi có đủ vào và ra', async () => {
      const ngay = homNayVN();
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.find.mockResolvedValue([
        { _id: 'r1', employeeId: 'emp-1', ngay, loai: 'vao', thoiDiem: new Date() },
        { _id: 'r2', employeeId: 'emp-1', ngay, loai: 'ra', thoiDiem: new Date() },
      ]);
      recordRepo.findOne.mockResolvedValue(null);

      const kq = await service.homNay(USER);

      expect(kq.soCong).toBe(1);
    });

    // Dữ liệu bất thường: HR nhập bù mỗi lượt 'ra'. Không có lượt vào thì
    // không có gì để tính — 0, không phải 1. Khoá lại để lần sửa sau không
    // vô tình biến bản ghi lẻ thành một công.
    it('trả 0 khi chỉ có lượt ra mà không có lượt vào', async () => {
      const ngay = homNayVN();
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.find.mockResolvedValue([
        { _id: 'r2', employeeId: 'emp-1', ngay, loai: 'ra', thoiDiem: new Date() },
      ]);
      recordRepo.findOne.mockResolvedValue(null);

      const kq = await service.homNay(USER);

      expect(kq.soCong).toBe(0);
    });
  });

  describe('homNay — địa điểm và phòng ban', () => {
    it('trả toàn bộ địa điểm đang bật, giữ nguyên tên trường banKinh', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        departmentId: 'dept-ky-thuat',
      });
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.find.mockResolvedValue([]);
      recordRepo.findOne.mockResolvedValue(null);
      locationRepo.find.mockResolvedValue([
        { _id: 'loc-1', ten: 'Văn phòng HN', loai: 'gps', banKinh: 100 },
        { _id: 'loc-2', ten: 'Chi nhánh HCM', loai: 'wifi' },
      ]);

      const kq = await service.homNay(USER);

      expect(kq.diaDiem).toEqual([
        { id: 'loc-1', ten: 'Văn phòng HN', loai: 'gps', banKinh: 100 },
        { id: 'loc-2', ten: 'Chi nhánh HCM', loai: 'wifi', banKinh: undefined },
      ]);
      expect(kq.departmentId).toBe('dept-ky-thuat');
    });

    it('chỉ lấy địa điểm isActive — địa điểm đã tắt không được hiện lên màn hình nhân viên', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.find.mockResolvedValue([]);
      recordRepo.findOne.mockResolvedValue(null);
      locationRepo.find.mockResolvedValue([]);

      await service.homNay(USER);

      expect(locationRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });
  });

  describe('hrNhap', () => {
    it('tạo bản ghi nguonTao=hr_nhap, không cần thiết bị', async () => {
      const rec = await service.hrNhap(
        {
          employeeId: 'emp-1',
          ngay: '2026-07-20',
          loai: 'vao',
          gio: '08:00',
          ghiChu: 'NV quên chấm',
        },
        'HR Lan',
      );

      expect(rec.nguonTao).toBe('hr_nhap');
      expect(rec.ngay).toBe('2026-07-20');
      expect(rec.ngoaiVung).toBe(false);
      expect(thietBi.kiemTraThietBi).not.toHaveBeenCalled();
      expect(nhanVien.findOne).toHaveBeenCalledWith('emp-1');
    });

    it('quy đổi giờ VN sang ISO đúng (VN = UTC+7 quanh năm)', async () => {
      const rec = await service.hrNhap(
        { employeeId: 'emp-1', ngay: '2026-07-20', loai: 'vao', gio: '08:00' },
        'HR Lan',
      );

      expect(rec.thoiDiem).toBe('2026-07-20T01:00:00.000Z');
    });

    it('tính đi muộn theo giờ HR nhập', async () => {
      const rec = await service.hrNhap(
        { employeeId: 'emp-1', ngay: '2026-07-20', loai: 'vao', gio: '08:25' },
        'HR Lan',
      );

      expect(rec.soPhutDiMuon).toBe(25);
      expect(rec.soPhutVeSom).toBe(0);
    });

    it('tính về sớm theo giờ HR nhập', async () => {
      const rec = await service.hrNhap(
        { employeeId: 'emp-1', ngay: '2026-07-20', loai: 'ra', gio: '16:30' },
        'HR Lan',
      );

      expect(rec.soPhutVeSom).toBe(30);
      expect(rec.soPhutDiMuon).toBe(0);
    });

    it('ngày lễ thì không đánh giá muộn/sớm', async () => {
      ngayLe.timTheoNgay.mockResolvedValue({ ten: 'Giải phóng', loai: 'le' });

      const rec = await service.hrNhap(
        { employeeId: 'emp-1', ngay: '2026-04-30', loai: 'vao', gio: '10:00' },
        'HR Lan',
      );

      expect(rec.laNgayNghi).toBe(true);
      expect(rec.soPhutDiMuon).toBe(0);
    });

    it('dùng CHUNG công thức đi muộn với đường tự chấm — ca qua đêm, vao lúc 00:45', async () => {
      shiftRepo.findOne.mockResolvedValue(CA_DEM);
      nhanVien.findOne.mockResolvedValue({
        ...NV,
        workShiftId: CA_DEM._id,
      });

      const rec = await service.hrNhap(
        { employeeId: 'emp-1', ngay: '2026-07-20', loai: 'vao', gio: '00:45' },
        'HR Lan',
      );

      // 00:45 của ca 22:00–06:00 là đi muộn 2h45, không phải 0.
      expect(rec.soPhutDiMuon).toBe(165);
    });

    it('dùng CHUNG công thức về sớm với đường tự chấm — ca hành chính, ra lúc 06:00', async () => {
      const rec = await service.hrNhap(
        { employeeId: 'emp-1', ngay: '2026-07-20', loai: 'ra', gio: '06:00' },
        'HR Lan',
      );

      // Ca 08:00–17:00 mà bấm ra lúc 06:00 là làm thêm qua đêm → không về sớm.
      expect(rec.soPhutVeSom).toBe(0);
    });

    it('ca qua đêm: lượt ra thuộc ngày kế tiếp nên thoiDiem phải muộn hơn lượt vao', async () => {
      shiftRepo.findOne.mockResolvedValue(CA_DEM);
      nhanVien.findOne.mockResolvedValue({ ...NV, workShiftId: CA_DEM._id });

      const vao = await service.hrNhap(
        { employeeId: 'emp-1', ngay: '2026-07-20', loai: 'vao', gio: '22:00' },
        'HR Lan',
      );
      const ra = await service.hrNhap(
        { employeeId: 'emp-1', ngay: '2026-07-20', loai: 'ra', gio: '06:00' },
        'HR Lan',
      );

      // ngay (ngày công) vẫn là 20/07, chỉ thoiDiem sang ngày lịch kế tiếp.
      expect(ra.ngay).toBe('2026-07-20');
      expect(ra.thoiDiem).toBe('2026-07-20T23:00:00.000Z'); // 06:00 ngày 21/07 giờ VN
      expect(new Date(ra.thoiDiem).getTime()).toBeGreaterThan(
        new Date(vao.thoiDiem).getTime(),
      );
    });

    it('chặn nhập thời điểm ở TƯƠNG LAI', async () => {
      const mai = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(Date.now() + 86_400_000));

      await expect(
        service.hrNhap(
          { employeeId: 'emp-1', ngay: mai, loai: 'vao', gio: '08:00' },
          'HR Lan',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('ngày không tồn tại trên lịch → BadRequestException', async () => {
      await expect(
        service.hrNhap(
          {
            employeeId: 'emp-1',
            ngay: '2026-02-30',
            loai: 'vao',
            gio: '08:00',
          },
          'HR Lan',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('lưu employeeId theo _id của hồ sơ, không theo chuỗi client gửi', async () => {
      nhanVien.findOne.mockResolvedValue({
        ...NV,
        _id: '507f1f77bcf86cd799439aaa',
      });

      const rec = await service.hrNhap(
        {
          employeeId: '507F1F77BCF86CD799439AAA',
          ngay: '2026-07-20',
          loai: 'vao',
          gio: '08:00',
        },
        'HR Lan',
      );

      expect(rec.employeeId).toBe('507f1f77bcf86cd799439aaa');
    });

    it('ghi lại người thực hiện trong ghiChu', async () => {
      const rec = await service.hrNhap(
        { employeeId: 'emp-1', ngay: '2026-07-20', loai: 'vao', gio: '08:00' },
        'HR Lan',
      );

      expect(rec.ghiChu).toContain('HR Lan');
    });
  });

  describe('cuaToi', () => {
    beforeEach(() => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
    });

    it('lọc theo employeeId suy từ token, không phải từ tham số gọi vào', async () => {
      recordRepo.find.mockResolvedValue([]);

      await service.cuaToi(USER, '2026-07-21', '2026-07-27');

      expect(nhanVien.resolveEmployeeFromUser).toHaveBeenCalledWith(USER);
      expect(recordRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employeeId: 'emp-1',
            isActive: true,
            ngay: { $gte: '2026-07-21', $lte: '2026-07-27' },
          }),
        }),
      );
    });

    it('sắp xếp theo thoiDiem tăng dần để màn hình gom theo ngày không phải sắp lại', async () => {
      recordRepo.find.mockResolvedValue([]);

      await service.cuaToi(USER, '2026-07-21', '2026-07-27');

      expect(recordRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { thoiDiem: 'ASC' } }),
      );
    });

    it('thiếu tuNgay hoặc denNgay → BadRequest', async () => {
      await expect(service.cuaToi(USER, undefined, '2026-07-27')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cuaToi(USER, '2026-07-21', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ngày sai định dạng hoặc không có thật → BadRequest', async () => {
      await expect(service.cuaToi(USER, '21/07/2026', '2026-07-27')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cuaToi(USER, '2026-02-30', '2026-03-01')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('denNgay trước tuNgay → BadRequest', async () => {
      await expect(service.cuaToi(USER, '2026-07-27', '2026-07-21')).rejects.toThrow(
        BadRequestException,
      );
    });

    // Endpoint này chỉ để vẽ lịch tuần. Không chặn thì nó thành cửa kéo cả
    // năm dữ liệu vị trí về máy trong một request.
    it('khoảng đúng 31 ngày vẫn qua, 32 ngày bị chặn', async () => {
      recordRepo.find.mockResolvedValue([]);

      await expect(
        service.cuaToi(USER, '2026-07-01', '2026-07-31'),
      ).resolves.toEqual([]);

      await expect(
        service.cuaToi(USER, '2026-07-01', '2026-08-01'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /**
   * Lịch tuần trên màn hình nhân viên chỉ đọc BẢN GHI, nên ngày nghỉ, ngày
   * lễ và ngày quên chấm hoàn toàn đều xám như nhau — không phân biệt được
   * "hôm nay không phải chấm" với "hôm nay quên chấm". Endpoint này trả về
   * đúng những ngày KHÔNG phải đi làm trong khoảng, để màn hình đánh dấu.
   *
   * Luật thừa kế 3 tầng (lịch riêng NV → lịch công ty → chưa cấu hình) nằm ở
   * `lichTuanApDung` phía BE, cố ý không đẩy sang FE: FE tự đoán là đẻ ra
   * tầng thứ tư lệch với bảng công.
   */
  describe('ngayNghiCuaToi', () => {
    beforeEach(() => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV);
      ngayLe.timTheoKhoang = jest.fn().mockResolvedValue([]);
    });

    it('đánh dấu ngày ngoài lịch tuần của NV là nghỉ', async () => {
      // NV khai riêng T2–T6. Tuần 20/07 (T2) → 26/07 (CN) ⇒ nghỉ T7 25 và CN 26.
      const kq = await service.ngayNghiCuaToi(USER, '2026-07-20', '2026-07-26');

      expect(kq).toEqual([
        { ngay: '2026-07-25', loai: 'nghi' },
        { ngay: '2026-07-26', loai: 'nghi' },
      ]);
    });

    it('dùng lịch CHUNG của công ty khi NV không khai riêng', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        ngayLamViecTrongTuan: undefined,
      });
      cauHinhChamCong.lichTuanChung.mockResolvedValue([1, 2, 3, 4, 5, 6]);

      const kq = await service.ngayNghiCuaToi(USER, '2026-07-20', '2026-07-26');

      // T2–T7 ⇒ chỉ CN 26 là nghỉ.
      expect(kq).toEqual([{ ngay: '2026-07-26', loai: 'nghi' }]);
    });

    it('chưa cấu hình lịch ở cả hai tầng → KHÔNG ngày nào là ngày nghỉ', async () => {
      // Cùng quy ước với `laNgayLamViec` bên suy-ky-hieu: lịch rỗng nghĩa là
      // CHƯA CẤU HÌNH, không phải "nghỉ cả tuần". Hiểu ngược là màn hình báo
      // nhân viên khỏi chấm công suốt cả tháng.
      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        ngayLamViecTrongTuan: undefined,
      });
      cauHinhChamCong.lichTuanChung.mockResolvedValue(undefined);

      const kq = await service.ngayNghiCuaToi(USER, '2026-07-20', '2026-07-26');

      expect(kq).toEqual([]);
    });

    it('ngày lễ được đánh dấu loai=le, kể cả khi rơi vào ngày làm việc', async () => {
      ngayLe.timTheoKhoang.mockResolvedValue([
        { ten: 'Quốc khánh', tuNgay: '2026-07-22', denNgay: '2026-07-23' },
      ]);

      const kq = await service.ngayNghiCuaToi(USER, '2026-07-20', '2026-07-26');

      expect(kq).toEqual([
        { ngay: '2026-07-22', loai: 'le' },
        { ngay: '2026-07-23', loai: 'le' },
        { ngay: '2026-07-25', loai: 'nghi' },
        { ngay: '2026-07-26', loai: 'nghi' },
      ]);
    });

    it('lễ rơi trúng ngày nghỉ theo lịch thì vẫn chỉ một dòng, ưu tiên nghi', async () => {
      // Cùng thứ tự ưu tiên với bảng công (dòng 2 thắng dòng 3): hôm đó vốn
      // đã nghỉ nên không có công nghỉ lễ nào để mà nói thêm.
      ngayLe.timTheoKhoang.mockResolvedValue([
        { ten: 'Tết', tuNgay: '2026-07-25', denNgay: '2026-07-26' },
      ]);

      const kq = await service.ngayNghiCuaToi(USER, '2026-07-20', '2026-07-26');

      expect(kq).toEqual([
        { ngay: '2026-07-25', loai: 'nghi' },
        { ngay: '2026-07-26', loai: 'nghi' },
      ]);
    });

    it('áp dụng cùng bộ chặn khoảng ngày với cuaToi', async () => {
      await expect(
        service.ngayNghiCuaToi(USER, undefined, '2026-07-27'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.ngayNghiCuaToi(USER, '21/07/2026', '2026-07-27'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.ngayNghiCuaToi(USER, '2026-07-27', '2026-07-21'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.ngayNghiCuaToi(USER, '2026-07-01', '2026-08-01'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('chặn chấm công ngoài bán kính', () => {
    const NV_KHONG_CO_CO: any = { ...NV, choPhepChamNgoaiVung: false };
    const NV_CO_CO: any = { ...NV, choPhepChamNgoaiVung: true };

    /** Toạ độ cách xa mọi địa điểm để rules trả ngoaiVung = true. */
    const XA = { latitude: 10.0, longitude: 106.0, doChinhXacMet: 5 };

    it('ngoài bán kính + không có cờ → 403 và KHÔNG ghi bản ghi nào', async () => {
      const diaDiem = {
        _id: 'l1', ten: 'VP', loai: 'gps',
        latitude: 21.0, longitude: 105.8, banKinh: 100, isActive: true,
      };
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV_KHONG_CO_CO);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.findOne.mockResolvedValue(null);
      locationRepo.find.mockResolvedValue([diaDiem]);

      // Tính khoảng cách kỳ vọng BẰNG chính công thức Haversine mà rules
      // dùng — độc lập với chuỗi thông báo của service — để không hardcode
      // một con số ma thuật. Đây chính là lý do guard chặn phải đứng SAU
      // tinhKetQua(): dời guard lên trước, hoặc bỏ luôn vế khoảng cách khỏi
      // message, thì assertion dưới đây thất bại.
      const khoangCachDuKien = Math.ceil(
        khoangCachMet(XA.latitude, XA.longitude, diaDiem.latitude, diaDiem.longitude),
      );

      await expect(
        service.checkIn(USER, { deviceId: 'd1', phuongThuc: 'gps', ...XA }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'NGOAI_BAN_KINH_CHO_PHEP',
          message: expect.stringContaining(`${khoangCachDuKien}m`),
        }),
      });

      // Chặn mà vẫn ghi thì bảng công có bản ghi ma, còn nhân viên thì tưởng
      // mình chưa chấm — tệ hơn cả không chặn.
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('checkOut ngoài bán kính + không có cờ → 403 và KHÔNG ghi bản ghi nào', async () => {
      // checkOut đi qua CÙNG cham() với checkIn nên cũng bị chặn — cố ý:
      // chấm ra từ xa lúc 18:00 trong khi thực tế đã rời khu vực từ 15:00
      // vẫn thổi phồng giờ công y hệt chấm vào hộ từ xa. Lượt vao phải đang
      // mở và còn hiệu lực (luotVaoConHieuLuc) thì checkOut mới đi được đến
      // đoạn đối chiếu vị trí — nếu không sẽ dừng sớm ở lỗi 409 thứ tự.
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV_KHONG_CO_CO);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.findOne.mockResolvedValue(null);
      recordRepo.find.mockResolvedValue([
        {
          _id: 'rec-vao',
          loai: 'vao',
          ngay: homNayVN(),
          thoiDiem: new Date(Date.now() - 3600_000).toISOString(),
        },
      ]);
      locationRepo.find.mockResolvedValue([
        { _id: 'l1', ten: 'VP', loai: 'gps', latitude: 21.0, longitude: 105.8, banKinh: 100, isActive: true },
      ]);

      await expect(
        service.checkOut(USER, { deviceId: 'd1', phuongThuc: 'gps', ...XA }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'NGOAI_BAN_KINH_CHO_PHEP',
          // Lối thoát của chấm RA phải khác chấm VÀO: nêu đúng ngày công
          // (của lượt vao đang mở, ở đây là hôm nay) để NV báo đúng ngày cho
          // HR nhập bù — mất mệnh đề này thì escape hatch coi như không tồn
          // tại dù code vẫn trả đúng.
          message: expect.stringContaining(homNayVN()),
        }),
      });

      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('ngoài bán kính + CÓ cờ → ghi bình thường, vẫn giữ ngoaiVung: true', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV_CO_CO);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.findOne.mockResolvedValue(null);
      recordRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      locationRepo.find.mockResolvedValue([
        { _id: 'l1', ten: 'VP', loai: 'gps', latitude: 21.0, longitude: 105.8, banKinh: 100, isActive: true },
      ]);

      const kq = await service.checkIn(USER, {
        deviceId: 'd1', phuongThuc: 'gps', ...XA,
      });

      // Cờ chỉ bỏ chặn, KHÔNG tẩy dấu vết — HR vẫn phải nhìn thấy.
      expect(kq.ngoaiVung).toBe(true);
    });

    it('trong bán kính → không bị ảnh hưởng dù không có cờ', async () => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV_KHONG_CO_CO);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.findOne.mockResolvedValue(null);
      recordRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      locationRepo.find.mockResolvedValue([
        { _id: 'l1', ten: 'VP', loai: 'gps', latitude: 21.0, longitude: 105.8, banKinh: 100, isActive: true },
      ]);

      const kq = await service.checkIn(USER, {
        deviceId: 'd1', phuongThuc: 'gps',
        latitude: 21.0, longitude: 105.8, doChinhXacMet: 5,
      });

      expect(kq.ngoaiVung).toBe(false);
    });

    /**
     * HR nhập bù không đối chiếu vị trí nên không gọi rules.tinhKetQua —
     * ngoaiVung được gán CỨNG là false trong hrNhap (không bao giờ true, xem
     * service). Nhưng lý do hrNhap không bị chặn không nằm ở giá trị cờ đó:
     * guard chặn ngoài bán kính chỉ nằm trong cham() (dùng chung cho
     * checkIn/checkOut), còn hrNhap là một luồng riêng, đơn giản không đi
     * qua guard đó. Chặn nó sẽ khoá mất chính công cụ dùng để sửa những ca
     * bị chặn oan.
     */
    it('hrNhap KHÔNG bị chặn', async () => {
      nhanVien.findOne.mockResolvedValue(NV_KHONG_CO_CO);
      recordRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      recordRepo.findOne.mockResolvedValue(null);

      // Dùng HÔM QUA chứ không phải hôm nay: hrNhap chặn thoiDiem ở tương
      // lai, và homNayVN() + '08:00' đứng trước 08:00 giờ VN thì rơi vào
      // tương lai — suite chạy lúc 03:00 VN sẽ khiến test này flake sang
      // BadRequestException dù không liên quan gì tới guard đang được test.
      await expect(
        service.hrNhap(
          { employeeId: 'emp-1', ngay: homQuaVN(), loai: 'vao', gio: '08:00' },
          'hr@cty.vn',
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('findAll', () => {
    it('lọc theo khoảng ngày và nhân viên', async () => {
      await service.findAll({
        tuNgay: '2026-07-01',
        denNgay: '2026-07-31',
        employeeId: 'emp-1',
        ngoaiVung: 'true',
      });

      const arg = recordRepo.find.mock.calls[0][0];
      expect(arg.where.employeeId).toBe('emp-1');
      expect(arg.where.ngoaiVung).toBe(true);
      expect(arg.where.ngay.$gte).toBe('2026-07-01');
      expect(arg.where.ngay.$lte).toBe('2026-07-31');
      // Không tự thêm tenantId — repository proxy lo việc đó.
      expect(arg.where.tenantId).toBeUndefined();
    });
  });
  /**
   * Ngày làm online (2026-08-14). Đơn `lam_online` đã duyệt mở khoá ĐÚNG
   * những ngày nó phủ — đứng cạnh `choPhepChamNgoaiVung` nhưng hẹp hơn hẳn:
   * cờ kia mở vĩnh viễn cho một người và do HR bật tay, cái này mở theo ngày
   * và đã qua một người duyệt.
   */
  describe('chấm công ngày làm online', () => {
    const NV_KHONG_CO_CO: any = { ...NV, choPhepChamNgoaiVung: false };
    const XA = { latitude: 10.0, longitude: 106.0, doChinhXacMet: 5 };
    const DIA_DIEM_GPS = {
      _id: 'l1',
      ten: 'VP',
      loai: 'gps',
      latitude: 21.0,
      longitude: 105.8,
      banKinh: 100,
      isActive: true,
    };

    function donOnline(ghiDe: Record<string, any> = {}) {
      return {
        employeeId: 'emp-1',
        loaiDon: 'lam_online',
        trangThai: 'da_duyet',
        isActive: true,
        ngay: homNayVN(),
        denNgay: homNayVN(),
        ...ghiDe,
      };
    }

    beforeEach(() => {
      nhanVien.resolveEmployeeFromUser.mockResolvedValue(NV_KHONG_CO_CO);
      shiftRepo.findOne.mockResolvedValue(CA);
      recordRepo.findOne.mockResolvedValue(null);
      recordRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      locationRepo.find.mockResolvedValue([DIA_DIEM_GPS]);
    });

    it('ngoài vùng + có đơn online đã duyệt → cho chấm, laOnline=true', async () => {
      requestRepo.find.mockResolvedValue([donOnline()]);

      const kq = await service.checkIn(USER, {
        deviceId: 'd1',
        phuongThuc: 'gps',
        ...XA,
      });

      expect(kq.laOnline).toBe(true);
      // Ngày online không có vùng nào để mà nằm ngoài. Giữ cờ ở đây là bắt
      // suy-ky-hieu đẻ cảnh báo NGOAI_VUNG cho mọi ngày online của mọi người.
      expect(kq.ngoaiVung).toBe(false);
      expect(kq.locationId).toBeUndefined();
      expect(kq.locationTen).toBeUndefined();
    });

    it('bỏ KIỂM vị trí nhưng vẫn GHI vị trí và thiết bị', async () => {
      requestRepo.find.mockResolvedValue([donOnline()]);

      const kq = await service.checkIn(USER, {
        deviceId: 'd1',
        phuongThuc: 'gps',
        ...XA,
      });

      expect(kq.latitude).toBe(XA.latitude);
      expect(kq.longitude).toBe(XA.longitude);
      expect(kq.deviceId).toBe('d1');
    });

    it('đơn online nhiều ngày phủ cả ngày hôm nay', async () => {
      requestRepo.find.mockResolvedValue([
        donOnline({ ngay: '2020-01-01', denNgay: '2099-12-31' }),
      ]);

      const kq = await service.checkIn(USER, {
        deviceId: 'd1',
        phuongThuc: 'gps',
        ...XA,
      });

      expect(kq.laOnline).toBe(true);
    });

    it('đơn còn CHỜ DUYỆT → vẫn bị chặn 403', async () => {
      requestRepo.find.mockResolvedValue([donOnline({ trangThai: 'cho_duyet' })]);

      await expect(
        service.checkIn(USER, { deviceId: 'd1', phuongThuc: 'gps', ...XA }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NGOAI_BAN_KINH_CHO_PHEP' }),
      });
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('đơn đã huỷ (isActive=false) → vẫn bị chặn 403', async () => {
      requestRepo.find.mockResolvedValue([donOnline({ isActive: false })]);

      await expect(
        service.checkIn(USER, { deviceId: 'd1', phuongThuc: 'gps', ...XA }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NGOAI_BAN_KINH_CHO_PHEP' }),
      });
    });

    it('đơn online của NGÀY KHÁC → vẫn bị chặn 403', async () => {
      requestRepo.find.mockResolvedValue([
        donOnline({ ngay: '2020-01-01', denNgay: '2020-01-02' }),
      ]);

      await expect(
        service.checkIn(USER, { deviceId: 'd1', phuongThuc: 'gps', ...XA }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NGOAI_BAN_KINH_CHO_PHEP' }),
      });
    });

    it('không có đơn nào → vẫn bị chặn 403 như cũ', async () => {
      requestRepo.find.mockResolvedValue([]);

      await expect(
        service.checkIn(USER, { deviceId: 'd1', phuongThuc: 'gps', ...XA }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NGOAI_BAN_KINH_CHO_PHEP' }),
      });
    });

    // Đơn online nới VỊ TRÍ, không nới GIỜ GIẤC.
    it('vẫn tính đi muộn như ngày ở văn phòng', async () => {
      requestRepo.find.mockResolvedValue([donOnline()]);
      const rules = (service as any).rules;
      jest.spyOn(rules, 'tinhKetQua').mockReturnValue({
        ngoaiVung: true,
        soPhutDiMuon: 15,
        soPhutVeSom: 0,
      });

      const kq = await service.checkIn(USER, {
        deviceId: 'd1',
        phuongThuc: 'gps',
        ...XA,
      });

      expect(kq.laOnline).toBe(true);
      expect(kq.soPhutDiMuon).toBe(15);
    });

    // Trong vùng thì không cần hỏi đơn — một truy vấn tiết kiệm được trên
    // MỌI lượt chấm công bình thường của toàn công ty.
    it('trong bán kính thì KHÔNG hỏi tới đơn online', async () => {
      requestRepo.find.mockResolvedValue([]);

      const kq = await service.checkIn(USER, {
        deviceId: 'd1',
        phuongThuc: 'gps',
        latitude: 21.0,
        longitude: 105.8,
        doChinhXacMet: 5,
      });

      expect(kq.laOnline).toBe(false);
      expect(requestRepo.find).not.toHaveBeenCalled();
    });
    it('homNay trả laOnline=true khi ngày công có đơn online đã duyệt', async () => {
      requestRepo.find.mockResolvedValue([donOnline()]);

      const kq: any = await service.homNay(USER);

      expect(kq.laOnline).toBe(true);
    });

    it('homNay trả laOnline=false khi không có đơn', async () => {
      requestRepo.find.mockResolvedValue([]);

      const kq: any = await service.homNay(USER);

      expect(kq.laOnline).toBe(false);
    });
  });
});
