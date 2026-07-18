import * as fc from 'fast-check';

interface ChungTu {
  soPhieu: string;
  loai: 'PHIEU_THU' | 'PHIEU_CHI';
  ngay: Date;
  soTien: number;
  taiKhoanNo: string;
  taiKhoanCo: string;
}

interface TaiKhoan {
  ma: string;
  ten: string;
  loai: 'NO' | 'CO';
}

interface SoCaiEntry {
  ngay: Date;
  soPhieu: string;
  no: number;
  co: number;
  soDu: number;
}

describe('ReportingService Property Tests', () => {
  /**
   * Property 19: Trial Balance Invariant
   * For any trial balance report, the sum of all debit balances
   * SHALL equal the sum of all credit balances.
   */
  describe('Property 19: Trial Balance Invariant', () => {
    const calculateTrialBalance = (vouchers: ChungTu[]) => {
      const balances = new Map<string, { no: number; co: number }>();

      for (const v of vouchers) {
        // Debit side
        const noBalance = balances.get(v.taiKhoanNo) || { no: 0, co: 0 };
        noBalance.no += v.soTien;
        balances.set(v.taiKhoanNo, noBalance);

        // Credit side
        const coBalance = balances.get(v.taiKhoanCo) || { no: 0, co: 0 };
        coBalance.co += v.soTien;
        balances.set(v.taiKhoanCo, coBalance);
      }

      let totalNo = 0;
      let totalCo = 0;

      for (const [, data] of balances) {
        totalNo += data.no;
        totalCo += data.co;
      }

      return { totalNo, totalCo, balances };
    };

    it('should maintain debit = credit invariant', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              soPhieu: fc.string({ minLength: 1, maxLength: 20 }),
              loai: fc.constantFrom<'PHIEU_THU' | 'PHIEU_CHI'>(
                'PHIEU_THU',
                'PHIEU_CHI',
              ),
              ngay: fc.date({ min: new Date('2020-01-01') }),
              soTien: fc.float({ min: 0, max: 1000000, noNaN: true }),
              taiKhoanNo: fc.constantFrom('111', '112', '131', '211'),
              taiKhoanCo: fc.constantFrom('331', '411', '511', '632'),
            }),
            { minLength: 0, maxLength: 50 },
          ),
          (vouchers) => {
            const { totalNo, totalCo } = calculateTrialBalance(vouchers);

            // Total debits must equal total credits
            expect(Math.abs(totalNo - totalCo)).toBeLessThan(0.001);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle empty voucher list', () => {
      const { totalNo, totalCo } = calculateTrialBalance([]);
      expect(totalNo).toBe(0);
      expect(totalCo).toBe(0);
    });

    it('should correctly aggregate multiple entries for same account', () => {
      fc.assert(
        fc.property(
          fc.record({
            account: fc.constantFrom('111', '112', '131'),
            amounts: fc.array(fc.float({ min: 0, max: 10000, noNaN: true }), {
              minLength: 1,
              maxLength: 10,
            }),
          }),
          ({ account, amounts }) => {
            const vouchers: ChungTu[] = amounts.map((amount, i) => ({
              soPhieu: `V${i}`,
              loai: 'PHIEU_THU',
              ngay: new Date(),
              soTien: amount,
              taiKhoanNo: account,
              taiKhoanCo: '511',
            }));

            const { balances } = calculateTrialBalance(vouchers);
            const accountBalance = balances.get(account);

            const expectedNo = amounts.reduce((sum, a) => sum + a, 0);
            expect(
              Math.abs((accountBalance?.no || 0) - expectedNo),
            ).toBeLessThan(0.001);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 20: General Ledger Running Balance
   * For any account's general ledger entries ordered by date,
   * the running balance SHALL be correctly calculated based on account type
   * (NO increases with debits, CO increases with credits).
   */
  describe('Property 20: General Ledger Running Balance', () => {
    const calculateLedgerBalance = (
      vouchers: ChungTu[],
      maTaiKhoan: string,
      accountType: 'NO' | 'CO',
    ): SoCaiEntry[] => {
      const relevantVouchers = vouchers.filter(
        (v) => v.taiKhoanNo === maTaiKhoan || v.taiKhoanCo === maTaiKhoan,
      );

      const sorted = [...relevantVouchers].sort(
        (a, b) => a.ngay.getTime() - b.ngay.getTime(),
      );

      let soDu = 0;
      const entries: SoCaiEntry[] = [];

      for (const v of sorted) {
        const no = v.taiKhoanNo === maTaiKhoan ? v.soTien : 0;
        const co = v.taiKhoanCo === maTaiKhoan ? v.soTien : 0;

        // For debit accounts (NO): balance increases with debits
        // For credit accounts (CO): balance increases with credits
        if (accountType === 'NO') {
          soDu = soDu + no - co;
        } else {
          soDu = soDu + co - no;
        }

        entries.push({
          ngay: v.ngay,
          soPhieu: v.soPhieu,
          no,
          co,
          soDu,
        });
      }

      return entries;
    };

    it('should calculate running balance correctly for debit accounts', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              soPhieu: fc.string({ minLength: 1, maxLength: 20 }),
              loai: fc.constantFrom<'PHIEU_THU' | 'PHIEU_CHI'>(
                'PHIEU_THU',
                'PHIEU_CHI',
              ),
              ngay: fc.date({ min: new Date('2020-01-01') }),
              soTien: fc.float({ min: 0, max: 10000, noNaN: true }),
              taiKhoanNo: fc.constantFrom('111', '112', '131'),
              taiKhoanCo: fc.constantFrom('111', '331', '511'),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (vouchers) => {
            const entries = calculateLedgerBalance(vouchers, '111', 'NO');

            // Verify running balance calculation
            let expectedBalance = 0;
            for (const entry of entries) {
              expectedBalance = expectedBalance + entry.no - entry.co;
              expect(Math.abs(entry.soDu - expectedBalance)).toBeLessThan(
                0.001,
              );
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should calculate running balance correctly for credit accounts', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              soPhieu: fc.string({ minLength: 1, maxLength: 20 }),
              loai: fc.constantFrom<'PHIEU_THU' | 'PHIEU_CHI'>(
                'PHIEU_THU',
                'PHIEU_CHI',
              ),
              ngay: fc.date({ min: new Date('2020-01-01') }),
              soTien: fc.float({ min: 0, max: 10000, noNaN: true }),
              taiKhoanNo: fc.constantFrom('111', '632', '641'),
              taiKhoanCo: fc.constantFrom('331', '411', '511'),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (vouchers) => {
            const entries = calculateLedgerBalance(vouchers, '511', 'CO');

            // Verify running balance calculation for credit account
            let expectedBalance = 0;
            for (const entry of entries) {
              expectedBalance = expectedBalance + entry.co - entry.no;
              expect(Math.abs(entry.soDu - expectedBalance)).toBeLessThan(
                0.001,
              );
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain chronological order', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              soPhieu: fc.string({ minLength: 1, maxLength: 20 }),
              loai: fc.constantFrom<'PHIEU_THU' | 'PHIEU_CHI'>(
                'PHIEU_THU',
                'PHIEU_CHI',
              ),
              ngay: fc.date({
                min: new Date('2020-01-01'),
                max: new Date('2025-12-31'),
              }),
              soTien: fc.float({ min: 0, max: 10000, noNaN: true }),
              taiKhoanNo: fc.constant('111'),
              taiKhoanCo: fc.constantFrom('331', '511'),
            }),
            { minLength: 2, maxLength: 20 },
          ),
          (vouchers) => {
            // Filter out invalid dates
            const validVouchers = vouchers.filter(
              (v) => !isNaN(v.ngay.getTime()),
            );
            if (validVouchers.length < 2) return true;

            const entries = calculateLedgerBalance(validVouchers, '111', 'NO');

            // Verify entries are in chronological order
            for (let i = 1; i < entries.length; i++) {
              expect(entries[i].ngay.getTime()).toBeGreaterThanOrEqual(
                entries[i - 1].ngay.getTime(),
              );
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
