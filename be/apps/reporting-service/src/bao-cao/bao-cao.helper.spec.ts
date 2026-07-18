import { openingNetForSide, buildDoiTuongSoTien } from './bao-cao.service';
import {
  buildDoiTuongLoaiIndex,
  makeLoaiMatcher,
} from '../shared/doi-tuong-loai.helper';

describe('openingNetForSide', () => {
  it('undefined opening → 0', () => {
    expect(openingNetForSide(undefined, 'NO')).toBe(0);
    expect(openingNetForSide(undefined, 'CO')).toBe(0);
  });

  it('phía NO (tài sản): net = duNo - duCo', () => {
    expect(openingNetForSide({ duNo: 1000000, duCo: 0 }, 'NO')).toBe(1000000);
    expect(openingNetForSide({ duNo: 1000000, duCo: 200000 }, 'NO')).toBe(800000);
  });

  it('phía CO (nguồn vốn): net = duCo - duNo', () => {
    expect(openingNetForSide({ duNo: 0, duCo: 500000 }, 'CO')).toBe(500000);
    expect(openingNetForSide({ duNo: 100000, duCo: 500000 }, 'CO')).toBe(400000);
  });
});

describe('buildDoiTuongSoTien', () => {
  const v = (
    maNo: string,
    maCo: string,
    dtMa: string | undefined,
    soTien: number,
    dtLoai = 'KHACH_HANG',
  ) => ({
    soPhieu: 'x', loai: 'PHIEU_THU' as const, ngay: new Date(), noiDung: '', soTien,
    danhMuc: {
      taiKhoanNo: { ma: maNo, ten: '', loai: '', nhom: '' },
      taiKhoanCo: { ma: maCo, ten: '', loai: '', nhom: '' },
      ...(dtMa ? { doiTuong: { ma: dtMa, ten: `Tên ${dtMa}`, loai: dtLoai } } : {}),
    },
  });

  it('phân rã số dư TK 131 (phía NO) theo đối tượng, Σ = số dư TK', () => {
    const vouchers = [v('131', '511', 'KH01', 300), v('131', '511', 'KH02', 200)];
    const rows = buildDoiTuongSoTien(vouchers, '131', 'NO', [], 'KHACH_HANG');
    const tong = rows.reduce((s, r) => s + r.soTien, 0);
    expect(tong).toBe(500);
    expect(rows.map((r) => r.ma).sort()).toEqual(['KH01', 'KH02']);
  });

  it('chứng từ thiếu đối tượng → dòng "Chưa xác định đối tượng" (ma rỗng)', () => {
    const vouchers = [v('131', '511', 'KH01', 300), v('131', '511', undefined, 200)];
    const rows = buildDoiTuongSoTien(vouchers, '131', 'NO', [], 'KHACH_HANG');
    const orphan = rows.find((r) => r.ma === '');
    expect(orphan?.ten).toBe('Chưa xác định đối tượng');
    expect(orphan?.soTien).toBe(200);
  });

  it('cộng opening theo đối tượng và bỏ dòng 0', () => {
    const rows = buildDoiTuongSoTien([], '131', 'NO', [
      { chiTietMa: 'KH01', chiTietTen: 'A', chiTietType: 'KHACH_HANG', net: 1000 },
      { chiTietMa: 'KH02', chiTietTen: 'B', chiTietType: 'KHACH_HANG', net: 0 },
    ], 'KHACH_HANG');
    expect(rows).toHaveLength(1);
    expect(rows[0].ma).toBe('KH01');
    expect(rows[0].soTien).toBe(1000);
  });

  it('dòng "Chưa xác định đối tượng" luôn xếp cuối', () => {
    const vouchers = [v('131', '511', undefined, 200), v('131', '511', 'KH02', 300)];
    const rows = buildDoiTuongSoTien(vouchers, '131', 'NO', [], 'KHACH_HANG');
    expect(rows.map((r) => r.ma)).toEqual(['KH02', '']);
  });

  it('đối tượng SAI loại (counterparty vế kia) bị gộp vào "Chưa xác định", không hiện sai', () => {
    // TK 112 (giả lập chi tiết theo KHÁCH HÀNG) nhận chứng từ Nợ112/Có131 với
    // đối tượng là NHÀ CUNG CẤP của vế kia → phải gộp orphan, KHÔNG hiện NCC.
    const vouchers = [
      v('112', '131', 'KH01', 300, 'KHACH_HANG'),
      v('112', '331', 'NCC9', 200, 'NHA_CUNG_CAP'),
    ];
    const rows = buildDoiTuongSoTien(vouchers, '112', 'NO', [], 'KHACH_HANG');
    expect(rows.find((r) => r.ma === 'NCC9')).toBeUndefined();
    expect(rows.find((r) => r.ma === 'KH01')?.soTien).toBe(300);
    expect(rows.find((r) => r.ma === '')?.soTien).toBe(200); // NCC gộp orphan
    expect(rows.reduce((s, r) => s + r.soTien, 0)).toBe(500); // Σ vẫn khớp
  });

  it('buildDoiTuongSoTien: bên Có lấy đối tượng từ doiTuong2, fallback doiTuong', () => {
    const vouchers = [
      // chi tiền: Có 112, ngân hàng nằm ở doiTuong2
      {
        soTien: 300,
        danhMuc: {
          taiKhoanNo: { ma: '331' }, taiKhoanCo: { ma: '112' },
          doiTuong: { ma: 'NCC01', ten: 'NCC', loai: 'NHA_CUNG_CAP' },
          doiTuong2: { ma: 'VCB01', ten: 'Vietcombank', loai: 'NGAN_HANG_QUY' },
        },
      },
      // dữ liệu cũ: chỉ có doiTuong
      {
        soTien: 200,
        danhMuc: {
          taiKhoanNo: { ma: '642' }, taiKhoanCo: { ma: '112' },
          doiTuong: { ma: 'VCB01', ten: 'Vietcombank', loai: 'NGAN_HANG_QUY' },
        },
      },
    ];
    const rows = buildDoiTuongSoTien(vouchers as never[], '112', 'NO', [], 'NGAN_HANG_QUY');
    const vcb = rows.find((r) => r.ma === 'VCB01');
    expect(vcb).toBeDefined();
    expect(vcb!.soTien).toBe(-500); // tiền ra khỏi 112 (type NO, bên Có → trừ)
  });

  // Ca thật PT155/2026: đối tượng đa loại (KH+NCC), snapshot chứng từ chỉ giữ
  // loại chính 'KHACH_HANG' → trước đây bị dồn vào "Chưa xác định đối tượng"
  // ở TK 331. Tra danh mục thì loai chứa NHA_CUNG_CAP → phải hiện đúng đối tượng.
  it('đối tượng ĐA LOẠI (KH+NCC): hiện đúng ở TK 331 dù snapshot ghi KHACH_HANG', () => {
    const match = makeLoaiMatcher(
      buildDoiTuongLoaiIndex([{ ma: 'DT01', loai: ['KHACH_HANG', 'NHA_CUNG_CAP'] }]),
    );
    const vouchers = [
      {
        soTien: 500,
        danhMuc: {
          taiKhoanNo: { ma: '6422' },
          taiKhoanCo: { ma: '331' },
          doiTuong2: { ma: 'DT01', ten: 'Cty đa loại', loai: 'KHACH_HANG' },
        },
      },
    ];
    const rows = buildDoiTuongSoTien(
      vouchers as never[], '331', 'CO', [], 'NHA_CUNG_CAP', match,
    );
    expect(rows.find((r) => r.ma === '')).toBeUndefined(); // hết "chưa xác định"
    expect(rows.find((r) => r.ma === 'DT01')?.soTien).toBe(500);
  });

  it('đối tượng đa loại KHÔNG chứa loại của TK vẫn gộp "Chưa xác định"', () => {
    const match = makeLoaiMatcher(
      buildDoiTuongLoaiIndex([{ ma: 'NV1', loai: ['NHAN_VIEN'] }]),
    );
    const vouchers = [
      {
        soTien: 200,
        danhMuc: {
          taiKhoanNo: { ma: '6422' },
          taiKhoanCo: { ma: '331' },
          doiTuong2: { ma: 'NV1', ten: 'Nhân viên', loai: 'NHAN_VIEN' },
        },
      },
    ];
    const rows = buildDoiTuongSoTien(
      vouchers as never[], '331', 'CO', [], 'NHA_CUNG_CAP', match,
    );
    expect(rows.find((r) => r.ma === 'NV1')).toBeUndefined();
    expect(rows.find((r) => r.ma === '')?.soTien).toBe(200);
  });

  it('số dư đầu kỳ của đối tượng đa loại cũng khớp TK 331', () => {
    const match = makeLoaiMatcher(
      buildDoiTuongLoaiIndex([{ ma: 'DT01', loai: ['KHACH_HANG', 'NHA_CUNG_CAP'] }]),
    );
    const rows = buildDoiTuongSoTien([], '331', 'CO', [
      { chiTietMa: 'DT01', chiTietTen: 'Cty đa loại', chiTietType: 'KHACH_HANG', net: 1000 },
    ], 'NHA_CUNG_CAP', match);
    expect(rows).toHaveLength(1);
    expect(rows[0].ma).toBe('DT01');
    expect(rows[0].soTien).toBe(1000);
  });
});
