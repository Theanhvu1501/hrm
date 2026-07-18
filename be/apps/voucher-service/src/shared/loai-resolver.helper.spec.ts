import type { DanhMuc, PhanLoaiChungTu } from '@app/entities';
import {
  resolveLoaiFromConfig,
  resolveLoaiInfoFromConfig,
  PHAN_LOAI_TO_LOAI,
} from './loai-resolver.helper';

describe('resolveLoaiFromConfig', () => {
  // Cấu hình mẫu sát dữ liệu MASTER CEO
  const lgdToLct = new Map<string, string>([
    ['TANG_TM', 'THU_TM'],
    ['TANG_NH', 'THU_NH'],
    ['GIAM_TM', 'CHI_TM'],
    ['GIAM_NH', 'CHI_NH'],
    ['MUA_HANG', 'CHI_MUA_HANG'],
    ['BAN_HANG', 'BAN_HANG_NKC'],
  ]);
  const lctToPhanLoai = new Map<string, PhanLoaiChungTu>([
    ['THU_TM', 'THU'],
    ['THU_NH', 'THU'],
    ['CHI_TM', 'CHI'],
    ['CHI_NH', 'CHI'],
    ['CHI_MUA_HANG', 'KHAC'], // mua chịu → nhật ký chung
    ['BAN_HANG_NKC', 'KHAC'],
  ]);

  const dm = (lgdMa?: string): DanhMuc =>
    (lgdMa ? { loaiGiaoDich: { ma: lgdMa, ten: lgdMa } } : {}) as DanhMuc;

  it('THU: tăng tiền → PHIEU_THU', () => {
    expect(resolveLoaiFromConfig(dm('TANG_TM'), 'KHAC', lgdToLct, lctToPhanLoai)).toBe('PHIEU_THU');
    expect(resolveLoaiFromConfig(dm('TANG_NH'), 'KHAC', lgdToLct, lctToPhanLoai)).toBe('PHIEU_THU');
  });

  it('CHI: giảm tiền → PHIEU_CHI', () => {
    expect(resolveLoaiFromConfig(dm('GIAM_TM'), 'KHAC', lgdToLct, lctToPhanLoai)).toBe('PHIEU_CHI');
    expect(resolveLoaiFromConfig(dm('GIAM_NH'), 'KHAC', lgdToLct, lctToPhanLoai)).toBe('PHIEU_CHI');
  });

  it('KHAC: mua/bán chịu → KHAC (chỉ nhật ký chung)', () => {
    expect(resolveLoaiFromConfig(dm('MUA_HANG'), 'PHIEU_THU', lgdToLct, lctToPhanLoai)).toBe('KHAC');
    expect(resolveLoaiFromConfig(dm('BAN_HANG'), 'PHIEU_THU', lgdToLct, lctToPhanLoai)).toBe('KHAC');
  });

  it('fallback khi không có loại giao dịch', () => {
    expect(resolveLoaiFromConfig(dm(), 'PHIEU_THU', lgdToLct, lctToPhanLoai)).toBe('PHIEU_THU');
    expect(resolveLoaiFromConfig(undefined, 'PHIEU_CHI', lgdToLct, lctToPhanLoai)).toBe('PHIEU_CHI');
  });

  it('fallback khi loại giao dịch chưa liên kết loại chứng từ', () => {
    expect(resolveLoaiFromConfig(dm('CHUA_CAU_HINH'), 'PHIEU_THU', lgdToLct, lctToPhanLoai)).toBe('PHIEU_THU');
  });

  it('fallback khi loại chứng từ không tồn tại/không có phân loại', () => {
    const lgd = new Map([['X', 'LCT_MO_COI']]);
    expect(resolveLoaiFromConfig(dm('X'), 'PHIEU_CHI', lgd, lctToPhanLoai)).toBe('PHIEU_CHI');
  });

  it('map phân loại đầy đủ 3 nhánh', () => {
    expect(PHAN_LOAI_TO_LOAI).toEqual({ THU: 'PHIEU_THU', CHI: 'PHIEU_CHI', KHAC: 'KHAC' });
  });

  describe('resolveLoaiInfoFromConfig (kèm mã loại chứng từ làm tiền tố)', () => {
    it('trả mã loại chứng từ + loai khi đủ cấu hình', () => {
      expect(
        resolveLoaiInfoFromConfig(dm('BAN_HANG'), 'PHIEU_THU', lgdToLct, lctToPhanLoai),
      ).toEqual({ loai: 'KHAC', maLoaiChungTu: 'BAN_HANG_NKC' });
      expect(
        resolveLoaiInfoFromConfig(dm('TANG_TM'), 'KHAC', lgdToLct, lctToPhanLoai),
      ).toEqual({ loai: 'PHIEU_THU', maLoaiChungTu: 'THU_TM' });
    });

    it('không có loại giao dịch → chỉ trả loai fallback, không mã', () => {
      expect(
        resolveLoaiInfoFromConfig(dm(), 'PHIEU_CHI', lgdToLct, lctToPhanLoai),
      ).toEqual({ loai: 'PHIEU_CHI' });
    });

    it('loại giao dịch chưa liên kết loại chứng từ → không mã', () => {
      expect(
        resolveLoaiInfoFromConfig(dm('CHUA_CAU_HINH'), 'PHIEU_THU', lgdToLct, lctToPhanLoai),
      ).toEqual({ loai: 'PHIEU_THU' });
    });

    it('có mã nhưng loại chứng từ thiếu phân loại → vẫn trả mã, loai fallback', () => {
      const lgd = new Map([['X', 'LCT_MO_COI']]);
      expect(
        resolveLoaiInfoFromConfig(dm('X'), 'PHIEU_CHI', lgd, lctToPhanLoai),
      ).toEqual({ loai: 'PHIEU_CHI', maLoaiChungTu: 'LCT_MO_COI' });
    });
  });

  it('oracle MASTER CEO: phân loại 6 loại giao dịch', () => {
    const classify = (lgdMa: string) =>
      resolveLoaiFromConfig(dm(lgdMa), 'PHIEU_THU', lgdToLct, lctToPhanLoai);
    expect(['TANG_TM', 'TANG_NH'].map(classify)).toEqual(['PHIEU_THU', 'PHIEU_THU']);
    expect(['GIAM_TM', 'GIAM_NH'].map(classify)).toEqual(['PHIEU_CHI', 'PHIEU_CHI']);
    expect(['MUA_HANG', 'BAN_HANG'].map(classify)).toEqual(['KHAC', 'KHAC']);
  });
});
