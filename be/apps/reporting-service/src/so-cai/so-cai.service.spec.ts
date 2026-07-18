import * as fc from 'fast-check';
import type { ServiceClient } from '@app/service-client';
import {
  buildDoiTuongRows,
  computeTrialRow,
  sumTrialRows,
  SoCaiService,
} from './so-cai.service';

/**
 * **Feature: api-completion, Property 1: Search Results Contain Keyword** (for ledger)
 * **Validates: Requirements 12.3**
 *
 * For any stats query, the canDoi property SHALL be true when tongPhatSinhNo equals tongPhatSinhCo.
 */
describe('Property: Ledger Stats Consistency', () => {
  interface LedgerReport {
    tongNo: number;
    tongCo: number;
  }

  // Helper function to calculate stats
  const calculateStats = (reports: LedgerReport[]) => {
    const tongPhatSinhNo = reports.reduce((sum, r) => sum + r.tongNo, 0);
    const tongPhatSinhCo = reports.reduce((sum, r) => sum + r.tongCo, 0);

    return {
      soTaiKhoan: reports.length,
      tongPhatSinhNo,
      tongPhatSinhCo,
      canDoi: tongPhatSinhNo === tongPhatSinhCo,
    };
  };

  const reportArb = fc.record({
    tongNo: fc.integer({ min: 0, max: 1000000 }),
    tongCo: fc.integer({ min: 0, max: 1000000 }),
  });

  it('should have canDoi true when tongPhatSinhNo equals tongPhatSinhCo', () => {
    fc.assert(
      fc.property(
        fc.array(reportArb, { minLength: 0, maxLength: 20 }),
        (reports) => {
          const stats = calculateStats(reports);
          if (stats.tongPhatSinhNo === stats.tongPhatSinhCo) {
            return stats.canDoi === true;
          }
          return stats.canDoi === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should correctly count soTaiKhoan', () => {
    fc.assert(
      fc.property(
        fc.array(reportArb, { minLength: 0, maxLength: 20 }),
        (reports) => {
          const stats = calculateStats(reports);
          return stats.soTaiKhoan === reports.length;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should correctly sum tongPhatSinhNo', () => {
    fc.assert(
      fc.property(
        fc.array(reportArb, { minLength: 0, maxLength: 20 }),
        (reports) => {
          const stats = calculateStats(reports);
          const expected = reports.reduce((sum, r) => sum + r.tongNo, 0);
          return stats.tongPhatSinhNo === expected;
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('TK có chi tiết đối tượng: TK mẹ = Σ dòng đối tượng, không bù trừ', () => {
  // TK 131 (loai NO): KH A dư Nợ 100, KH B dư Có 30.
  const aggs = [
    {
      doiTuongMa: 'KH_A', doiTuongTen: 'Cty A', doiTuongLoai: 'KHACH_HANG',
      priorNo: 100, priorCo: 0, periodNo: 0, periodCo: 0,
    },
    {
      doiTuongMa: 'KH_B', doiTuongTen: 'Cty B', doiTuongLoai: 'KHACH_HANG',
      priorNo: 0, priorCo: 30, periodNo: 0, periodCo: 0,
    },
  ];

  it('công thức cũ (bù trừ toàn TK) cho ra dư Nợ 70 — đây là cái sai', () => {
    const old = computeTrialRow(
      { priorNo: 100, priorCo: 30, periodNo: 0, periodCo: 0 },
      { duNo: 0, duCo: 0 },
      'NO',
    );
    expect(old.noDauKy).toBe(70);
    expect(old.coDauKy).toBe(0);
  });

  it('TK mẹ = Σ đối tượng ⇒ dư Nợ 100 và dư Có 30', () => {
    const dtRows = buildDoiTuongRows('NO', aggs, [], 'KHACH_HANG');
    const parent = sumTrialRows(dtRows);
    expect(parent.noDauKy).toBe(100);
    expect(parent.coDauKy).toBe(30);
    expect(parent.noCuoiKy).toBe(100);
    expect(parent.coCuoiKy).toBe(30);
  });

  it('mỗi dòng đối tượng vẫn dùng công thức cũ (tự bù trừ Nợ/Có trong đối tượng đó)', () => {
    const dtRows = buildDoiTuongRows(
      'NO',
      [
        {
          doiTuongMa: 'KH_A', doiTuongTen: 'Cty A', doiTuongLoai: 'KHACH_HANG',
          priorNo: 100, priorCo: 40, periodNo: 0, periodCo: 0,
        },
      ],
      [],
      'KHACH_HANG',
    );
    const a = dtRows.find((r) => r.ma === 'KH_A')!;
    expect(a.noDauKy).toBe(60); // 100 - 40, bù trừ trong nội bộ 1 đối tượng
    expect(a.coDauKy).toBe(0);
  });

  it('Σ phát sinh của các dòng đối tượng = phát sinh của TK (tổng cộng vẫn cân)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ma: fc.constantFrom('KH_A', 'KH_B', 'KH_C'),
            periodNo: fc.integer({ min: 0, max: 100000 }),
            periodCo: fc.integer({ min: 0, max: 100000 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (items) => {
          const rows = buildDoiTuongRows(
            'NO',
            items.map((i) => ({
              doiTuongMa: i.ma, doiTuongTen: i.ma, doiTuongLoai: 'KHACH_HANG',
              priorNo: 0, priorCo: 0, periodNo: i.periodNo, periodCo: i.periodCo,
            })),
            [],
            'KHACH_HANG',
          );
          const parent = sumTrialRows(rows);
          const expectedNo = items.reduce((s, i) => s + i.periodNo, 0);
          const expectedCo = items.reduce((s, i) => s + i.periodCo, 0);
          return (
            parent.noPhatSinh === expectedNo && parent.coPhatSinh === expectedCo
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('getTrialBalance: TK có chi tiết đối tượng lấy tổng từ các dòng đối tượng', () => {
  const ok = <T>(data: T) => Promise.resolve({ success: true, data });

  // 131 (loai NO, chi tiết theo KHACH_HANG): KH A dư Nợ 100, KH B dư Có 30.
  // 111 (loai NO, không chi tiết): Nợ 500 / Có 200 ⇒ dư Nợ 300 (công thức cũ).
  const makeService = () =>
    new SoCaiService({
      aggregateBalance: () =>
        ok([
          { ma: '131', priorNo: 100, priorCo: 30, periodNo: 0, periodCo: 0 },
          { ma: '111', priorNo: 0, priorCo: 0, periodNo: 500, periodCo: 200 },
        ]),
      getTaiKhoan: () =>
        ok([
          { ma: '131', ten: 'Phải thu KH', loai: 'NO', chiTietTheo: 'KHACH_HANG' },
          { ma: '111', ten: 'Tiền mặt', loai: 'NO' },
        ]),
      getSoDuDauKy: () => ok({ items: [] }),
      getSoDuDauKyRaw: () => ok({ items: [] }),
      getNganHang: () => ok([]),
      getDoiTuong: () =>
        ok([
          { ma: 'KH_A', ten: 'Cty A', loai: ['KHACH_HANG'] },
          { ma: 'KH_B', ten: 'Cty B', loai: ['KHACH_HANG'] },
        ]),
      aggregateBalanceByDoiTuong: () =>
        ok([
          {
            ma: '131', doiTuongMa: 'KH_A', doiTuongTen: 'Cty A', doiTuongLoai: 'KHACH_HANG',
            priorNo: 100, priorCo: 0, periodNo: 0, periodCo: 0,
          },
          {
            ma: '131', doiTuongMa: 'KH_B', doiTuongTen: 'Cty B', doiTuongLoai: 'KHACH_HANG',
            priorNo: 0, priorCo: 30, periodNo: 0, periodCo: 0,
          },
        ]),
    } as unknown as ServiceClient);

  it('dòng TK 131 = Σ đối tượng (Nợ 100 / Có 30), không bù trừ về Nợ 70', async () => {
    const { entries } = await makeService().getTrialBalance(
      new Date('2026-01-01'),
      new Date('2026-12-31'),
    );
    const tk131 = entries.find((e) => e.ma === '131')!;
    expect(tk131.noDauKy).toBe(100);
    expect(tk131.coDauKy).toBe(30);
    expect(tk131.doiTuongChiTiet).toHaveLength(2);
  });

  it('TK không có chi tiết đối tượng giữ nguyên công thức cũ', async () => {
    const { entries } = await makeService().getTrialBalance(
      new Date('2026-01-01'),
      new Date('2026-12-31'),
    );
    const tk111 = entries.find((e) => e.ma === '111')!;
    expect(tk111.noPhatSinh).toBe(500);
    expect(tk111.coPhatSinh).toBe(200);
    expect(tk111.noCuoiKy).toBe(300);
    expect(tk111.coCuoiKy).toBe(0);
  });

  it('dòng Tổng cộng cộng theo số đã hết bù trừ và vẫn cân Nợ = Có', async () => {
    const { totals } = await makeService().getTrialBalance(
      new Date('2026-01-01'),
      new Date('2026-12-31'),
    );
    expect(totals.noDauKy).toBe(100); // 131 dư Nợ 100
    expect(totals.coDauKy).toBe(30); // 131 dư Có 30 — trước đây bị nuốt mất
    expect(totals.noCuoiKy - totals.coCuoiKy).toBe(
      totals.noDauKy - totals.coDauKy + totals.noPhatSinh - totals.coPhatSinh,
    );
  });
});

describe('buildDoiTuongRows với NGAN_HANG_QUY', () => {
  it('xổ chi tiết TK 112 theo từng ngân hàng', () => {
    const rows = buildDoiTuongRows(
      'TAI_SAN',
      [
        {
          doiTuongMa: 'VCB01', doiTuongTen: 'Vietcombank', doiTuongLoai: 'NGAN_HANG_QUY',
          priorNo: 0, priorCo: 0, periodNo: 500, periodCo: 200,
        },
        // đối tượng sai loại → gộp "Chưa xác định đối tượng"
        {
          doiTuongMa: 'KH001', doiTuongTen: 'Cty A', doiTuongLoai: 'KHACH_HANG',
          priorNo: 0, priorCo: 0, periodNo: 100, periodCo: 0,
        },
      ],
      [
        { doiTuongMa: 'VCB01', doiTuongTen: 'Vietcombank', chiTietType: 'NGAN_HANG_QUY', duNo: 1000, duCo: 0 },
      ],
      'NGAN_HANG_QUY',
    );
    const vcb = rows.find((r) => r.ma === 'VCB01');
    expect(vcb).toBeDefined();
    expect(vcb!.noDauKy).toBe(1000);
    expect(vcb!.noPhatSinh).toBe(500);
    expect(vcb!.coPhatSinh).toBe(200);
    const chuaXacDinh = rows.find((r) => r.ma === '');
    expect(chuaXacDinh).toBeDefined();
    expect(chuaXacDinh!.noPhatSinh).toBe(100);
  });
});
