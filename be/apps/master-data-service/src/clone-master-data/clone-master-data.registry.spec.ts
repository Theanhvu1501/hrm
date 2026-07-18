import { CLONE_CATEGORIES } from './clone-master-data.registry';

const byKey = (k: string) => CLONE_CATEGORIES.find((c) => c.key === k)!;

describe('CLONE_CATEGORIES', () => {
  it('có đủ 7 danh mục đúng thứ tự, ho-so-chung-tu trước quy-chuan', () => {
    expect(CLONE_CATEGORIES.map((c) => c.key)).toEqual([
      'tai-khoan', 'ho-so-chung-tu', 'khoan-muc', 'nhom-khoan-muc',
      'loai-chung-tu', 'loai-giao-dich', 'quy-chuan',
    ]);
  });

  it('dedupKey tai-khoan theo ma', () => {
    expect(byKey('tai-khoan').dedupKey({ ma: '112' })).toBe('112');
  });

  it('dedupKey quy-chuan ghép 4 trường', () => {
    const k = byKey('quy-chuan').dedupKey({
      loaiGiaoDich: 'PHIEU_THU', nghiepVu: 'A', taiKhoanNo: '111', taiKhoanCo: '511',
    });
    expect(k).toBe('PHIEU_THU|A|111|511');
  });

  it('remap tai-khoan đổi parentId theo idMap', () => {
    const doc: any = { ma: '1121', parentId: 'OLD' };
    const idMaps = { 'tai-khoan': new Map([['OLD', 'NEW']]) };
    byKey('tai-khoan').remap!(doc, idMaps);
    expect(doc.parentId).toBe('NEW');
  });

  it('remap quy-chuan đổi hoSoChungTu[].id theo idMap, giữ ma/ten', () => {
    const doc: any = { hoSoChungTu: [{ id: 'H1', ma: '02', ten: 'Phiếu chi' }] };
    const idMaps = { 'ho-so-chung-tu': new Map([['H1', 'H1new']]) };
    byKey('quy-chuan').remap!(doc, idMaps);
    expect(doc.hoSoChungTu).toEqual([{ id: 'H1new', ma: '02', ten: 'Phiếu chi' }]);
  });
});
