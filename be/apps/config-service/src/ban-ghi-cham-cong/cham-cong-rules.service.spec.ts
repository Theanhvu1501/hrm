import { BadRequestException } from '@nestjs/common';
import {
  ChamCongRules_Service,
  TRAN_SAI_SO_GPS_MET,
  CaSnapshot,
} from './cham-cong-rules.service';

// VN = UTC+7. Dựng Date bằng UTC để test không phụ thuộc TZ máy chạy.
function gioVN(h: number, m: number, ngay = 22): Date {
  return new Date(Date.UTC(2026, 6, ngay, h - 7, m));
}

const CA_HANH_CHINH: CaSnapshot = {
  gioBatDau: '08:00',
  gioKetThuc: '17:00',
  laCaQuaDem: false,
  laLinhHoat: false,
};

const CA_DEM: CaSnapshot = {
  gioBatDau: '22:00',
  gioKetThuc: '06:00',
  laCaQuaDem: true,
  laLinhHoat: false,
};

const VAN_PHONG = {
  _id: 'loc-1',
  ten: 'Văn phòng Hà Nội',
  loai: 'gps',
  latitude: 21.0278,
  longitude: 105.8342,
  banKinh: 100,
  isActive: true,
};

/** Điểm cách VAN_PHONG khoảng 111m về phía bắc (0.001 độ vĩ ≈ 111m). */
const CACH_111M = { latitude: 21.0288, longitude: 105.8342 };

describe('ChamCongRules_Service', () => {
  let service: ChamCongRules_Service;

  beforeEach(() => {
    service = new ChamCongRules_Service();
  });

  // ────────────────────────────────────────────────────────────────────
  // Đi muộn
  // ────────────────────────────────────────────────────────────────────
  describe('đi muộn — ca hành chính 08:00–17:00', () => {
    it('vào đúng 08:00 → 0 phút muộn', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        maQr: 'khong-khop',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(0);
    });

    it('vào 08:01 → 1 phút muộn', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 1),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(1);
    });

    it('vào 08:30 → 30 phút muộn', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 30),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(30);
    });

    it('vào sớm 07:45 → 0 phút muộn, không âm', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(7, 45),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(0);
    });

    it('ca linh hoạt 15 phút: vào 08:10 → 0 phút muộn', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 10),
        loai: 'vao',
        ca: { ...CA_HANH_CHINH, laLinhHoat: true, soPhutLinhHoat: 15 },
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(0);
    });

    it('ca linh hoạt 15 phút: vào 08:20 → 5 phút muộn', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 20),
        loai: 'vao',
        ca: { ...CA_HANH_CHINH, laLinhHoat: true, soPhutLinhHoat: 15 },
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(5);
    });

    it('NV không gán ca → không đánh giá muộn', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(11, 0),
        loai: 'vao',
        ca: null,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(0);
      expect(kq.soPhutVeSom).toBe(0);
    });

    it('ngày nghỉ/lễ → không đánh giá muộn dù vào trễ', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(11, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: true,
      });
      expect(kq.soPhutDiMuon).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Về sớm
  // ────────────────────────────────────────────────────────────────────
  describe('về sớm', () => {
    it('ca hành chính: ra 16:30 → 30 phút về sớm', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(16, 30),
        loai: 'ra',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutVeSom).toBe(30);
    });

    it('ca hành chính: ra 17:30 → 0 phút về sớm', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(17, 30),
        loai: 'ra',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutVeSom).toBe(0);
    });

    it('ca đêm 22:00–06:00: ra 05:50 → 10 phút về sớm', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(5, 50, 23),
        loai: 'ra',
        ca: CA_DEM,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutVeSom).toBe(10);
    });

    it('ca đêm: ra 06:10 → 0 phút về sớm', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(6, 10, 23),
        loai: 'ra',
        ca: CA_DEM,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutVeSom).toBe(0);
    });

    it('ca đêm: bỏ về lúc 23:00 cùng tối → 420 phút (7 tiếng) về sớm, không phải 0', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(23, 0),
        loai: 'ra',
        ca: CA_DEM,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutVeSom).toBe(420);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Đối chiếu vị trí GPS
  // ────────────────────────────────────────────────────────────────────
  describe('đối chiếu GPS', () => {
    it('đứng ngay tâm → trong vùng', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: { latitude: 21.0278, longitude: 105.8342 },
        diaDiemList: [VAN_PHONG as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(false);
      expect(kq.locationTen).toBe('Văn phòng Hà Nội');
      expect(kq.khoangCachMet).toBe(0);
    });

    it('cách 111m, bán kính 100m, không khai sai số → ngoài vùng', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: CACH_111M,
        diaDiemList: [VAN_PHONG as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(true);
      expect(kq.khoangCachMet).toBeGreaterThan(100);
      expect(kq.khoangCachMet).toBeLessThan(120);
    });

    it('cách 111m, khai sai số 30m → trong vùng (100+30 ≥ 111)', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: { ...CACH_111M, doChinhXacMet: 30 },
        diaDiemList: [VAN_PHONG as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(false);
    });

    it('khai doChinhXacMet khổng lồ chỉ được cộng tối đa TRAN_SAI_SO_GPS_MET', () => {
      // Cách ~1.1km, bán kính 100m. Nếu không chặn trần thì sẽ lọt.
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: {
          latitude: 21.0378,
          longitude: 105.8342,
          doChinhXacMet: 99999,
        },
        diaDiemList: [VAN_PHONG as any],
        laNgayNghi: false,
      });
      expect(TRAN_SAI_SO_GPS_MET).toBe(50);
      expect(kq.ngoaiVung).toBe(true);
    });

    it('chọn địa điểm gần nhất khi có nhiều địa điểm', () => {
      const xa = { ...VAN_PHONG, _id: 'loc-2', ten: 'Chi nhánh xa', latitude: 21.1 };
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: { latitude: 21.0278, longitude: 105.8342 },
        diaDiemList: [xa as any, VAN_PHONG as any],
        laNgayNghi: false,
      });
      expect(kq.locationTen).toBe('Văn phòng Hà Nội');
    });

    it('địa điểm gps thiếu bán kính → báo lỗi rõ, KHÔNG im lặng cho qua', () => {
      const hong = { ...VAN_PHONG, banKinh: undefined };
      expect(() =>
        service.tinhKetQua({
          thoiDiem: gioVN(8, 0),
          loai: 'vao',
          ca: CA_HANH_CHINH,
          phuongThuc: 'gps',
          viTri: { latitude: 21.0278, longitude: 105.8342 },
          diaDiemList: [hong as any],
          laNgayNghi: false,
        }),
      ).toThrow(BadRequestException);
    });

    it('chấm gps mà không gửi toạ độ → báo lỗi', () => {
      expect(() =>
        service.tinhKetQua({
          thoiDiem: gioVN(8, 0),
          loai: 'vao',
          ca: CA_HANH_CHINH,
          phuongThuc: 'gps',
          diaDiemList: [VAN_PHONG as any],
          laNgayNghi: false,
        }),
      ).toThrow(BadRequestException);
    });

    it('không có địa điểm gps nào được cấu hình → ngoài vùng, không sập', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: { latitude: 21.0278, longitude: 105.8342 },
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(true);
      expect(kq.locationId).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Wifi & QR
  // ────────────────────────────────────────────────────────────────────
  describe('đối chiếu Wifi và QR', () => {
    const WIFI = {
      _id: 'loc-w',
      ten: 'Wifi văn phòng',
      loai: 'wifi',
      ipWifi: '113.161.20.5',
      isActive: true,
    };
    const QR = {
      _id: 'loc-q',
      ten: 'Cổng chính',
      loai: 'qr',
      maQr: 'MA-QR-CONG-CHINH',
      isActive: true,
    };

    it('IP khớp → trong vùng', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'wifi',
        ipAddress: '113.161.20.5',
        diaDiemList: [WIFI as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(false);
      expect(kq.locationTen).toBe('Wifi văn phòng');
    });

    it('IP không khớp → ngoài vùng', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'wifi',
        ipAddress: '1.2.3.4',
        diaDiemList: [WIFI as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(true);
    });

    it('mã QR khớp → trong vùng', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        maQr: 'MA-QR-CONG-CHINH',
        diaDiemList: [QR as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(false);
    });

    it('mã QR sai → ngoài vùng', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        maQr: 'MA-BIA-DAT',
        diaDiemList: [QR as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(true);
    });

    it('bỏ qua địa điểm đã tắt (isActive=false)', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        maQr: 'MA-QR-CONG-CHINH',
        diaDiemList: [{ ...QR, isActive: false } as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(true);
    });
  });
});
