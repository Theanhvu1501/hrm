import { describe, expect, it } from 'vitest';
import { chuaCoNguon, coSoLieu } from './baoCao.types';
import { DANH_SACH_KY, KY_MAC_DINH, layBaoCao } from './duLieuMau';

const baoCao = layBaoCao(KY_MAC_DINH);
const moiChiSo = baoCao.nhom.flatMap((n) => n.chiSo);

describe('khung báo cáo', () => {
  it('giữ đúng 4 nhóm, đánh số 1..4 theo thứ tự bảng gốc của khách hàng', () => {
    expect(baoCao.nhom.map((n) => n.soThuTu)).toStrictEqual([1, 2, 3, 4]);
  });

  it('giữ đủ 16 chỉ số, không cắt bớt ô nào', () => {
    expect(moiChiSo).toHaveLength(16);
  });

  it('có đúng 9 chỉ số tính được và 7 chỉ số chưa có nguồn', () => {
    expect(baoCao.soChiSoCoSoLieu).toBe(9);
    expect(baoCao.soChiSoChuaCoNguon).toBe(7);
    expect(baoCao.soChiSoCoSoLieu + baoCao.soChiSoChuaCoNguon).toBe(moiChiSo.length);
  });

  it('mọi mã chỉ số là duy nhất (dùng làm React key)', () => {
    const ma = moiChiSo.map((c) => c.ma);
    expect(new Set(ma).size).toBe(ma.length);
  });
});

describe('không bịa số cho ô chưa có nguồn', () => {
  it('chỉ số chưa có nguồn đều nói rõ cần gì mới có', () => {
    const thieu = moiChiSo.map((c) => c.nguon).filter(chuaCoNguon);
    expect(thieu.length).toBeGreaterThan(0);
    for (const nguon of thieu) {
      expect(nguon.canGi.trim()).not.toBe('');
    }
  });

  it('đúng 7 chỉ số chờ module là những chỉ số đã khảo sát trong spec', () => {
    expect(moiChiSo.filter((c) => chuaCoNguon(c.nguon)).map((c) => c.ma)).toStrictEqual([
      'time-to-fill',
      'cost-per-hire',
      'offer-acceptance',
      'key-talent-retention',
      'vi-pham-ky-luat',
      'gio-dao-tao',
      'chi-phi-dao-tao',
    ]);
  });

  it('chỉ số có số đều ghi nguồn dữ liệu thật', () => {
    for (const nguon of moiChiSo.map((c) => c.nguon).filter(coSoLieu)) {
      expect(nguon.moTaNguon.trim()).not.toBe('');
    }
  });
});

describe('tính nhất quán của số liệu mẫu', () => {
  it('tổng nhân sự khớp hệ thức kỳ trước + vào mới − nghỉ việc', () => {
    // Một bảng demo tự mâu thuẫn là thứ khách hàng cộng nhẩm ra ngay tại chỗ.
    const nhom2 = baoCao.nhom.find((n) => n.ma === 'bien-dong')!;
    const tong = nhom2.bieuDo.find((b) => b.ma === 'tong-nhan-su-theo-thang')!.duLieu;
    const vaoRa = nhom2.bieuDo.find((b) => b.ma === 'vao-ra-theo-thang')!.duLieu;

    for (let i = 1; i < tong.length; i++) {
      expect(tong[i].tongNhanSu).toBe(
        (tong[i - 1].tongNhanSu as number) +
          (vaoRa[i].vaoMoi as number) -
          (vaoRa[i].nghiViec as number),
      );
    }
  });

  it('mọi chuỗi của mọi biểu đồ có mặt ở mọi điểm dữ liệu', () => {
    // Thiếu một khoá ở một điểm thì recharts vẽ ra khoảng trống câm lặng.
    for (const nhom of baoCao.nhom) {
      for (const bd of nhom.bieuDo) {
        expect(bd.duLieu.length).toBeGreaterThan(0);
        for (const diem of bd.duLieu) {
          for (const chuoi of bd.chuoi) {
            expect(typeof diem[chuoi.khoa]).toBe('number');
          }
        }
      }
    }
  });

  it('chỉ số "nhân sự kỳ trước" bằng đúng "nhân sự hiện tại" của kỳ liền trước', () => {
    const kyTruoc = layBaoCao(baoCao.kyTruoc);
    const layGiaTri = (bc: typeof baoCao, ma: string) => {
      const nguon = bc.nhom.flatMap((n) => n.chiSo).find((c) => c.ma === ma)!.nguon;
      return coSoLieu(nguon) ? nguon.giaTri : null;
    };
    expect(layGiaTri(baoCao, 'nhan-su-ky-truoc')).toBe(layGiaTri(kyTruoc, 'nhan-su-hien-tai'));
  });
});

describe('chọn kỳ', () => {
  it('mọi kỳ chọn được đều dựng ra báo cáo đủ 16 chỉ số', () => {
    for (const ky of DANH_SACH_KY) {
      expect(layBaoCao(ky).nhom.flatMap((n) => n.chiSo)).toHaveLength(16);
    }
  });

  it('ném lỗi thay vì trả báo cáo rỗng khi kỳ không hợp lệ', () => {
    // Trang trắng trông y hệt trang đang tải — im lặng ở đây là bẫy gỡ lỗi.
    expect(() => layBaoCao('1999-01')).toThrow();
  });

  it('không cho chọn kỳ đầu chuỗi vì nó không có kỳ trước để so sánh', () => {
    expect(DANH_SACH_KY).not.toContain('2026-02');
  });
});
