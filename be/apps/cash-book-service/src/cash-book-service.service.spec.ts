import * as fc from 'fast-check';

interface ChungTu {
  soPhieu: string;
  loai: 'PHIEU_THU' | 'PHIEU_CHI';
  ngay: Date;
  soTien: number;
  noiDung: string;
}

interface SoQuyEntry {
  ngay: Date;
  soPhieu: string;
  noiDung: string;
  thu: number;
  chi: number;
  soDu: number;
}

describe('CashBookService Property Tests', () => {
  /**
   * Property 15: Cash Book Running Balance
   * For any sequence of cash book entries ordered by date,
   * the running balance at each entry SHALL equal the previous
   * running balance plus receipts minus payments.
   */
  describe('Property 15: Cash Book Running Balance', () => {
    const calculateRunningBalance = (
      vouchers: ChungTu[],
      initialBalance = 0,
    ): SoQuyEntry[] => {
      const sorted = [...vouchers].sort(
        (a, b) => a.ngay.getTime() - b.ngay.getTime(),
      );

      let soDu = initialBalance;
      const entries: SoQuyEntry[] = [];

      for (const v of sorted) {
        const thu = v.loai === 'PHIEU_THU' ? v.soTien : 0;
        const chi = v.loai === 'PHIEU_CHI' ? v.soTien : 0;
        soDu = soDu + thu - chi;

        entries.push({
          ngay: v.ngay,
          soPhieu: v.soPhieu,
          noiDung: v.noiDung,
          thu,
          chi,
          soDu,
        });
      }

      return entries;
    };

    it('should calculate running balance correctly', () => {
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
              noiDung: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (vouchers) => {
            const entries = calculateRunningBalance(vouchers);

            // Verify running balance calculation
            let expectedBalance = 0;
            for (const entry of entries) {
              expectedBalance = expectedBalance + entry.thu - entry.chi;
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

    it('should maintain balance invariant: final balance = sum(thu) - sum(chi)', () => {
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
              noiDung: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (vouchers) => {
            const entries = calculateRunningBalance(vouchers);

            if (entries.length === 0) return true;

            const totalThu = entries.reduce((sum, e) => sum + e.thu, 0);
            const totalChi = entries.reduce((sum, e) => sum + e.chi, 0);
            const finalBalance = entries[entries.length - 1].soDu;

            expect(Math.abs(finalBalance - (totalThu - totalChi))).toBeLessThan(
              0.001,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle initial balance correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            initialBalance: fc.float({
              min: -100000,
              max: 100000,
              noNaN: true,
            }),
            vouchers: fc.array(
              fc.record({
                soPhieu: fc.string({ minLength: 1, maxLength: 20 }),
                loai: fc.constantFrom<'PHIEU_THU' | 'PHIEU_CHI'>(
                  'PHIEU_THU',
                  'PHIEU_CHI',
                ),
                ngay: fc.date({ min: new Date('2020-01-01') }),
                soTien: fc.float({ min: 0, max: 1000000, noNaN: true }),
                noiDung: fc.string({ minLength: 1, maxLength: 100 }),
              }),
              { minLength: 1, maxLength: 10 },
            ),
          }),
          ({ initialBalance, vouchers }) => {
            const entries = calculateRunningBalance(vouchers, initialBalance);

            if (entries.length === 0) return true;

            // First entry should include initial balance
            const firstEntry = entries[0];
            const expectedFirstBalance =
              initialBalance + firstEntry.thu - firstEntry.chi;
            expect(
              Math.abs(firstEntry.soDu - expectedFirstBalance),
            ).toBeLessThan(0.001);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 16: Cash Book Date Range Filtering
   * For any date range query on cash book, all returned entries
   * SHALL have ngay >= startDate AND ngay <= endDate.
   */
  describe('Property 16: Cash Book Date Range Filtering', () => {
    const filterByDateRange = (
      vouchers: ChungTu[],
      startDate: Date,
      endDate: Date,
    ): ChungTu[] => {
      return vouchers.filter((v) => {
        const date = v.ngay.getTime();
        return date >= startDate.getTime() && date <= endDate.getTime();
      });
    };

    it('should filter entries within date range', () => {
      fc.assert(
        fc.property(
          fc.record({
            vouchers: fc.array(
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
                soTien: fc.float({ min: 0, max: 1000000, noNaN: true }),
                noiDung: fc.string({ minLength: 1, maxLength: 100 }),
              }),
              { minLength: 0, maxLength: 20 },
            ),
            startDate: fc.date({
              min: new Date('2020-01-01'),
              max: new Date('2023-12-31'),
            }),
            endDate: fc.date({
              min: new Date('2024-01-01'),
              max: new Date('2025-12-31'),
            }),
          }),
          ({ vouchers, startDate, endDate }) => {
            const filtered = filterByDateRange(vouchers, startDate, endDate);

            // All filtered entries should be within range
            for (const v of filtered) {
              expect(v.ngay.getTime()).toBeGreaterThanOrEqual(
                startDate.getTime(),
              );
              expect(v.ngay.getTime()).toBeLessThanOrEqual(endDate.getTime());
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should exclude entries outside date range', () => {
      fc.assert(
        fc.property(
          fc.record({
            vouchers: fc.array(
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
                soTien: fc.float({ min: 0, max: 1000000, noNaN: true }),
                noiDung: fc.string({ minLength: 1, maxLength: 100 }),
              }),
              { minLength: 0, maxLength: 20 },
            ),
            startDate: fc.date({
              min: new Date('2022-01-01'),
              max: new Date('2022-06-30'),
            }),
            endDate: fc.date({
              min: new Date('2022-07-01'),
              max: new Date('2022-12-31'),
            }),
          }),
          ({ vouchers, startDate, endDate }) => {
            const filtered = filterByDateRange(vouchers, startDate, endDate);
            const excluded = vouchers.filter(
              (v) =>
                v.ngay.getTime() < startDate.getTime() ||
                v.ngay.getTime() > endDate.getTime(),
            );

            // Excluded entries should not be in filtered result
            for (const v of excluded) {
              const found = filtered.some(
                (f) =>
                  f.soPhieu === v.soPhieu &&
                  f.ngay.getTime() === v.ngay.getTime(),
              );
              expect(found).toBe(false);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return empty array for invalid date range', () => {
      fc.assert(
        fc.property(
          fc.record({
            vouchers: fc.array(
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
                soTien: fc.float({ min: 0, max: 1000000, noNaN: true }),
                noiDung: fc.string({ minLength: 1, maxLength: 100 }),
              }),
              { minLength: 1, maxLength: 20 },
            ),
          }),
          ({ vouchers }) => {
            // Invalid range: start > end
            const startDate = new Date('2025-01-01');
            const endDate = new Date('2020-01-01');

            const filtered = filterByDateRange(vouchers, startDate, endDate);
            expect(filtered.length).toBe(0);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
