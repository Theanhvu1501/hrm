import type { KetQuaLuong } from '@app/entities';
import { apDungKhauTruThue } from './khau-tru-thue';

function kq(over: Partial<KetQuaLuong> = {}): KetQuaLuong {
  return {
    giaTriTungKhoan: {},
    tongThuNhap: 20_000_000,
    thuNhapMienThue: 0,
    mienThueKhoan: 0,
    otMienThue: 0,
    bhxh: 630_000,
    giamTru: 15_500_000,
    thuNhapTinhThue: 3_870_000,
    thue: 193_000,
    phiCongDoan: 0,
    thucLinh: 19_177_000,
    chiPhiBHCongTy: 0,
    tongChiPhiCongTy: 0,
    ...over,
  };
}

const KHONG_TRU = { tamUng: 0, khauTruKhac: 0 };

describe('apDungKhauTruThue', () => {
  it('mặc định trừ theo mức KHAI BÁO — đúng số công ty thực nộp', () => {
    const khaiBao = kq({ thue: 50_000 });
    const thucTe = kq({ thue: 193_000, thucLinh: 19_177_000 });

    const ra = apDungKhauTruThue(khaiBao, thucTe, {}, KHONG_TRU);

    expect(ra.thue).toBe(50_000);
    // Trừ ít thuế hơn 143.000 ⇒ thực lĩnh tăng đúng 143.000.
    expect(ra.thucLinh).toBe(19_320_000);
  });

  it('cấu hình thuc_te thì giữ nguyên kết quả engine', () => {
    const thucTe = kq({ thue: 193_000, thucLinh: 19_177_000 });
    const ra = apDungKhauTruThue(
      kq({ thue: 50_000 }),
      thucTe,
      { khauTruThueTheo: 'thuc_te' },
      KHONG_TRU,
    );
    expect(ra).toBe(thucTe);
  });

  it('hai mức bằng nhau thì không đụng gì', () => {
    const thucTe = kq({ thue: 50_000 });
    const ra = apDungKhauTruThue(kq({ thue: 50_000 }), thucTe, {}, KHONG_TRU);
    expect(ra).toBe(thucTe);
  });

  it('không sửa tại chỗ kết quả gốc của engine', () => {
    const thucTe = kq({ thue: 193_000 });
    apDungKhauTruThue(kq({ thue: 50_000 }), thucTe, {}, KHONG_TRU);
    expect(thucTe.thue).toBe(193_000);
  });

  it('thuế khai báo LỚN HƠN (hiếm, nhưng có: mức khai báo cao hơn lương thật) thì thực lĩnh giảm', () => {
    const ra = apDungKhauTruThue(
      kq({ thue: 300_000 }),
      kq({ thue: 193_000, thucLinh: 19_177_000 }),
      {},
      KHONG_TRU,
    );
    expect(ra.thue).toBe(300_000);
    expect(ra.thucLinh).toBe(19_070_000);
  });
});
