import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { BanGhiChamCong_Service } from './ban-ghi-cham-cong.service';
import { ChamCongRules_Service } from './cham-cong-rules.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { ThietBiChamCong_Service } from '../thiet-bi-cham-cong/thiet-bi-cham-cong.service';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import {
  AttendanceRecord,
  WorkShift,
  AttendanceLocation,
} from '@app/entities';

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

/** Ngày hôm nay theo giờ VN — không phụ thuộc TZ của tiến trình test. */
const homNayVN = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

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
      recordRepo.find.mockResolvedValue([
        {
          loai: 'vao',
          ngay: '2026-07-15',
          thoiDiem: '2026-07-15T15:00:00.000Z', // 22:00 giờ VN ngày 15
        },
      ]);

      const rec = await service.checkOut(USER, DTO);

      expect(rec.loai).toBe('ra');
      expect(rec.ngay).toBe('2026-07-15');
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
      ngayLe.timTheoNgay.mockResolvedValue({ ten: 'Quốc khánh', loai: 'le' });

      const rec = await service.hrNhap(
        { employeeId: 'emp-1', ngay: '2026-09-02', loai: 'vao', gio: '10:00' },
        'HR Lan',
      );

      expect(rec.laNgayNghi).toBe(true);
      expect(rec.soPhutDiMuon).toBe(0);
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
