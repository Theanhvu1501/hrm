import {
  computeRelevantCodes,
  buildSoChiTiet,
  buildSoChiTietMulti,
} from './so-chi-tiet.helper';
import {
  buildDoiTuongLoaiIndex,
  makeLoaiMatcher,
} from '../shared/doi-tuong-loai.helper';

describe('computeRelevantCodes', () => {
  const accounts = [
    { ma: '131' },
    { ma: '1311' },
    { ma: '1312' },
    { ma: '111' },
    { ma: '1111' },
  ];

  it('TK leaf chỉ trả về chính nó', () => {
    const set = computeRelevantCodes(accounts, '1311');
    expect([...set].sort()).toEqual(['1311']);
  });

  it('TK cha gồm chính nó và mọi con cháu theo tiền tố', () => {
    const set = computeRelevantCodes(accounts, '131');
    expect([...set].sort()).toEqual(['131', '1311', '1312']);
  });

  it('không gộp nhầm tài khoản khác nhánh', () => {
    const set = computeRelevantCodes(accounts, '131');
    expect(set.has('111')).toBe(false);
    expect(set.has('1111')).toBe(false);
  });
});

describe('buildSoChiTiet', () => {
  const account = { ma: '111', ten: 'Tiền mặt', loai: 'NO' };
  const relevant = new Set(['111']);

  const v = (
    ngay: string,
    soPhieu: string,
    tkNo: string,
    tkCo: string,
    soTien: number,
    doiTuongMa?: string,
  ) =>
    ({
      soPhieu,
      ngay: new Date(ngay) as any,
      soTien,
      noiDung: soPhieu,
      danhMuc: {
        taiKhoanNo: { ma: tkNo, ten: tkNo, loai: 'NO', nhom: '' },
        taiKhoanCo: { ma: tkCo, ten: tkCo, loai: 'CO', nhom: '' },
        ...(doiTuongMa
          ? { doiTuong: { ma: doiTuongMa, ten: doiTuongMa, loai: 'KHACH_HANG' } }
          : {}),
      },
    }) as any;

  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-01-31T23:59:59.999Z');

  it('TK đối ứng + bên phát sinh đúng theo vế (TK ở vế Nợ)', () => {
    const vouchers = [v('2026-01-05', 'PT01', '111', '511', 1000)];
    const r = buildSoChiTiet(account, relevant, vouchers, [], undefined, start, end);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].tkDoiUng).toBe('511');
    expect(r.rows[0].phatSinhNo).toBe(1000);
    expect(r.rows[0].phatSinhCo).toBe(0);
    expect(r.rows[0].soDuNo).toBe(1000);
    expect(r.tongPhatSinhNo).toBe(1000);
    expect(r.soDuCuoiKyNo).toBe(1000);
  });

  it('TK ở vế Có → phát sinh hiển thị bên Có, số dư giảm', () => {
    const vouchers = [
      v('2026-01-05', 'PT01', '111', '511', 1000),
      v('2026-01-06', 'PC01', '642', '111', 400),
    ];
    const r = buildSoChiTiet(account, relevant, vouchers, [], undefined, start, end);
    expect(r.rows[1].tkDoiUng).toBe('642');
    expect(r.rows[1].phatSinhCo).toBe(400);
    expect(r.rows[1].soDuNo).toBe(600);
    expect(r.tongPhatSinhCo).toBe(400);
    expect(r.soDuCuoiKyNo).toBe(600);
  });

  it('số dư đầu kỳ = nhập tay + phát sinh trước kỳ', () => {
    const opening = [{ maTaiKhoan: '111', duNo: 500, duCo: 0 }];
    const vouchers = [
      v('2025-12-20', 'PTprev', '111', '511', 200),
      v('2026-01-05', 'PT01', '111', '511', 1000),
    ];
    const r = buildSoChiTiet(account, relevant, vouchers, opening, undefined, start, end);
    expect(r.soDuDauKyNo).toBe(700);
    expect(r.rows).toHaveLength(1);
    expect(r.soDuCuoiKyNo).toBe(1700);
  });

  it('lọc theo đối tượng áp dụng cho cả phát sinh lẫn số dư đầu kỳ', () => {
    const account131 = { ma: '131', ten: 'Phải thu', loai: 'NO' };
    const rel = new Set(['131']);
    const opening = [
      { maTaiKhoan: '131', duNo: 100, duCo: 0, chiTietMa: 'KH01' },
      { maTaiKhoan: '131', duNo: 999, duCo: 0, chiTietMa: 'KH02' },
    ];
    const vouchers = [
      v('2026-01-05', 'BH01', '131', '511', 300, 'KH01'),
      v('2026-01-06', 'BH02', '131', '511', 777, 'KH02'),
    ];
    const r = buildSoChiTiet(account131, rel, vouchers, opening, 'KH01', start, end);
    expect(r.soDuDauKyNo).toBe(100);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].soPhieu).toBe('BH01');
    expect(r.soDuCuoiKyNo).toBe(400);
  });

  it('lọc theo đối tượng: TK ở vế Có nhận diện đối tượng qua doiTuong2', () => {
    const account131 = { ma: '131', ten: 'Phải thu', loai: 'NO' };
    const rel = new Set(['131']);
    // Trước kỳ: 131 ở vế Có cho KH01 (đối tượng bên Có ghi ở doiTuong2)
    // → khách dư Có (phải trả) 20tr đầu kỳ.
    const prev = {
      soPhieu: 'TT-prev',
      ngay: new Date('2025-12-20') as any,
      soTien: 20_000_000,
      noiDung: 'KH ứng trước',
      danhMuc: {
        taiKhoanNo: { ma: '112', ten: '112', loai: 'NO', nhom: '' },
        taiKhoanCo: { ma: '131', ten: '131', loai: 'CO', nhom: '' },
        doiTuong2: { ma: 'KH01', ten: 'Khách 01', loai: 'KHACH_HANG' },
      },
    } as any;
    // Trong kỳ: 131 ở vế Nợ cho KH01 (doiTuong) → phát sinh Nợ 20tr.
    const inPeriod = v('2026-01-05', 'BH01', '131', '511', 20_000_000, 'KH01');
    const r = buildSoChiTiet(
      account131,
      rel,
      [prev, inPeriod],
      [],
      'KH01',
      start,
      end,
    );
    expect(r.soDuDauKyCo).toBe(20_000_000);
    expect(r.tongPhatSinhNo).toBe(20_000_000);
    expect(r.soDuCuoiKyNo).toBe(0);
    expect(r.soDuCuoiKyCo).toBe(0);
  });

  it("lọc '__none__': chỉ bút toán CHƯA gắn đối tượng của TK", () => {
    const account331 = {
      ma: '331',
      ten: 'Phải trả NCC',
      loai: 'CO',
      chiTietTheo: 'NHA_CUNG_CAP',
    };
    const rel = new Set(['331']);
    const vouchers = [
      // Có gắn đối tượng ĐÚNG loại (doiTuong2) → PHẢI bị loại khi lọc rỗng
      {
        soPhieu: 'MH01',
        ngay: new Date('2026-01-05') as any,
        soTien: 500,
        noiDung: 'Mua hàng có NCC',
        danhMuc: {
          taiKhoanNo: { ma: '642', ten: '642', loai: 'NO', nhom: '' },
          taiKhoanCo: { ma: '331', ten: '331', loai: 'CO', nhom: '' },
          doiTuong2: { ma: 'NCC1', ten: 'NCC 1', loai: 'NHA_CUNG_CAP' },
        },
      } as any,
      // KHÔNG gắn đối tượng → phải được giữ
      v('2026-01-06', 'QC01', '642', '331', 800),
    ];
    const r = buildSoChiTiet(account331, rel, vouchers, [], '__none__', start, end);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].soPhieu).toBe('QC01');
    expect(r.tongPhatSinhCo).toBe(800);
  });

  it("lọc '__none__': đối tượng gắn SAI loại (loai ≠ chiTietTheo) cũng thuộc 'chưa xác định'", () => {
    // TK 131 chiTietTheo=KHACH_HANG. Phiếu gắn NCC001 (NHA_CUNG_CAP) → báo cáo
    // dồn vào "chưa xác định" → Sổ chi tiết '__none__' PHẢI hiện phiếu này.
    const account131 = {
      ma: '131',
      ten: 'Phải thu KH',
      loai: 'NO',
      chiTietTheo: 'KHACH_HANG',
    };
    const rel = new Set(['131']);
    const vouchers = [
      // Đúng loại KH → bị loại khỏi '__none__'
      v('2026-01-05', 'BH01', '131', '511', 300, 'KH01'),
      // Sai loại (NCC) ở vế Nợ 131 → PHẢI được giữ
      {
        soPhieu: 'SAI01',
        ngay: new Date('2026-01-06') as any,
        soTien: 200,
        noiDung: 'Đối tượng sai loại',
        danhMuc: {
          taiKhoanNo: { ma: '131', ten: '131', loai: 'NO', nhom: '' },
          taiKhoanCo: { ma: '511', ten: '511', loai: 'CO', nhom: '' },
          doiTuong: { ma: 'NCC001', ten: 'NCC', loai: 'NHA_CUNG_CAP' },
        },
      } as any,
    ];
    const r = buildSoChiTiet(account131, rel, vouchers, [], '__none__', start, end);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].soPhieu).toBe('SAI01');
    expect(r.tongPhatSinhNo).toBe(200);
  });

  it('gộp TK cha: chứng từ nội bộ 2 con sinh 2 dòng, số dư triệt tiêu', () => {
    const accountCha = { ma: '131', ten: 'Phải thu', loai: 'NO' };
    const rel = new Set(['131', '1311', '1312']);
    const vouchers = [v('2026-01-10', 'KC01', '1311', '1312', 500)];
    const r = buildSoChiTiet(accountCha, rel, vouchers, [], undefined, start, end);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].phatSinhNo).toBe(500);
    expect(r.rows[0].tkDoiUng).toBe('1312');
    expect(r.rows[1].phatSinhCo).toBe(500);
    expect(r.rows[1].tkDoiUng).toBe('1311');
    expect(r.soDuCuoiKyNo).toBe(0);
    expect(r.soDuCuoiKyCo).toBe(0);
    expect(r.tongPhatSinhNo).toBe(500);
    expect(r.tongPhatSinhCo).toBe(500);
  });

  it('bộ rỗng → 0 dòng, các tổng = 0', () => {
    const r = buildSoChiTiet(account, relevant, [], [], undefined, start, end);
    expect(r.rows).toHaveLength(0);
    expect(r.soDuDauKyNo).toBe(0);
    expect(r.soDuCuoiKyNo).toBe(0);
  });

  it('TK loại Có (331): số dư đầu kỳ + lũy kế hiển thị bên Có, vế Nợ giảm số dư', () => {
    const account331 = { ma: '331', ten: 'Phải trả NCC', loai: 'CO' };
    const rel = new Set(['331']);
    const opening = [{ maTaiKhoan: '331', duNo: 0, duCo: 200 }];
    const vouchers = [
      v('2026-01-05', 'MH01', '156', '331', 1000), // 331 vế Có → tăng số dư Có
      v('2026-01-08', 'TT01', '331', '111', 400), // 331 vế Nợ → giảm số dư Có
    ];
    const r = buildSoChiTiet(account331, rel, vouchers, opening, undefined, start, end);
    expect(r.soDuDauKyCo).toBe(200);
    expect(r.soDuDauKyNo).toBe(0);
    expect(r.rows[0].phatSinhCo).toBe(1000);
    expect(r.rows[0].tkDoiUng).toBe('156');
    expect(r.rows[0].soDuCo).toBe(1200);
    expect(r.rows[1].phatSinhNo).toBe(400);
    expect(r.rows[1].tkDoiUng).toBe('111');
    expect(r.rows[1].soDuCo).toBe(800);
    expect(r.tongPhatSinhNo).toBe(400);
    expect(r.tongPhatSinhCo).toBe(1000);
    expect(r.soDuCuoiKyCo).toBe(800);
    expect(r.soDuCuoiKyNo).toBe(0);
  });

  it('điền các trường danhMuc lên dòng phát sinh', () => {
    const voucher = {
      soPhieu: 'PT01',
      ngay: new Date('2026-01-05') as any,
      soTien: 1000,
      noiDung: 'PT01',
      danhMuc: {
        taiKhoanNo: { ma: '111', ten: '111', loai: 'NO', nhom: '' },
        taiKhoanCo: { ma: '511', ten: '511', loai: 'CO', nhom: '' },
        doiTuong: { ma: 'KH01', ten: 'Khách 01', loai: 'KHACH_HANG' },
        khoanMuc: { ma: 'KM1', ten: 'Khoản mục 1', loai: 'CP', nhom: '' },
        duAn: { ma: 'DA1', ten: 'Dự án 1', trangThai: 'ACTIVE' },
        boPhan: { ma: 'BP1', ten: 'Bộ phận 1' },
        nhanVien: { ma: 'NV1', ten: 'Nhân viên 1' },
      },
    } as any;
    const r = buildSoChiTiet(account, relevant, [voucher], [], undefined, start, end);
    expect(r.rows[0].maDoiTuong).toBe('KH01');
    expect(r.rows[0].tenDoiTuong).toBe('Khách 01');
    expect(r.rows[0].maKhoanMuc).toBe('KM1');
    expect(r.rows[0].maDuAn).toBe('DA1');
    expect(r.rows[0].maBoPhan).toBe('BP1');
    expect(r.rows[0].maNhanVien).toBe('NV1');
  });

  it('chứng từ đúng ngày startDate được tính trong kỳ (không phải đầu kỳ)', () => {
    const vouchers = [v('2026-01-01', 'PT01', '111', '511', 100)];
    const r = buildSoChiTiet(account, relevant, vouchers, [], undefined, start, end);
    expect(r.rows).toHaveLength(1);
    expect(r.soDuDauKyNo).toBe(0);
    expect(r.tongPhatSinhNo).toBe(100);
  });
});

describe('buildSoChiTietMulti', () => {
  const accounts = [
    { ma: '111', ten: 'Tiền mặt', loai: 'NO' },
    { ma: '511', ten: 'Doanh thu', loai: 'CO' },
    { ma: '642', ten: 'Chi phí QLDN', loai: 'NO' },
  ];
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-01-31T23:59:59.999Z');
  const voucher = {
    soPhieu: 'PT01',
    ngay: new Date('2026-01-05') as any,
    soTien: 1000,
    noiDung: 'PT01',
    danhMuc: {
      taiKhoanNo: { ma: '111', ten: '111', loai: 'NO', nhom: '' },
      taiKhoanCo: { ma: '511', ten: '511', loai: 'CO', nhom: '' },
    },
  } as any;

  it('trả về một report cho mỗi mã TK có phát sinh', () => {
    const reports = buildSoChiTietMulti(
      ['111', '511'], accounts, [voucher], [], undefined, start, end,
    );
    expect(reports).toHaveLength(2);
    expect(reports.map((r) => r.taiKhoan.ma)).toEqual(['111', '511']);
  });

  it('bỏ qua TK không có số dư đầu kỳ và không phát sinh', () => {
    const reports = buildSoChiTietMulti(
      ['111', '642'], accounts, [voucher], [], undefined, start, end,
    );
    expect(reports.map((r) => r.taiKhoan.ma)).toEqual(['111']);
  });

  it('bỏ qua mã TK không tồn tại trong danh mục', () => {
    const reports = buildSoChiTietMulti(
      ['111', '999'], accounts, [voucher], [], undefined, start, end,
    );
    expect(reports.map((r) => r.taiKhoan.ma)).toEqual(['111']);
  });
});

describe('buildSoChiTiet — đối tượng đa loại', () => {
  const start = new Date('2026-01-01');
  const end = new Date('2026-12-31T23:59:59.999Z');
  const account331 = {
    ma: '331',
    ten: 'Phải trả NCC',
    loai: 'CO',
    chiTietTheo: 'NHA_CUNG_CAP',
  };
  const rel = new Set(['331']);
  // Ca thật PT155/2026: đối tượng đa loại, snapshot chỉ giữ loại chính KHACH_HANG.
  const vouchers = [
    {
      soPhieu: 'PT155/2026',
      ngay: new Date('2026-05-25') as any,
      soTien: 500,
      noiDung: 'Phí tư vấn',
      danhMuc: {
        taiKhoanNo: { ma: '6422', ten: '6422', loai: 'NO', nhom: '' },
        taiKhoanCo: { ma: '331', ten: '331', loai: 'CO', nhom: '' },
        doiTuong2: { ma: 'DT01', ten: 'Cty đa loại', loai: 'KHACH_HANG' },
      },
    } as any,
  ];
  const match = makeLoaiMatcher(
    buildDoiTuongLoaiIndex([{ ma: 'DT01', loai: ['KHACH_HANG', 'NHA_CUNG_CAP'] }]),
  );

  it("lọc theo đối tượng đa loại trên TK 331 → ra phiếu (trước đây rỗng)", () => {
    const r = buildSoChiTiet(account331, rel, vouchers, [], 'DT01', start, end, match);
    expect(r.rows.map((x) => x.soPhieu)).toEqual(['PT155/2026']);
    expect(r.tongPhatSinhCo).toBe(500);
  });

  it("lọc '__none__' KHÔNG còn gom phiếu đã gắn đối tượng đa loại", () => {
    const r = buildSoChiTiet(account331, rel, vouchers, [], '__none__', start, end, match);
    expect(r.rows).toHaveLength(0);
  });
});
