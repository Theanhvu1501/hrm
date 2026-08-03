import { describe, it, expect } from '@jest/globals';
import {
  chiaGioOtTheoLoai,
  gopPhanBoOt,
  suyLoaiNgay,
  tinhSoGioOt,
  tinhSoNgayNghi,
  traHeSo,
  HE_SO_OT_MAC_DINH,
} from './luat-don';

const T2_DEN_T6 = [1, 2, 3, 4, 5];

describe('suyLoaiNgay', () => {
  it('ngày làm việc bình thường → ngay_thuong', () => {
    expect(suyLoaiNgay({ ngay: '2026-07-22', laNgayLe: false, ngayLamViecTrongTuan: T2_DEN_T6 }))
      .toBe('ngay_thuong');
  });

  it('ngày không thuộc lịch làm việc → ngay_nghi', () => {
    // 2026-07-26 là Chủ nhật.
    expect(suyLoaiNgay({ ngay: '2026-07-26', laNgayLe: false, ngayLamViecTrongTuan: T2_DEN_T6 }))
      .toBe('ngay_nghi');
  });

  it('ngày lễ → ngay_le', () => {
    expect(suyLoaiNgay({ ngay: '2026-09-02', laNgayLe: true, ngayLamViecTrongTuan: T2_DEN_T6 }))
      .toBe('ngay_le');
  });

  /**
   * Thứ tự ưu tiên là thứ dễ làm sai nhất: lễ rơi vào Chủ nhật phải tính LỄ.
   * Kiểm ngày nghỉ trước sẽ trả ngay_nghi và công ty trả thiếu tiền cho người
   * đi làm đúng ngày đáng được trả cao nhất.
   */
  it('lễ rơi vào Chủ nhật → tính LỄ, không phải ngày nghỉ', () => {
    expect(suyLoaiNgay({ ngay: '2026-07-26', laNgayLe: true, ngayLamViecTrongTuan: T2_DEN_T6 }))
      .toBe('ngay_le');
  });

  /**
   * Chưa cấu hình lịch làm việc KHÔNG có nghĩa là nghỉ tất cả các ngày — cùng
   * quy ước đã ghi ở màn hồ sơ nhân viên. Hiểu ngược lại thì mọi đơn OT của
   * người chưa được gán lịch đều thành ngày nghỉ.
   */
  it('chưa cấu hình lịch làm việc → coi là ngày thường', () => {
    expect(suyLoaiNgay({ ngay: '2026-07-26', laNgayLe: false })).toBe('ngay_thuong');
    expect(suyLoaiNgay({ ngay: '2026-07-26', laNgayLe: false, ngayLamViecTrongTuan: [] }))
      .toBe('ngay_thuong');
  });

  it('HE_SO_OT_MAC_DINH là nguồn sự thật duy nhất của bốn con số SEED', () => {
    expect(HE_SO_OT_MAC_DINH).toEqual({
      ngay_thuong: 1.5,
      ngay_nghi: 2.0,
      ngay_le: 3.0,
      ngay_dem: 1.5,
    });
  });
});

describe('traHeSo', () => {
  const bang = { ngay_thuong: 1.5, ngay_nghi: 2.0, ngay_le: 3.0, ngay_dem: 1.5 };

  it('tra đúng hệ số của loại có trong bảng', () => {
    expect(traHeSo(bang, 'ngay_le')).toBe(3.0);
    expect(traHeSo(bang, 'ngay_dem')).toBe(1.5);
  });

  it('loại lạ rơi về ngày thường — hệ số THẤP nhất, không tự tặng tiền', () => {
    expect(traHeSo(bang, 'ngay_gi_do_moi')).toBe(1.5);
  });

  it('bảng rỗng rơi về 1.0 chứ không NaN', () => {
    // NaN đi qua lamTronGio()/lamTronTheo() vẫn là NaN rồi nằm im trong DB.
    expect(traHeSo({}, 'ngay_le')).toBe(1);
    expect(traHeSo(undefined as any, 'ngay_le')).toBe(1);
  });
});

describe('tinhSoGioOt', () => {
  it('trong ngày', () => {
    expect(tinhSoGioOt('18:00', '20:30')).toBe(2.5);
  });

  /** Ca OT đêm là chuyện thường — trừ thẳng sẽ ra số âm. */
  it('qua nửa đêm → cộng 24h, không ra số âm', () => {
    expect(tinhSoGioOt('22:00', '02:00')).toBe(4);
  });

  it('bằng nhau → 0', () => {
    expect(tinhSoGioOt('18:00', '18:00')).toBe(0);
  });
});

describe('tinhSoNgayNghi', () => {
  it('một ngày làm việc → 1', () => {
    expect(tinhSoNgayNghi({
      tuNgay: '2026-07-22', denNgay: '2026-07-22',
      ngayLeTrongKhoang: [], ngayLamViecTrongTuan: T2_DEN_T6,
    })).toBe(1);
  });

  it('nửa buổi → 0.5', () => {
    expect(tinhSoNgayNghi({
      tuNgay: '2026-07-22', denNgay: '2026-07-22', buoi: 'sang',
      ngayLeTrongKhoang: [], ngayLamViecTrongTuan: T2_DEN_T6,
    })).toBe(0.5);
  });

  /** Nghỉ T6→T3 vắt qua T7+CN: chỉ tính 3 ngày làm việc. */
  it('khoảng vắt cuối tuần → không đếm ngày nghỉ tuần', () => {
    expect(tinhSoNgayNghi({
      tuNgay: '2026-07-24', denNgay: '2026-07-28', // T6,T7,CN,T2,T3
      ngayLeTrongKhoang: [], ngayLamViecTrongTuan: T2_DEN_T6,
    })).toBe(3);
  });

  it('khoảng vắt ngày lễ → không đếm ngày lễ', () => {
    expect(tinhSoNgayNghi({
      tuNgay: '2026-07-22', denNgay: '2026-07-24', // T4,T5,T6
      ngayLeTrongKhoang: ['2026-07-23'],
      ngayLamViecTrongTuan: T2_DEN_T6,
    })).toBe(2);
  });

  /** `buoi` chỉ có nghĩa khi đơn đúng MỘT ngày — bỏ qua ở đơn nhiều ngày. */
  it('buoi bị bỏ qua khi khoảng nhiều hơn một ngày', () => {
    expect(tinhSoNgayNghi({
      tuNgay: '2026-07-22', denNgay: '2026-07-23', buoi: 'sang',
      ngayLeTrongKhoang: [], ngayLamViecTrongTuan: T2_DEN_T6,
    })).toBe(2);
  });
});

describe('chiaGioOtTheoLoai', () => {
  const heSoTra = { ngay_thuong: 1.5, ngay_nghi: 2.0, ngay_le: 3.0, ngay_dem: 1.5 };
  const heSoTichQuy = { ngay_thuong: 1.5, ngay_nghi: 2.0, ngay_le: 3.0, ngay_dem: 1.5 };
  const khungGioDem = { tu: '22:00', den: '06:00' };
  const uuTienLoai = ['ngay_le', 'ngay_nghi', 'ngay_dem', 'ngay_thuong'];
  const nen = { khungGioDem, uuTienLoai, heSoTra, heSoTichQuy };

  it('ca hoàn toàn ban ngày = một phần, đúng loại ngày', () => {
    expect(chiaGioOtTheoLoai({ ...nen, gioTu: '14:00', gioDen: '18:00', loaiNgay: 'ngay_thuong' }))
      .toEqual([{ loaiNgayOt: 'ngay_thuong', soGio: 4, heSoTra: 1.5, heSoTichQuy: 1.5 }]);
  });

  it('ca vắt nửa đêm chẻ làm hai — 20:00→02:00 ngày thường', () => {
    expect(chiaGioOtTheoLoai({ ...nen, gioTu: '20:00', gioDen: '02:00', loaiNgay: 'ngay_thuong' }))
      .toEqual([
        { loaiNgayOt: 'ngay_thuong', soGio: 2, heSoTra: 1.5, heSoTichQuy: 1.5 },
        { loaiNgayOt: 'ngay_dem', soGio: 4, heSoTra: 1.5, heSoTichQuy: 1.5 },
      ]);
  });

  it('22:00→02:00 nằm TRỌN trong khung đêm — phải cắt theo mốc tuyệt đối', () => {
    // Nếu so chuỗi "HH:mm" thì '02:00' < '22:00' và ra 0 giờ đêm.
    expect(chiaGioOtTheoLoai({ ...nen, gioTu: '22:00', gioDen: '02:00', loaiNgay: 'ngay_thuong' }))
      .toEqual([{ loaiNgayOt: 'ngay_dem', soGio: 4, heSoTra: 1.5, heSoTichQuy: 1.5 }]);
  });

  it('ca chạm rìa SÁNG của khung đêm — 05:00→09:00', () => {
    expect(chiaGioOtTheoLoai({ ...nen, gioTu: '05:00', gioDen: '09:00', loaiNgay: 'ngay_thuong' }))
      .toEqual([
        { loaiNgayOt: 'ngay_dem', soGio: 1, heSoTra: 1.5, heSoTichQuy: 1.5 },
        { loaiNgayOt: 'ngay_thuong', soGio: 3, heSoTra: 1.5, heSoTichQuy: 1.5 },
      ]);
  });

  it('ngày lễ thắng ca đêm — gộp lại thành MỘT phần ngay_le', () => {
    expect(chiaGioOtTheoLoai({ ...nen, gioTu: '20:00', gioDen: '02:00', loaiNgay: 'ngay_le' }))
      .toEqual([{ loaiNgayOt: 'ngay_le', soGio: 6, heSoTra: 3.0, heSoTichQuy: 3.0 }]);
  });

  it('uuTienLoai đảo lại thì ca đêm thắng ngày lễ — không hardcode thứ tự', () => {
    const uuTienDem = ['ngay_dem', 'ngay_le', 'ngay_nghi', 'ngay_thuong'];
    expect(
      chiaGioOtTheoLoai({
        ...nen, uuTienLoai: uuTienDem, gioTu: '23:00', gioDen: '01:00', loaiNgay: 'ngay_le',
      }),
    ).toEqual([{ loaiNgayOt: 'ngay_dem', soGio: 2, heSoTra: 1.5, heSoTichQuy: 1.5 }]);
  });

  it('khungGioDem null = công ty không có ca đêm', () => {
    expect(
      chiaGioOtTheoLoai({
        ...nen, khungGioDem: null, gioTu: '22:00', gioDen: '02:00', loaiNgay: 'ngay_thuong',
      }),
    ).toEqual([{ loaiNgayOt: 'ngay_thuong', soGio: 4, heSoTra: 1.5, heSoTichQuy: 1.5 }]);
  });

  it('BẤT BIẾN: tổng giờ sau khi chẻ bằng ĐÚNG tinhSoGioOt(), không sai số', () => {
    const cases: Array<[string, string]> = [
      ['20:00', '02:00'], ['22:00', '06:00'], ['05:00', '09:00'],
      ['21:40', '02:20'], ['23:59', '00:01'], ['08:00', '17:30'],
      ['06:00', '22:00'], ['00:00', '23:59'], ['18:00', '06:00'],
    ];
    for (const [gioTu, gioDen] of cases) {
      for (const loaiNgay of ['ngay_thuong', 'ngay_nghi', 'ngay_le']) {
        const phan = chiaGioOtTheoLoai({ ...nen, gioTu, gioDen, loaiNgay });
        const tong = phan.reduce((s, p) => s + p.soGio, 0);
        expect(tong).toBe(tinhSoGioOt(gioTu, gioDen));
      }
    }
  });

  it('KHÔNG làm tròn soGio — 2h20 phải giữ nguyên phân số', () => {
    // Làm tròn ở đây rồi mới nhân hệ số sẽ biến 2h20' × 3.0 = 7.00 thành
    // 2.33 × 3 = 6.99 (xem docblock SO_LE_GIO ở luat-quy-gio.ts).
    const phan = chiaGioOtTheoLoai({
      ...nen, gioTu: '14:00', gioDen: '16:20', loaiNgay: 'ngay_le',
    });
    expect(phan[0].soGio).toBe(2 + 20 / 60);
  });

  it('ca 0 giờ trả mảng rỗng', () => {
    expect(chiaGioOtTheoLoai({ ...nen, gioTu: '09:00', gioDen: '09:00', loaiNgay: 'ngay_thuong' }))
      .toEqual([]);
  });
});

describe('gopPhanBoOt', () => {
  it('soGioOt là tổng, loại/hệ số lấy phần chiếm NHIỀU giờ nhất', () => {
    expect(gopPhanBoOt([
      { loaiNgayOt: 'ngay_thuong', soGio: 2, heSoTra: 1.5, heSoTichQuy: 1.5 },
      { loaiNgayOt: 'ngay_dem', soGio: 4, heSoTra: 1.5, heSoTichQuy: 1.5 },
    ])).toEqual({ soGioOt: 6, loaiNgayOt: 'ngay_dem', heSoOt: 1.5 });
  });

  it('hoà giờ thì lấy phần ĐẦU — thứ tự đã theo thời gian từ chiaGioOtTheoLoai', () => {
    expect(gopPhanBoOt([
      { loaiNgayOt: 'ngay_le', soGio: 3, heSoTra: 3.0, heSoTichQuy: 3.0 },
      { loaiNgayOt: 'ngay_dem', soGio: 3, heSoTra: 1.5, heSoTichQuy: 1.5 },
    ])).toEqual({ soGioOt: 6, loaiNgayOt: 'ngay_le', heSoOt: 3.0 });
  });

  it('mảng rỗng trả 0 / ngay_thuong / 1', () => {
    expect(gopPhanBoOt([])).toEqual({ soGioOt: 0, loaiNgayOt: 'ngay_thuong', heSoOt: 1 });
  });
});
