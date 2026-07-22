import { BadRequestException } from '@nestjs/common';
import {
  ChamCongRules_Service,
  TRAN_SAI_SO_GPS_MET,
  CaSnapshot,
  khoangCachMet,
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

describe('khoangCachMet', () => {
  it('cùng một điểm → 0 mét', () => {
    expect(khoangCachMet(21.0278, 105.8342, 21.0278, 105.8342)).toBe(0);
  });

  it('lệch 0.001 độ vĩ ≈ 111m', () => {
    const d = khoangCachMet(21.0278, 105.8342, 21.0288, 105.8342);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it('đối xứng: đo xuôi hay ngược đều bằng nhau', () => {
    expect(khoangCachMet(21.0278, 105.8342, 21.0288, 105.8352)).toBe(
      khoangCachMet(21.0288, 105.8352, 21.0278, 105.8342),
    );
  });

  it('Hà Nội – TP.HCM ≈ 1.140 km (sai số dưới 3%)', () => {
    const d = khoangCachMet(21.0278, 105.8342, 10.8231, 106.6297);
    expect(d).toBeGreaterThan(1_110_000);
    expect(d).toBeLessThan(1_170_000);
  });

  it('vượt kinh tuyến gốc và xích đạo vẫn cho số dương hữu hạn', () => {
    const d = khoangCachMet(-1, -1, 1, 1);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(0);
  });
});

describe('ChamCongRules_Service', () => {
  let service: ChamCongRules_Service;
  // Địa điểm hỏng được ghi console.warn có chủ đích — nuốt để log test sạch,
  // đồng thời cho các test bên dưới kiểm tra nội dung cảnh báo.
  let canhBao: jest.SpyInstance;

  beforeEach(() => {
    service = new ChamCongRules_Service();
    canhBao = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    canhBao.mockRestore();
  });

  // ────────────────────────────────────────────────────────────────────
  // API công khai tinhMuonSom — đường HR nhập bù dùng chung công thức này
  // ────────────────────────────────────────────────────────────────────
  describe('tinhMuonSom (API công khai cho HR nhập bù)', () => {
    it('cho cùng kết quả với tinhKetQua khi cùng phút trong ngày', () => {
      const quaTinhKetQua = service.tinhKetQua({
        thoiDiem: gioVN(8, 25),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        maQr: 'x',
        diaDiemList: [],
        laNgayNghi: false,
      });
      const truTiep = service.tinhMuonSom({
        phutTrongNgay: 8 * 60 + 25,
        loai: 'vao',
        ca: CA_HANH_CHINH,
        laNgayNghi: false,
      });

      expect(truTiep.soPhutDiMuon).toBe(quaTinhKetQua.soPhutDiMuon);
      expect(truTiep.soPhutDiMuon).toBe(25);
    });

    it('ca qua đêm, vao lúc 00:45 → 165 phút muộn (không phải 0)', () => {
      expect(
        service.tinhMuonSom({
          phutTrongNgay: 45,
          loai: 'vao',
          ca: CA_DEM,
          laNgayNghi: false,
        }).soPhutDiMuon,
      ).toBe(165);
    });

    it('ca KHÔNG qua đêm, ra lúc 06:00 → 0 phút về sớm (làm thêm qua đêm)', () => {
      expect(
        service.tinhMuonSom({
          phutTrongNgay: 6 * 60,
          loai: 'ra',
          ca: CA_HANH_CHINH,
          laNgayNghi: false,
        }).soPhutVeSom,
      ).toBe(0);
    });

    it('không có ca hoặc ngày nghỉ → 0/0', () => {
      expect(
        service.tinhMuonSom({
          phutTrongNgay: 700,
          loai: 'vao',
          ca: null,
          laNgayNghi: false,
        }),
      ).toEqual({ soPhutDiMuon: 0, soPhutVeSom: 0 });
      expect(
        service.tinhMuonSom({
          phutTrongNgay: 700,
          loai: 'vao',
          ca: CA_HANH_CHINH,
          laNgayNghi: true,
        }),
      ).toEqual({ soPhutDiMuon: 0, soPhutVeSom: 0 });
    });
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

    // ── Critical 3: ca qua đêm, check-in sau nửa đêm ────────────────────
    it('ca đêm 22:00–06:00: vào 00:30 (sau nửa đêm) → 150 phút muộn, không phải 0', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(0, 30, 23),
        loai: 'vao',
        ca: CA_DEM,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(150);
    });

    it('ca đêm: vào 22:05 → 5 phút muộn', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(22, 5),
        loai: 'vao',
        ca: CA_DEM,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(5);
    });

    it('ca đêm: vào sớm 21:50 → 0 phút muộn', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(21, 50),
        loai: 'vao',
        ca: CA_DEM,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(0);
    });

    it('ca đêm: vào 05:30 (gần hết ca) → 450 phút muộn', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(5, 30, 23),
        loai: 'vao',
        ca: CA_DEM,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutDiMuon).toBe(450);
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

    // ── Critical 2: ca KHÔNG qua đêm, bấm ra sau nửa đêm ────────────────
    it('ca hành chính: làm thêm rồi ra 01:00 sáng hôm sau → 0 phút về sớm, không phải 960', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(1, 0, 23),
        loai: 'ra',
        ca: CA_HANH_CHINH,
        phuongThuc: 'qr',
        diaDiemList: [],
        laNgayNghi: false,
      });
      expect(kq.soPhutVeSom).toBe(0);
    });

    it('ca hành chính: ra 23:30 cùng ngày → 0 phút về sớm', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(23, 30),
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

    // Đảo cả hai thứ tự: một cài đặt sai kiểu "luôn lấy phần tử cuối" hay
    // "luôn lấy phần tử đầu" đều phải trượt ít nhất một trong hai ca này.
    it('chọn địa điểm gần nhất khi có nhiều địa điểm — [xa, gần]', () => {
      const xa = {
        ...VAN_PHONG,
        _id: 'loc-2',
        ten: 'Chi nhánh xa',
        latitude: 21.1,
      };
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

    it('chọn địa điểm gần nhất khi có nhiều địa điểm — [gần, xa]', () => {
      const xa = {
        ...VAN_PHONG,
        _id: 'loc-2',
        ten: 'Chi nhánh xa',
        latitude: 21.1,
      };
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: { latitude: 21.0278, longitude: 105.8342 },
        diaDiemList: [VAN_PHONG as any, xa as any],
        laNgayNghi: false,
      });
      expect(kq.locationTen).toBe('Văn phòng Hà Nội');
      expect(kq.locationId).toBe('loc-1');
    });

    // Ca phân biệt thật cho trần sai số: nếu cài đặt BỎ QUA hẳn
    // doChinhXacMet thì 120m > 100m sẽ ra ngoài vùng và test này đỏ.
    it('cách ~120m, khai sai số 99999 → trong vùng vì được cộng trần 50m (100+50=150)', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: {
          latitude: 21.0278 + 0.00108,
          longitude: 105.8342,
          doChinhXacMet: 99999,
        },
        diaDiemList: [VAN_PHONG as any],
        laNgayNghi: false,
      });
      expect(kq.khoangCachMet).toBeGreaterThan(115);
      expect(kq.khoangCachMet).toBeLessThan(125);
      expect(kq.ngoaiVung).toBe(false);
    });

    it('khoảng cách đúng bằng bán kính → vẫn trong vùng (biên tính cả mốc)', () => {
      const kcDung = khoangCachMet(21.0278, 105.8342, 21.0288, 105.8342);
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: { latitude: 21.0288, longitude: 105.8342 },
        diaDiemList: [{ ...VAN_PHONG, banKinh: kcDung } as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(false);
    });

    it('doChinhXacMet âm không được làm HẸP vùng: đứng đúng tâm vẫn trong vùng', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: {
          latitude: 21.0278,
          longitude: 105.8342,
          doChinhXacMet: -100000,
        },
        diaDiemList: [VAN_PHONG as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(false);
    });

    it('doChinhXacMet không phải số hữu hạn → coi như 0, không sinh NaN', () => {
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: {
          latitude: 21.0278,
          longitude: 105.8342,
          doChinhXacMet: NaN,
        },
        diaDiemList: [VAN_PHONG as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(false);
      expect(Number.isNaN(kq.khoangCachMet as number)).toBe(false);
    });

    it('khoảng cách hiển thị không được mâu thuẫn với kết luận ngoài vùng', () => {
      // Đứng cách tâm đúng d mét, bán kính d - 0.05 → ngoài vùng.
      // Math.round(d) sẽ trả đúng bằng bán kính làm tròn → HR đọc báo cáo
      // thấy "cách 100m, bán kính 100m" mà lại bị đánh ngoài vùng.
      const d = khoangCachMet(21.0278, 105.8342, 21.0278 + 0.0009, 105.8342);
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: { latitude: 21.0278 + 0.0009, longitude: 105.8342 },
        diaDiemList: [{ ...VAN_PHONG, banKinh: d - 0.05 } as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(true);
      expect(kq.khoangCachMet as number).toBeGreaterThan(d - 0.05);
    });

    it('hai địa điểm cách đều nhau → luôn chọn cùng một địa điểm, không phụ thuộc thứ tự mảng', () => {
      // Cùng toạ độ (hai bản ghi cho cùng một toà nhà) → khoảng cách bằng
      // nhau tuyệt đối, kết quả không được phụ thuộc thứ tự Mongo trả về.
      const bac = { ...VAN_PHONG, _id: 'loc-bac', ten: 'Cổng Bắc' };
      const nam = { ...VAN_PHONG, _id: 'loc-nam', ten: 'Cổng Nam' };
      const gọi = (ds: any[]) =>
        service.tinhKetQua({
          thoiDiem: gioVN(8, 0),
          loai: 'vao',
          ca: CA_HANH_CHINH,
          phuongThuc: 'gps',
          viTri: { latitude: 21.0278, longitude: 105.8342 },
          diaDiemList: ds,
          laNgayNghi: false,
        });
      expect(gọi([bac, nam]).locationId).toBe(gọi([nam, bac]).locationId);
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

    it('thông báo địa điểm hỏng nêu cả id lẫn tên để HR biết sửa bản ghi nào', () => {
      const hong = { ...VAN_PHONG, _id: 'loc-hong', banKinh: undefined };
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
      ).toThrow(/loc-hong/);
    });

    // ── Important 2: một địa điểm hỏng không được chặn cả công ty ────────
    it('một địa điểm hỏng KHÔNG chặn chấm công ở địa điểm hợp lệ khác', () => {
      const khoCaMau = {
        _id: 'loc-cm',
        ten: 'Kho Cà Mau',
        loai: 'gps',
        latitude: 9.1769,
        longitude: 105.1524,
        banKinh: undefined,
        isActive: true,
      };
      const kq = service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: { latitude: 21.0278, longitude: 105.8342 },
        diaDiemList: [VAN_PHONG as any, khoCaMau as any],
        laNgayNghi: false,
      });
      expect(kq.ngoaiVung).toBe(false);
      expect(kq.locationTen).toBe('Văn phòng Hà Nội');
    });

    it('địa điểm hỏng bị bỏ qua được ghi cảnh báo kèm cả id lẫn tên', () => {
      const khoCaMau = {
        _id: 'loc-cm',
        ten: 'Kho Cà Mau',
        loai: 'gps',
        latitude: 9.1769,
        longitude: 105.1524,
        isActive: true,
      };
      service.tinhKetQua({
        thoiDiem: gioVN(8, 0),
        loai: 'vao',
        ca: CA_HANH_CHINH,
        phuongThuc: 'gps',
        viTri: { latitude: 21.0278, longitude: 105.8342 },
        diaDiemList: [VAN_PHONG as any, khoCaMau as any],
        laNgayNghi: false,
      });
      expect(canhBao).toHaveBeenCalledTimes(1);
      const noiDung = String(canhBao.mock.calls[0][0]);
      expect(noiDung).toContain('loc-cm');
      expect(noiDung).toContain('Kho Cà Mau');
    });

    it('khi TẤT CẢ địa điểm gps đều hỏng → mới báo lỗi để HR đi sửa', () => {
      const hong1 = { ...VAN_PHONG, _id: 'loc-h1', banKinh: undefined };
      const hong2 = { ...VAN_PHONG, _id: 'loc-h2', ten: 'Kho', latitude: null };
      expect(() =>
        service.tinhKetQua({
          thoiDiem: gioVN(8, 0),
          loai: 'vao',
          ca: CA_HANH_CHINH,
          phuongThuc: 'gps',
          viTri: { latitude: 21.0278, longitude: 105.8342 },
          diaDiemList: [hong1 as any, hong2 as any],
          laNgayNghi: false,
        }),
      ).toThrow(/loc-h1.*loc-h2/);
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

    // ── Critical 1: viTri tồn tại nhưng thiếu trường số ─────────────────
    // `if (!input.viTri)` chỉ chặn null/undefined. Với viTri = {} thì
    // khoangCachMet(undefined, …) ra NaN, `NaN > banKinh` là false → coi
    // như trong vùng. Ngồi nhà cũng chấm được.
    it.each<[any, string]>([
      [{}, 'thiếu cả latitude lẫn longitude'],
      [{ latitude: 21.0278 }, 'thiếu longitude'],
      [{ longitude: 105.8342 }, 'thiếu latitude'],
      [{ latitude: null, longitude: null }, 'toạ độ null'],
      [{ latitude: '21.0278', longitude: '105.8342' }, 'toạ độ là chuỗi'],
      [{ latitude: NaN, longitude: 105.8342 }, 'latitude là NaN'],
      [{ latitude: Infinity, longitude: 105.8342 }, 'latitude vô cực'],
    ])('viTri %s (%s) → báo lỗi, KHÔNG coi là trong vùng', (viTri) => {
      expect(() =>
        service.tinhKetQua({
          thoiDiem: gioVN(8, 0),
          loai: 'vao',
          ca: CA_HANH_CHINH,
          phuongThuc: 'gps',
          viTri: viTri,
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
