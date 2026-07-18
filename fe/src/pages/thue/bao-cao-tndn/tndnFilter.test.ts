import { describe, it, expect } from 'vitest';
import { filterTndnRows, type TndnFilterRow } from './tndnFilter';

const rows: TndnFilterRow[] = [
  { kind: 'calc', label: 'Doanh thu thuần bán hàng', note: 'Có TK 511' },
  { kind: 'calc', label: 'Giá vốn hàng bán', note: 'Nợ TK 632' },
  { kind: 'calc', label: 'Lợi nhuận kế toán trước thuế' },
  { kind: 'section', label: 'Các khoản chi phí không được trừ' },
  { kind: 'input', label: 'Chi phí dịch vụ, hàng hóa mua vào' },
  { kind: 'input', label: 'Chi phí nhân công, bảo hiểm' },
  { kind: 'section', label: 'Nghĩa vụ ngân sách khác (nhập tay)' },
  { kind: 'input', label: 'Thuế TNCN phải nộp' },
  { kind: 'input', label: 'Bảo hiểm xã hội (3383)' },
];

const labels = (rs: TndnFilterRow[]) => rs.map((r) => r.label);

describe('filterTndnRows', () => {
  it('không có bộ lọc → giữ nguyên mảng gốc', () => {
    expect(filterTndnRows(rows, {})).toBe(rows);
    expect(filterTndnRows(rows, { label: { kind: 'text', op: 'contains', value: '  ' } })).toBe(rows);
  });

  it('lọc Chỉ tiêu: bỏ dấu, không phân biệt hoa thường', () => {
    const out = filterTndnRows(rows, { label: { kind: 'text', op: 'contains', value: 'CHI PHI' } });
    expect(labels(out)).toEqual([
      'Các khoản chi phí không được trừ',
      'Chi phí dịch vụ, hàng hóa mua vào',
      'Chi phí nhân công, bảo hiểm',
    ]);
  });

  it('dòng nhóm chỉ hiện khi trong nhóm còn dòng dữ liệu', () => {
    const out = filterTndnRows(rows, { label: { kind: 'text', op: 'contains', value: 'bao hiem' } });
    // "Bảo hiểm xã hội" nằm trong nhóm 2; "Chi phí nhân công, bảo hiểm" nằm trong nhóm 1
    expect(labels(out)).toEqual([
      'Các khoản chi phí không được trừ',
      'Chi phí nhân công, bảo hiểm',
      'Nghĩa vụ ngân sách khác (nhập tay)',
      'Bảo hiểm xã hội (3383)',
    ]);
  });

  it('không dòng nào trong nhóm khớp → không để lại dòng tiêu đề nhóm trơ trọi', () => {
    const out = filterTndnRows(rows, { label: { kind: 'text', op: 'contains', value: 'doanh thu' } });
    expect(labels(out)).toEqual(['Doanh thu thuần bán hàng']);
  });

  it('lọc cả cột Ghi chú, nhiều bộ lọc là AND', () => {
    const out = filterTndnRows(rows, {
      label: { kind: 'text', op: 'contains', value: 'hàng' },
      note: { kind: 'text', op: 'contains', value: 'tk 632' },
    });
    expect(labels(out)).toEqual(['Giá vốn hàng bán']);
  });

  it('ô Ghi chú rỗng chỉ khớp "Không chứa"', () => {
    const out = filterTndnRows(rows, { note: { kind: 'text', op: 'notContains', value: 'TK' } });
    // các dòng có note đều chứa "TK" → chỉ còn dòng không có note (dòng nhóm bị bỏ vì rỗng nhóm)
    expect(labels(out)).toEqual([
      'Lợi nhuận kế toán trước thuế',
      'Các khoản chi phí không được trừ',
      'Chi phí dịch vụ, hàng hóa mua vào',
      'Chi phí nhân công, bảo hiểm',
      'Nghĩa vụ ngân sách khác (nhập tay)',
      'Thuế TNCN phải nộp',
      'Bảo hiểm xã hội (3383)',
    ]);
  });

  it('không còn dòng nào → mảng rỗng', () => {
    expect(filterTndnRows(rows, { label: { kind: 'text', op: 'equals', value: 'xyz' } })).toEqual([]);
  });
});
