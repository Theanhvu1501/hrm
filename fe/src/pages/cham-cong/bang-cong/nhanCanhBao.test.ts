import { nhanCanhBao, moTaCanhBao } from './nhanCanhBao';

describe('nhanCanhBao', () => {
  it('dịch đủ 4 mã cảnh báo backend ghi', () => {
    ['thieu_gio_ra', 'don_va_cham_cong', 'ngoai_vung', 'chua_xu_ly'].forEach((ma) => {
      expect(nhanCanhBao(ma)).not.toBe(ma);
    });
  });

  it('mã lạ thì trả nguyên chuỗi, không vỡ giao diện', () => {
    expect(nhanCanhBao('ma_moi_toanh')).toBe('ma_moi_toanh');
  });

  // Việc 1, review toàn nhánh P4.5: BE bắt đầu gắn mã này vào ô (xem
  // suy-ky-hieu.ts MA_CANH_BAO.LAM_NGOAI_LICH_TUAN) nhưng file này chưa từng
  // được cập nhật — thiếu nhãn thì `nhanCanhBao()` rơi về nhánh "mã lạ" và
  // tooltip hiện thẳng chuỗi kỹ thuật `lam_ngoai_lich_tuan` cho HR đọc.
  it('dịch mã lam_ngoai_lich_tuan (P4.5)', () => {
    expect(nhanCanhBao('lam_ngoai_lich_tuan')).not.toBe('lam_ngoai_lich_tuan');
  });
});

describe('moTaCanhBao', () => {
  it('rỗng thì trả chuỗi rỗng', () => {
    expect(moTaCanhBao()).toBe('');
    expect(moTaCanhBao([])).toBe('');
  });

  it('nối nhiều cảnh báo bằng dấu chấm phẩy', () => {
    const mo = moTaCanhBao(['thieu_gio_ra', 'ngoai_vung']);
    expect(mo).toContain(';');
    expect(mo).toContain(nhanCanhBao('thieu_gio_ra'));
    expect(mo).toContain(nhanCanhBao('ngoai_vung'));
  });
});
