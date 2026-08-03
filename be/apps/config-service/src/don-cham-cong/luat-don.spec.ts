import { describe, it, expect } from '@jest/globals';
import {
  suyHeSoOt,
  tinhSoGioOt,
  tinhSoNgayNghi,
  traHeSo,
  HE_SO_OT_MAC_DINH,
} from './luat-don';

const T2_DEN_T6 = [1, 2, 3, 4, 5];

describe('suyHeSoOt', () => {
  it('ngày làm việc bình thường → 1.5', () => {
    expect(suyHeSoOt({ ngay: '2026-07-22', laNgayLe: false, ngayLamViecTrongTuan: T2_DEN_T6 }))
      .toEqual({ loaiNgayOt: 'ngay_thuong', heSoOt: 1.5 });
  });

  it('ngày không thuộc lịch làm việc → 2.0', () => {
    // 2026-07-26 là Chủ nhật.
    expect(suyHeSoOt({ ngay: '2026-07-26', laNgayLe: false, ngayLamViecTrongTuan: T2_DEN_T6 }))
      .toEqual({ loaiNgayOt: 'ngay_nghi', heSoOt: 2.0 });
  });

  it('ngày lễ → 3.0', () => {
    expect(suyHeSoOt({ ngay: '2026-09-02', laNgayLe: true, ngayLamViecTrongTuan: T2_DEN_T6 }))
      .toEqual({ loaiNgayOt: 'ngay_le', heSoOt: 3.0 });
  });

  /**
   * Thứ tự ưu tiên là thứ dễ làm sai nhất: lễ rơi vào Chủ nhật phải tính LỄ.
   * Kiểm ngày nghỉ trước sẽ trả 2.0 và công ty trả thiếu tiền cho người đi làm
   * đúng ngày đáng được trả cao nhất.
   */
  it('lễ rơi vào Chủ nhật → tính LỄ, không phải ngày nghỉ', () => {
    expect(suyHeSoOt({ ngay: '2026-07-26', laNgayLe: true, ngayLamViecTrongTuan: T2_DEN_T6 }))
      .toEqual({ loaiNgayOt: 'ngay_le', heSoOt: 3.0 });
  });

  /**
   * Chưa cấu hình lịch làm việc KHÔNG có nghĩa là nghỉ tất cả các ngày — cùng
   * quy ước đã ghi ở màn hồ sơ nhân viên. Hiểu ngược lại thì mọi đơn OT của
   * người chưa được gán lịch đều thành hệ số 2.0.
   */
  it('chưa cấu hình lịch làm việc → coi là ngày thường', () => {
    expect(suyHeSoOt({ ngay: '2026-07-26', laNgayLe: false }))
      .toEqual({ loaiNgayOt: 'ngay_thuong', heSoOt: 1.5 });
    expect(suyHeSoOt({ ngay: '2026-07-26', laNgayLe: false, ngayLamViecTrongTuan: [] }))
      .toEqual({ loaiNgayOt: 'ngay_thuong', heSoOt: 1.5 });
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
