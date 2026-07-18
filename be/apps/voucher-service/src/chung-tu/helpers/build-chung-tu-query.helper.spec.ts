import { buildChungTuMongoQuery } from './build-chung-tu-query.helper';

describe('buildChungTuMongoQuery', () => {
  it('always filters by entity-level loai', () => {
    const q = buildChungTuMongoQuery('PHIEU_THU', {});
    expect(q.loai).toBe('PHIEU_THU');
  });

  it('builds date range on ngay with day boundaries', () => {
    const q = buildChungTuMongoQuery('PHIEU_CHI', {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    }) as { ngay: { $gte: Date; $lte: Date } };
    expect(q.ngay.$gte.getHours()).toBe(0);
    expect(q.ngay.$gte.getMinutes()).toBe(0);
    expect(q.ngay.$gte.getSeconds()).toBe(0);
    expect(q.ngay.$gte.getMilliseconds()).toBe(0);
    expect(q.ngay.$lte.getHours()).toBe(23);
    expect(q.ngay.$lte.getMinutes()).toBe(59);
    expect(q.ngay.$lte.getSeconds()).toBe(59);
    expect(q.ngay.$lte.getMilliseconds()).toBe(999);
  });

  it('maps boPhan, taiKhoanNo and taiKhoanCo filters', () => {
    const q = buildChungTuMongoQuery('PHIEU_THU', {
      boPhan: 'BP1',
      taiKhoanNo: '111',
      taiKhoanCo: '511',
    }) as Record<string, unknown>;
    expect(q['danhMuc.boPhan.ma']).toBe('BP1');
    expect(q['danhMuc.taiKhoanNo.ma']).toBe('111');
    expect(q['danhMuc.taiKhoanCo.ma']).toBe('511');
  });

  it('maps danhMuc filters and search $or', () => {
    const q = buildChungTuMongoQuery('PHIEU_THU', {
      doiTuong: 'KH01',
      duAn: 'DA1',
      search: 'tien',
    }) as Record<string, unknown>;
    expect(q['danhMuc.doiTuong.ma']).toBe('KH01');
    expect(q['danhMuc.duAn.ma']).toBe('DA1');
    expect(Array.isArray(q.$or)).toBe(true);
  });
});
