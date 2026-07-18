import { buildCongNoReport } from './cong-no-tong-hop.helper';
import { AccountInfo, DtAggInput } from './cong-no-tong-hop.types';

const ACC: AccountInfo[] = [
  { ma: '1311', ten: 'Phải thu KH', loai: 'NO', chiTietTheo: 'KHACH_HANG' },
  { ma: '331', ten: 'Phải trả NCC', loai: 'CO', chiTietTheo: 'NHA_CUNG_CAP' },
  { ma: '1121', ten: 'Tiền gửi NH', loai: 'NO', chiTietTheo: 'NGAN_HANG_QUY' },
];

const agg = (
  ma: string,
  dt: string,
  loai: string,
  p: Partial<DtAggInput> = {},
): DtAggInput => ({
  ma,
  doiTuongMa: dt,
  doiTuongTen: dt,
  doiTuongLoai: loai,
  priorNo: 0,
  priorCo: 0,
  periodNo: 0,
  periodCo: 0,
  ...p,
});

describe('buildCongNoReport', () => {
  it('map Nợ→Phải thu, Có→Phải trả cho TK loại NO (131)', () => {
    const dt = [agg('1311', 'KH01', 'KHACH_HANG', { priorNo: 100, periodNo: 50 })];
    const r = buildCongNoReport(ACC, dt, [], {});
    const acc = r.accounts.find((a) => a.ma === '1311')!;
    const row = acc.doiTuongs[0];
    expect(row.dauKy).toEqual({ phaiThu: 100, phaiTra: 0 });
    expect(row.phatSinh).toEqual({ phaiThu: 50, phaiTra: 0 });
    expect(row.cuoiKy).toEqual({ phaiThu: 150, phaiTra: 0 });
  });

  it('KHÔNG bù trừ giữa đối tượng: 1 TK có cả Phải thu và Phải trả', () => {
    const dt = [
      agg('1311', 'KH01', 'KHACH_HANG', { periodNo: 200 }),
      agg('1311', 'KH02', 'KHACH_HANG', { periodCo: 80 }),
    ];
    const r = buildCongNoReport(ACC, dt, [], {});
    const acc = r.accounts.find((a) => a.ma === '1311')!;
    expect(acc.cuoiKy.phaiThu).toBe(200);
    expect(acc.cuoiKy.phaiTra).toBe(80);
  });

  it('totals = Σ accounts; subtotal = Σ doiTuongs', () => {
    const dt = [
      agg('1311', 'KH01', 'KHACH_HANG', { periodNo: 200 }),
      agg('331', 'NCC1', 'NHA_CUNG_CAP', { periodCo: 300 }),
    ];
    const r = buildCongNoReport(ACC, dt, [], {});
    expect(r.totals.phatSinh.phaiThu).toBe(200);
    expect(r.totals.phatSinh.phaiTra).toBe(300);
  });

  it('bỏ TK không phải công nợ (NGAN_HANG_QUY)', () => {
    const dt = [agg('1121', 'VCB', 'NGAN_HANG_QUY', { periodNo: 999 })];
    const r = buildCongNoReport(ACC, dt, [], {});
    expect(r.accounts.find((a) => a.ma === '1121')).toBeUndefined();
  });

  it('lọc maTaiKhoan và maDoiTuong', () => {
    const dt = [
      agg('1311', 'KH01', 'KHACH_HANG', { periodNo: 200 }),
      agg('1311', 'KH02', 'KHACH_HANG', { periodNo: 50 }),
      agg('331', 'NCC1', 'NHA_CUNG_CAP', { periodCo: 300 }),
    ];
    const byAcc = buildCongNoReport(ACC, dt, [], { maTaiKhoan: '1311' });
    expect(byAcc.accounts.map((a) => a.ma)).toEqual(['1311']);
    const byDt = buildCongNoReport(ACC, dt, [], {
      maTaiKhoan: '1311',
      maDoiTuong: 'KH01',
    });
    expect(byDt.accounts[0].doiTuongs.map((d) => d.ma)).toEqual(['KH01']);
  });
});
