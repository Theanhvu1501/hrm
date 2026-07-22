import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { BanGhiChamCong_Service } from './ban-ghi-cham-cong.service';
import { ChamCongRules_Service } from './cham-cong-rules.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { ThietBiChamCong_Service } from '../thiet-bi-cham-cong/thiet-bi-cham-cong.service';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import { AttendanceRecord, WorkShift, AttendanceLocation } from '@app/entities';

const USER = { id: 'sso-1', email: 'hai@cty.vn' };

const NV: any = {
  _id: 'emp-1',
  hoTen: 'Nguyễn Văn Hải',
  employeeId: 'NV0001',
  workShiftId: '507f1f77bcf86cd799439011',
  ngayLamViecTrongTuan: [1, 2, 3, 4, 5],
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

  beforeEach(async () => {
    recordRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((v: any) => v),
      save: jest.fn((v: any) =>
        Promise.resolve({ ...v, _id: v._id ?? 'rec-new' }),
      ),
    };
    shiftRepo = { findOne: jest.fn().mockResolvedValue(CA) };
    locationRepo = { find: jest.fn().mockResolvedValue([]) };
    nhanVien = {
      resolveEmployeeFromUser: jest.fn().mockResolvedValue(NV),
      findOne: jest.fn().mockResolvedValue(NV),
    };
    thietBi = { kiemTraThietBi: jest.fn().mockResolvedValue(undefined) };
    ngayLe = { timTheoNgay: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BanGhiChamCong_Service,
        ChamCongRules_Service,
        { provide: getRepositoryToken(AttendanceRecord), useValue: recordRepo },
        { provide: getRepositoryToken(WorkShift), useValue: shiftRepo },
        {
          provide: getRepositoryToken(AttendanceLocation),
          useValue: locationRepo,
        },
        { provide: NhanVien_Service, useValue: nhanVien },
        { provide: ThietBiChamCong_Service, useValue: thietBi },
        { provide: NgayLe_Service, useValue: ngayLe },
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
      nhanVien.resolveEmployeeFromUser.mockResolvedValue({
        ...NV,
        ngayLamViecTrongTuan: [] as number[],
      });

      const rec = await service.checkIn(USER, DTO);
      expect(rec.laNgayNghi).toBe(false);
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
      // Lượt vao tối HÔM QUA (ca 22:00–06:00) vẫn còn hiệu lực sáng nay.
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: homQuaVN(),
          thoiDiem: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
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

    it('bản ghi ra cũ quá 60 giây → 409, không tạo dòng ra thứ hai', async () => {
      recordRepo.find.mockResolvedValue([
        {
          _id: 'rec-9',
          loai: 'ra',
          ngay: '2026-07-15',
          thoiDiem: new Date(Date.now() - 5 * 60_000).toISOString(),
        },
      ]);

      await expect(service.checkOut(USER, DTO)).rejects.toThrow(
        ConflictException,
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

    it('hanhDongKeTiep là ra khi lượt vao mở từ hôm qua vẫn còn hiệu lực', async () => {
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: homQuaVN(),
          thoiDiem: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        },
      ]);

      const kq = await service.homNay(USER);
      expect(kq.hanhDongKeTiep).toBe('ra');
    });

    it('hanhDongKeTiep là vao khi lượt vao mở đã quá hạn — không dẫn NV vào cái bẫy check-out', async () => {
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: '2026-07-20',
          thoiDiem: '2026-07-20T01:00:00.000Z',
        },
      ]);

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
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: '2026-07-20',
          thoiDiem: '2026-07-20T01:00:00.000Z',
        },
      ]);

      const kq = await service.homNay(USER);

      expect(kq.hanhDongKeTiep).toBe('vao');
      expect(kq.ngayCong).toBe(homNayVN());
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
});
