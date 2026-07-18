import { describe, it, expect } from 'vitest';
import { tableTermKey, extractColTitles, lookupOverride } from './tableTitleConfig';

describe('tableTitleConfig', () => {
  it('tableTermKey', () => {
    expect(tableTermKey('danhMuc.boPhan', 'ten')).toBe('tbl:danhMuc.boPhan:ten');
  });

  it('extractColTitles chỉ lấy cột title chuỗi + có key/dataIndex', () => {
    const cols = [
      { title: 'Tên bộ phận', dataIndex: 'ten' },
      { title: 'Mã', key: 'ma' },
      { title: <span>JSX</span>, key: 'x' }, // bỏ (title không chuỗi)
      { title: 'Thao tác' },                  // bỏ (không key/dataIndex)
      { title: '   ', key: 'blank' },         // bỏ (rỗng)
    ];
    expect(extractColTitles(cols as never)).toEqual([
      { colKey: 'ten', def: 'Tên bộ phận' },
      { colKey: 'ma', def: 'Mã' },
    ]);
  });

  it('lookupOverride: tenant thắng nganh, label cho không-surface', () => {
    const tenant = { 'tbl:p:ten': { label: 'KH' } };
    const nganh = { 'tbl:p:ten': { label: 'Khách' }, 'tbl:p:ma': { label: 'Mã KH' } };
    expect(lookupOverride(tenant, nganh, 'tbl:p:ten')).toBe('KH');
    expect(lookupOverride(undefined, nganh, 'tbl:p:ma')).toBe('Mã KH');
    expect(lookupOverride(undefined, undefined, 'tbl:p:none')).toBeUndefined();
  });
});
