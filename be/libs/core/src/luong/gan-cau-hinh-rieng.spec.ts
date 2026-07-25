import { ganCauHinhRieng } from './gan-cau-hinh-rieng';
import { CauHinhLuongData } from '@app/entities';

function cauHinh(): CauHinhLuongData {
  return {
    mucKhaiBaoMacDinh: 5_500_000,
    congChuan: 24,
    khoanLuong: [],
    giamTruBanThan: 15_500_000,
    giamTruNPT: 6_200_000,
    bhxh: { tyLe: 0.105, canCu: 'MUC_KHAI_BAO' },
    bacThue: [{ den: null, suat: 0.1 }],
    thuViec: { tyLe: 0.85 },
    quyTacThoiVu: { tyLe: 0.1, nguong: 2_000_000 },
    quyTacCamKet: { mienThue: true },
    bhCongTy: { tyLe: 0.215, tyLeHopDongThu2: 0.005 },
    lamTron: 1000,
  };
}

describe('ganCauHinhRieng', () => {
  it('không có override → giữ nguyên mọi giá trị', () => {
    const ch = cauHinh();
    expect(ganCauHinhRieng(ch, undefined)).toEqual(ch);
    expect(ganCauHinhRieng(ch, {})).toEqual(ch);
  });

  it('override từng trường một — chỉ trường đó đổi', () => {
    const ch = cauHinh();
    expect(ganCauHinhRieng(ch, { congChuan: 26 })).toEqual({
      ...ch,
      congChuan: 26,
    });
    expect(ganCauHinhRieng(ch, { thuViecTyLe: 0.9 })).toEqual({
      ...ch,
      thuViec: { tyLe: 0.9 },
    });
    expect(ganCauHinhRieng(ch, { bhxhTyLe: 0.095 })).toEqual({
      ...ch,
      bhxh: { tyLe: 0.095, canCu: 'MUC_KHAI_BAO' },
    });
    expect(ganCauHinhRieng(ch, { bhxhCanCu: 'LUONG_THOA_THUAN' })).toEqual({
      ...ch,
      bhxh: { tyLe: 0.105, canCu: 'LUONG_THOA_THUAN' },
    });
  });

  it('override nhiều trường cùng lúc', () => {
    const r = ganCauHinhRieng(cauHinh(), {
      congChuan: 26,
      thuViecTyLe: 0.9,
      bhxhTyLe: 0,
      bhxhCanCu: 'LUONG_THOA_THUAN',
    });
    expect(r.congChuan).toBe(26);
    expect(r.thuViec.tyLe).toBe(0.9);
    expect(r.bhxh).toEqual({ tyLe: 0, canCu: 'LUONG_THOA_THUAN' });
  });

  it('tỷ lệ 0 là HỢP LỆ — không bị `||` nuốt thành mặc định', () => {
    const r = ganCauHinhRieng(cauHinh(), { thuViecTyLe: 0, bhxhTyLe: 0 });
    expect(r.thuViec.tyLe).toBe(0);
    expect(r.bhxh.tyLe).toBe(0);
  });

  it('giá trị vô lý → bỏ qua, rơi về cấu hình chung', () => {
    const ch = cauHinh();
    expect(ganCauHinhRieng(ch, { congChuan: 0 }).congChuan).toBe(24);
    expect(ganCauHinhRieng(ch, { congChuan: -5 }).congChuan).toBe(24);
    expect(ganCauHinhRieng(ch, { congChuan: NaN }).congChuan).toBe(24);
    expect(ganCauHinhRieng(ch, { thuViecTyLe: 1.5 }).thuViec.tyLe).toBe(0.85);
    expect(ganCauHinhRieng(ch, { thuViecTyLe: -0.1 }).thuViec.tyLe).toBe(0.85);
    expect(ganCauHinhRieng(ch, { bhxhTyLe: 90 }).bhxh.tyLe).toBe(0.105);
    expect(
      ganCauHinhRieng(ch, { bhxhCanCu: 'LUNG_TUNG' as never }).bhxh.canCu,
    ).toBe('MUC_KHAI_BAO');
  });

  it('không mutate cấu hình gốc', () => {
    const ch = cauHinh();
    const goc = JSON.parse(JSON.stringify(ch));
    ganCauHinhRieng(ch, { congChuan: 26, thuViecTyLe: 0.9, bhxhTyLe: 0.2 });
    expect(ch).toEqual(goc);
  });
});
