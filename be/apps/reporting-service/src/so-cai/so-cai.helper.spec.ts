import { computeTrialRow, buildDoiTuongRows } from './so-cai.service';
import {
  buildDoiTuongLoaiIndex,
  makeLoaiMatcher,
} from '../shared/doi-tuong-loai.helper';

describe('computeTrialRow', () => {
  const zeroAgg = { priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0 };
  const zeroOpening = { duNo: 0, duCo: 0 };

  it('TK loại NO: số dư đầu kỳ thủ công cộng vào đầu kỳ và cuối kỳ', () => {
    // Opening duNo 1,000,000; phát sinh Nợ 500,000 trong kỳ
    const row = computeTrialRow(
      { priorNo: 0, priorCo: 0, periodNo: 500000, periodCo: 0 },
      { duNo: 1000000, duCo: 0 },
      'NO',
    );
    expect(row.noDauKy).toBe(1000000);
    expect(row.coDauKy).toBe(0);
    expect(row.noPhatSinh).toBe(500000);
    expect(row.noCuoiKy).toBe(1500000);
    expect(row.coCuoiKy).toBe(0);
  });

  it('TK loại CO: opening duCo cộng vào đầu kỳ Có', () => {
    const row = computeTrialRow(
      { priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 200000 },
      { duNo: 0, duCo: 800000 },
      'CO',
    );
    expect(row.coDauKy).toBe(800000);
    expect(row.noDauKy).toBe(0);
    expect(row.coCuoiKy).toBe(1000000);
  });

  it('opening cộng dồn với prior từ chứng từ (loại NO)', () => {
    const row = computeTrialRow(
      { priorNo: 300000, priorCo: 100000, periodNo: 0, periodCo: 0 },
      { duNo: 500000, duCo: 0 },
      'NO',
    );
    // đầu kỳ = (300000+500000) - (100000+0) = 700000 dư Nợ
    expect(row.noDauKy).toBe(700000);
    expect(row.coDauKy).toBe(0);
  });

  it('opening = 0 cho kết quả như cũ', () => {
    const row = computeTrialRow(
      { priorNo: 0, priorCo: 0, periodNo: 100000, periodCo: 0 },
      zeroOpening,
      'NO',
    );
    expect(row.noDauKy).toBe(0);
    expect(row.noCuoiKy).toBe(100000);
  });

  it('agg = 0 + opening = 0 → tất cả 0', () => {
    const row = computeTrialRow(zeroAgg, zeroOpening, 'NO');
    expect(row).toEqual({
      noDauKy: 0,
      coDauKy: 0,
      noPhatSinh: 0,
      coPhatSinh: 0,
      noCuoiKy: 0,
      coCuoiKy: 0,
    });
  });
});

describe('buildDoiTuongRows', () => {
  it('phát sinh cộng đúng theo từng đối tượng (loại NO)', () => {
    const rows = buildDoiTuongRows(
      'NO',
      [
        { doiTuongMa: 'KH01', doiTuongTen: 'A', doiTuongLoai: 'KHACH_HANG', priorNo: 0, priorCo: 0, periodNo: 300, periodCo: 0 },
        { doiTuongMa: 'KH02', doiTuongTen: 'B', doiTuongLoai: 'KHACH_HANG', priorNo: 0, priorCo: 0, periodNo: 200, periodCo: 0 },
      ],
      [],
      'KHACH_HANG',
    );
    expect(rows).toHaveLength(2);
    const tongPhatSinhNo = rows.reduce((s, r) => s + r.noPhatSinh, 0);
    expect(tongPhatSinhNo).toBe(500);
    const kh01 = rows.find((r) => r.ma === 'KH01');
    expect(kh01?.ten).toBe('A');
    expect(kh01?.noPhatSinh).toBe(300);
  });

  it('opening theo đối tượng cộng vào đầu kỳ', () => {
    const rows = buildDoiTuongRows(
      'NO',
      [{ doiTuongMa: 'KH01', doiTuongTen: 'A', doiTuongLoai: 'KHACH_HANG', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0 }],
      [{ doiTuongMa: 'KH01', doiTuongTen: 'A', chiTietType: 'KHACH_HANG', duNo: 1000, duCo: 0 }],
      'KHACH_HANG',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].noDauKy).toBe(1000);
    expect(rows[0].noCuoiKy).toBe(1000);
  });

  it('đối tượng null → dòng "Chưa xác định đối tượng", ma rỗng', () => {
    const rows = buildDoiTuongRows(
      'CO',
      [{ doiTuongMa: null, doiTuongTen: null, doiTuongLoai: null, priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 70 }],
      [],
      'NHA_CUNG_CAP',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].ma).toBe('');
    expect(rows[0].ten).toBe('Chưa xác định đối tượng');
    expect(rows[0].coPhatSinh).toBe(70);
  });

  it('bỏ dòng đối tượng toàn 0', () => {
    const rows = buildDoiTuongRows(
      'NO',
      [{ doiTuongMa: 'KH01', doiTuongTen: 'A', doiTuongLoai: 'KHACH_HANG', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0 }],
      [],
      'KHACH_HANG',
    );
    expect(rows).toHaveLength(0);
  });

  it('đối tượng chỉ có ở opening (không phát sinh) vẫn ra 1 dòng đầu kỳ', () => {
    const rows = buildDoiTuongRows(
      'NO',
      [],
      [{ doiTuongMa: 'KH09', doiTuongTen: 'Chỉ đầu kỳ', chiTietType: 'KHACH_HANG', duNo: 500, duCo: 0 }],
      'KHACH_HANG',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].ma).toBe('KH09');
    expect(rows[0].noDauKy).toBe(500);
    expect(rows[0].noCuoiKy).toBe(500);
    expect(rows[0].noPhatSinh).toBe(0);
  });

  it('dòng "Chưa xác định đối tượng" luôn xếp cuối', () => {
    const rows = buildDoiTuongRows(
      'NO',
      [
        { doiTuongMa: null, doiTuongTen: null, doiTuongLoai: null, priorNo: 0, priorCo: 0, periodNo: 200, periodCo: 0 },
        { doiTuongMa: 'KH02', doiTuongTen: 'B', doiTuongLoai: 'KHACH_HANG', priorNo: 0, priorCo: 0, periodNo: 300, periodCo: 0 },
      ],
      [],
      'KHACH_HANG',
    );
    expect(rows.map((r) => r.ma)).toEqual(['KH02', '']);
  });

  it('đối tượng SAI loại bị gộp vào "Chưa xác định" (giữ khớp tổng)', () => {
    // TK chi tiết theo KHÁCH HÀNG nhưng chứng từ gắn đối tượng là NHÀ CUNG CẤP
    // (counterparty của vế kia) → không được hiện thành dòng NCC, phải gộp orphan.
    const rows = buildDoiTuongRows(
      'NO',
      [
        { doiTuongMa: 'KH01', doiTuongTen: 'A', doiTuongLoai: 'KHACH_HANG', priorNo: 0, priorCo: 0, periodNo: 300, periodCo: 0 },
        { doiTuongMa: 'NCC9', doiTuongTen: 'NCC sai', doiTuongLoai: 'NHA_CUNG_CAP', priorNo: 0, priorCo: 0, periodNo: 200, periodCo: 0 },
      ],
      [],
      'KHACH_HANG',
    );
    // KH01 giữ nguyên; NCC9 (sai loại) gộp vào orphan; tổng phát sinh vẫn 500.
    expect(rows.map((r) => r.ma).sort()).toEqual(['', 'KH01']);
    expect(rows.find((r) => r.ma === 'NCC9')).toBeUndefined();
    expect(rows.reduce((s, r) => s + r.noPhatSinh, 0)).toBe(500);
    expect(rows.find((r) => r.ma === '')?.noPhatSinh).toBe(200);
  });

  // Đối tượng đa loại: snapshot chứng từ/đầu kỳ chỉ giữ loại chính (loai[0]).
  // Tra danh mục → vẫn thuộc NHA_CUNG_CAP nên phải hiện đúng ở TK 331.
  it('đối tượng ĐA LOẠI (KH+NCC) hiện đúng ở TK 331, không rơi vào "Chưa xác định"', () => {
    const match = makeLoaiMatcher(
      buildDoiTuongLoaiIndex([{ ma: 'DT01', loai: ['KHACH_HANG', 'NHA_CUNG_CAP'] }]),
    );
    const rows = buildDoiTuongRows(
      'CO',
      [{ doiTuongMa: 'DT01', doiTuongTen: 'Cty đa loại', doiTuongLoai: 'KHACH_HANG', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 500 }],
      [{ doiTuongMa: 'DT01', doiTuongTen: 'Cty đa loại', chiTietType: 'KHACH_HANG', duNo: 0, duCo: 1000 }],
      'NHA_CUNG_CAP',
      match,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].ma).toBe('DT01');
    expect(rows[0].coDauKy).toBe(1000);
    expect(rows[0].coPhatSinh).toBe(500);
    expect(rows[0].coCuoiKy).toBe(1500);
  });
});
