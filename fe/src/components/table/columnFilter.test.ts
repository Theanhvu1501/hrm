import { describe, it, expect } from 'vitest';
import {
  isActiveFilter,
  matchAllFilters,
  matchNumber,
  matchText,
  parseFilterNumber,
  type NumberFilter,
  type NumberOp,
  type TextFilter,
  type TextOp,
} from './columnFilter';

const t = (op: TextOp, value: string): TextFilter => ({ kind: 'text', op, value });
const n = (op: NumberOp, value = ''): NumberFilter => ({ kind: 'number', op, value });

describe('matchText', () => {
  it('Chứa: khớp chuỗi con, không phân biệt hoa thường', () => {
    expect(matchText('CÔNG TY G-LIFE', t('contains', 'g-life'))).toBe(true);
    expect(matchText('CÔNG TY G-LIFE', t('contains', 'vinamilk'))).toBe(false);
  });

  it('Chứa: bỏ dấu tiếng Việt ở cả hai phía', () => {
    expect(matchText('CÔNG TY CỔ PHẦN', t('contains', 'cong ty'))).toBe(true);
    expect(matchText('Cong ty co phan', t('contains', 'cổ phần'))).toBe(true);
    expect(matchText('Nguyễn Văn Đức', t('contains', 'duc'))).toBe(true);
  });

  it('Không chứa: phủ định của Chứa', () => {
    expect(matchText('CÔNG TY G-LIFE', t('notContains', 'vinamilk'))).toBe(true);
    expect(matchText('CÔNG TY G-LIFE', t('notContains', 'g-life'))).toBe(false);
  });

  it('Bằng: khớp toàn bộ chuỗi (đã trim, bỏ dấu, hạ hoa thường)', () => {
    expect(matchText(' KH001 ', t('equals', 'kh001'))).toBe(true);
    expect(matchText('KH0011', t('equals', 'kh001'))).toBe(false);
  });

  it('Bắt đầu bằng', () => {
    expect(matchText('KH001', t('startsWith', 'kh'))).toBe(true);
    expect(matchText('NCC001', t('startsWith', 'kh'))).toBe(false);
  });

  it('giá trị lọc rỗng hoặc chỉ khoảng trắng → không lọc, mọi dòng đều khớp', () => {
    expect(matchText('bất kỳ', t('contains', ''))).toBe(true);
    expect(matchText('bất kỳ', t('equals', '   '))).toBe(true);
  });

  it('ô nguồn rỗng/undefined: chỉ khớp Không chứa', () => {
    expect(matchText(undefined, t('contains', 'a'))).toBe(false);
    expect(matchText('', t('equals', 'a'))).toBe(false);
    expect(matchText(undefined, t('notContains', 'a'))).toBe(true);
  });
});

describe('parseFilterNumber', () => {
  it('số thuần', () => {
    expect(parseFilterNumber('1230000')).toBe(1230000);
    expect(parseFilterNumber(' 0 ')).toBe(0);
  });

  it('dấu chấm ngăn nghìn kiểu VN', () => {
    expect(parseFilterNumber('1.230.000')).toBe(1230000);
    expect(parseFilterNumber('1.500')).toBe(1500);
  });

  it('dấu phẩy ngăn nghìn kiểu EN', () => {
    expect(parseFilterNumber('1,230,000')).toBe(1230000);
  });

  it('số lẻ: dấu chấm hoặc dấu phẩy làm dấu thập phân', () => {
    expect(parseFilterNumber('1500.5')).toBe(1500.5);
    expect(parseFilterNumber('1500,5')).toBe(1500.5);
    expect(parseFilterNumber('1.230.000,75')).toBe(1230000.75);
  });

  it('số âm', () => {
    expect(parseFilterNumber('-500000')).toBe(-500000);
    expect(parseFilterNumber('-1.230.000')).toBe(-1230000);
  });

  it('rỗng hoặc rác → null', () => {
    expect(parseFilterNumber('')).toBeNull();
    expect(parseFilterNumber('  ')).toBeNull();
    expect(parseFilterNumber('abc')).toBeNull();
    expect(parseFilterNumber('12ab')).toBeNull();
    expect(parseFilterNumber('1..2')).toBeNull();
  });
});

describe('matchNumber', () => {
  it('Bằng / Khác (có sai số 0,005)', () => {
    expect(matchNumber(1230000, n('eq', '1.230.000'))).toBe(true);
    expect(matchNumber(1230000.001, n('eq', '1230000'))).toBe(true);
    expect(matchNumber(1230001, n('eq', '1230000'))).toBe(false);
    expect(matchNumber(1230001, n('ne', '1230000'))).toBe(true);
    expect(matchNumber(1230000, n('ne', '1230000'))).toBe(false);
  });

  it('Nhỏ hơn / Nhỏ hơn hoặc bằng', () => {
    expect(matchNumber(99, n('lt', '100'))).toBe(true);
    expect(matchNumber(100, n('lt', '100'))).toBe(false);
    expect(matchNumber(100, n('lte', '100'))).toBe(true);
    expect(matchNumber(101, n('lte', '100'))).toBe(false);
  });

  it('Lớn hơn / Lớn hơn hoặc bằng', () => {
    expect(matchNumber(101, n('gt', '100'))).toBe(true);
    expect(matchNumber(100, n('gt', '100'))).toBe(false);
    expect(matchNumber(100, n('gte', '100'))).toBe(true);
    expect(matchNumber(99, n('gte', '100'))).toBe(false);
  });

  it('ô bằng 0 vẫn là số 0 khi so sánh', () => {
    expect(matchNumber(0, n('lt', '100'))).toBe(true);
    expect(matchNumber(0, n('eq', '0'))).toBe(true);
    expect(matchNumber(0, n('gt', '0'))).toBe(false);
  });

  it('ô không có số: không khớp mọi toán tử so sánh', () => {
    expect(matchNumber(undefined, n('lt', '100'))).toBe(false);
    expect(matchNumber(null, n('gte', '0'))).toBe(false);
    expect(matchNumber('', n('eq', '0'))).toBe(false);
  });

  it('(Trống): ô không có số HOẶC bằng 0', () => {
    expect(matchNumber(0, n('blank'))).toBe(true);
    expect(matchNumber(undefined, n('blank'))).toBe(true);
    expect(matchNumber(null, n('blank'))).toBe(true);
    expect(matchNumber(5, n('blank'))).toBe(false);
  });

  it('(Không trống): có số khác 0', () => {
    expect(matchNumber(5, n('notBlank'))).toBe(true);
    expect(matchNumber(-5, n('notBlank'))).toBe(true);
    expect(matchNumber(0, n('notBlank'))).toBe(false);
    expect(matchNumber(undefined, n('notBlank'))).toBe(false);
  });

  it('giá trị nhập rỗng hoặc không hợp lệ → không lọc', () => {
    expect(matchNumber(5, n('gt', ''))).toBe(true);
    expect(matchNumber(5, n('gt', 'abc'))).toBe(true);
  });

  it('ô là chuỗi số (dữ liệu backend trả chuỗi) vẫn so sánh được', () => {
    expect(matchNumber('1500', n('gt', '1000'))).toBe(true);
  });
});

describe('isActiveFilter', () => {
  it('lọc chữ: chỉ bật khi có giá trị thực', () => {
    expect(isActiveFilter(undefined)).toBe(false);
    expect(isActiveFilter(t('contains', ''))).toBe(false);
    expect(isActiveFilter(t('contains', '  '))).toBe(false);
    expect(isActiveFilter(t('contains', 'a'))).toBe(true);
  });

  it('lọc số: (Trống)/(Không trống) bật dù không có giá trị nhập', () => {
    expect(isActiveFilter(n('blank'))).toBe(true);
    expect(isActiveFilter(n('notBlank'))).toBe(true);
  });

  it('lọc số: toán tử so sánh chỉ bật khi giá trị parse được', () => {
    expect(isActiveFilter(n('gt', ''))).toBe(false);
    expect(isActiveFilter(n('gt', 'abc'))).toBe(false);
    expect(isActiveFilter(n('gt', '1.000'))).toBe(true);
  });
});

describe('matchAllFilters', () => {
  interface Row {
    ten: string;
    no: number;
    co: number;
  }
  const row: Row = { ten: 'CÔNG TY G-LIFE', no: 1230000, co: 0 };
  const getValue = (r: Row, key: string) =>
    key === 'ten' ? r.ten : key === 'no' ? r.no : key === 'co' ? r.co : undefined;

  it('kết hợp lọc chữ và lọc số trên cùng một dòng', () => {
    expect(
      matchAllFilters(row, { ten: t('contains', 'g-life'), no: n('gt', '1.000.000') }, getValue),
    ).toBe(true);
    expect(
      matchAllFilters(row, { ten: t('contains', 'g-life'), no: n('lt', '1.000.000') }, getValue),
    ).toBe(false);
  });

  it('(Trống) trên cột số bằng 0', () => {
    expect(matchAllFilters(row, { co: n('blank') }, getValue)).toBe(true);
    expect(matchAllFilters(row, { co: n('notBlank') }, getValue)).toBe(false);
  });
});
