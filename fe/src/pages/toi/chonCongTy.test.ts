import { describe, it, expect } from 'vitest';
import { chonCongTy } from './chonCongTy';
import { TenantChamCong } from '@/services/identitySession';

const A: TenantChamCong = { tenantId: 't1', tenantName: 'Công ty A' };
const B: TenantChamCong = { tenantId: 't2', tenantName: 'Công ty B' };

describe('chonCongTy', () => {
  it('không công ty nào → khong_co', () => {
    expect(chonCongTy([], null)).toEqual({ loai: 'khong_co' });
  });

  it('đúng một công ty → chọn luôn', () => {
    expect(chonCongTy([A], null)).toEqual({ loai: 'da_chon', tenantId: 't1' });
  });

  /**
   * Chỉ có một công ty thì không có gì để chọn — giá trị đã nhớ (kể cả khi nó
   * trỏ đi đâu đó khác) không được phép làm lệch.
   */
  it('đúng một công ty thì bỏ qua cả giá trị đã nhớ', () => {
    expect(chonCongTy([A], 't2')).toEqual({ loai: 'da_chon', tenantId: 't1' });
  });

  it('nhiều công ty + đã nhớ và còn hợp lệ → dùng công ty đã nhớ', () => {
    expect(chonCongTy([A, B], 't2')).toEqual({ loai: 'da_chon', tenantId: 't2' });
  });

  /**
   * Có thật: nhân viên nghỉ việc ở công ty cũ, hoặc công ty bị gỡ quyền dùng
   * app. Không đối chiếu lại thì màn hình sẽ gọi /api/refresh với một tenantId
   * chết và hỏng ở một chỗ khó truy.
   */
  it('nhiều công ty + đã nhớ nhưng không còn trong danh sách → phải hỏi lại', () => {
    expect(chonCongTy([A, B], 't-cu')).toEqual({ loai: 'phai_hoi', danhSach: [A, B] });
  });

  it('nhiều công ty + chưa nhớ gì → phải hỏi', () => {
    expect(chonCongTy([A, B], null)).toEqual({ loai: 'phai_hoi', danhSach: [A, B] });
  });
});
