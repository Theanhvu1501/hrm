import * as fc from 'fast-check';

interface CongNo {
  _id: string;
  loai: 'PHAI_THU' | 'PHAI_TRA';
  doiTuongId: string;
  soTien: number;
  soTienDaTra: number;
  ngayDaoHan: Date;
  trangThai: 'CON_NO' | 'DA_TRA' | 'QUA_HAN';
}

interface GroupedCongNo {
  doiTuongId: string;
  tongNo: number;
  tongDaTra: number;
  conLai: number;
  items: CongNo[];
}

interface AgingBucket {
  range: string;
  count: number;
  total: number;
}

describe('PayableService Property Tests', () => {
  /**
   * Property 17: Payables Grouping by Counterparty
   * For any query on receivables or payables, the results SHALL be
   * grouped by doiTuongId with correct total outstanding amounts per group.
   */
  describe('Property 17: Payables Grouping by Counterparty', () => {
    const groupByDoiTuong = (items: CongNo[]): GroupedCongNo[] => {
      const groups = new Map<string, CongNo[]>();

      for (const item of items) {
        const existing = groups.get(item.doiTuongId) || [];
        existing.push(item);
        groups.set(item.doiTuongId, existing);
      }

      const result: GroupedCongNo[] = [];
      for (const [doiTuongId, groupItems] of groups) {
        const tongNo = groupItems.reduce((sum, i) => sum + i.soTien, 0);
        const tongDaTra = groupItems.reduce((sum, i) => sum + i.soTienDaTra, 0);

        result.push({
          doiTuongId,
          tongNo,
          tongDaTra,
          conLai: tongNo - tongDaTra,
          items: groupItems,
        });
      }

      return result;
    };

    it('should group items by doiTuongId correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              _id: fc.uuid(),
              loai: fc.constantFrom<'PHAI_THU' | 'PHAI_TRA'>(
                'PHAI_THU',
                'PHAI_TRA',
              ),
              doiTuongId: fc.constantFrom('DT001', 'DT002', 'DT003', 'DT004'),
              soTien: fc.float({ min: 0, max: 1000000, noNaN: true }),
              soTienDaTra: fc.float({ min: 0, max: 500000, noNaN: true }),
              ngayDaoHan: fc.date({ min: new Date('2020-01-01') }),
              trangThai: fc.constantFrom<'CON_NO' | 'DA_TRA' | 'QUA_HAN'>(
                'CON_NO',
                'DA_TRA',
                'QUA_HAN',
              ),
            }),
            { minLength: 0, maxLength: 20 },
          ),
          (items) => {
            const grouped = groupByDoiTuong(items);

            // Each group should have unique doiTuongId
            const doiTuongIds = grouped.map((g) => g.doiTuongId);
            const uniqueIds = new Set(doiTuongIds);
            expect(doiTuongIds.length).toBe(uniqueIds.size);

            // Total items in all groups should equal original items
            const totalItems = grouped.reduce(
              (sum, g) => sum + g.items.length,
              0,
            );
            expect(totalItems).toBe(items.length);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should calculate group totals correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              _id: fc.uuid(),
              loai: fc.constantFrom<'PHAI_THU' | 'PHAI_TRA'>(
                'PHAI_THU',
                'PHAI_TRA',
              ),
              doiTuongId: fc.constantFrom('DT001', 'DT002'),
              soTien: fc.float({ min: 0, max: 1000000, noNaN: true }),
              soTienDaTra: fc.float({ min: 0, max: 500000, noNaN: true }),
              ngayDaoHan: fc.date({ min: new Date('2020-01-01') }),
              trangThai: fc.constantFrom<'CON_NO' | 'DA_TRA' | 'QUA_HAN'>(
                'CON_NO',
                'DA_TRA',
                'QUA_HAN',
              ),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (items) => {
            const grouped = groupByDoiTuong(items);

            for (const group of grouped) {
              const expectedTongNo = group.items.reduce(
                (sum, i) => sum + i.soTien,
                0,
              );
              const expectedTongDaTra = group.items.reduce(
                (sum, i) => sum + i.soTienDaTra,
                0,
              );

              expect(Math.abs(group.tongNo - expectedTongNo)).toBeLessThan(
                0.001,
              );
              expect(
                Math.abs(group.tongDaTra - expectedTongDaTra),
              ).toBeLessThan(0.001);
              expect(
                Math.abs(group.conLai - (expectedTongNo - expectedTongDaTra)),
              ).toBeLessThan(0.001);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 18: Payables Aging Calculation
   * For any overdue receivable or payable, the aging bucket SHALL be
   * correctly calculated based on days past due: 0-30, 31-60, 61-90, >90 days.
   */
  describe('Property 18: Payables Aging Calculation', () => {
    const calculateAgingBucket = (
      ngayDaoHan: Date,
      today: Date,
    ): string | null => {
      const daysPastDue = Math.floor(
        (today.getTime() - ngayDaoHan.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysPastDue <= 0) return null; // Not overdue

      if (daysPastDue <= 30) return '0-30';
      if (daysPastDue <= 60) return '31-60';
      if (daysPastDue <= 90) return '61-90';
      return '>90';
    };

    it('should assign correct aging bucket based on days past due', () => {
      fc.assert(
        fc.property(
          fc.record({
            daysPastDue: fc.integer({ min: 1, max: 365 }),
          }),
          ({ daysPastDue }) => {
            const today = new Date();
            const ngayDaoHan = new Date(
              today.getTime() - daysPastDue * 24 * 60 * 60 * 1000,
            );

            const bucket = calculateAgingBucket(ngayDaoHan, today);

            if (daysPastDue <= 30) {
              expect(bucket).toBe('0-30');
            } else if (daysPastDue <= 60) {
              expect(bucket).toBe('31-60');
            } else if (daysPastDue <= 90) {
              expect(bucket).toBe('61-90');
            } else {
              expect(bucket).toBe('>90');
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return null for non-overdue items', () => {
      fc.assert(
        fc.property(
          fc.record({
            daysUntilDue: fc.integer({ min: 0, max: 365 }),
          }),
          ({ daysUntilDue }) => {
            const today = new Date();
            const ngayDaoHan = new Date(
              today.getTime() + daysUntilDue * 24 * 60 * 60 * 1000,
            );

            const bucket = calculateAgingBucket(ngayDaoHan, today);
            expect(bucket).toBeNull();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should correctly categorize boundary cases', () => {
      const today = new Date('2024-06-15');

      // Exactly 30 days past due
      const day30 = new Date('2024-05-16');
      expect(calculateAgingBucket(day30, today)).toBe('0-30');

      // Exactly 31 days past due
      const day31 = new Date('2024-05-15');
      expect(calculateAgingBucket(day31, today)).toBe('31-60');

      // Exactly 60 days past due
      const day60 = new Date('2024-04-16');
      expect(calculateAgingBucket(day60, today)).toBe('31-60');

      // Exactly 61 days past due
      const day61 = new Date('2024-04-15');
      expect(calculateAgingBucket(day61, today)).toBe('61-90');

      // Exactly 90 days past due
      const day90 = new Date('2024-03-17');
      expect(calculateAgingBucket(day90, today)).toBe('61-90');

      // Exactly 91 days past due
      const day91 = new Date('2024-03-16');
      expect(calculateAgingBucket(day91, today)).toBe('>90');
    });

    it('should aggregate aging buckets correctly', () => {
      const calculateStats = (items: CongNo[], today: Date) => {
        const buckets: Record<string, { count: number; total: number }> = {
          '0-30': { count: 0, total: 0 },
          '31-60': { count: 0, total: 0 },
          '61-90': { count: 0, total: 0 },
          '>90': { count: 0, total: 0 },
        };

        for (const item of items) {
          const bucket = calculateAgingBucket(item.ngayDaoHan, today);
          if (bucket) {
            const remaining = item.soTien - item.soTienDaTra;
            buckets[bucket].count++;
            buckets[bucket].total += remaining;
          }
        }

        return buckets;
      };

      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              _id: fc.uuid(),
              loai: fc.constantFrom<'PHAI_THU' | 'PHAI_TRA'>(
                'PHAI_THU',
                'PHAI_TRA',
              ),
              doiTuongId: fc.uuid(),
              soTien: fc.float({ min: 100, max: 10000, noNaN: true }),
              soTienDaTra: fc.float({ min: 0, max: 50, noNaN: true }),
              ngayDaoHan: fc.date({
                min: new Date('2024-01-01'),
                max: new Date('2024-12-31'),
              }),
              trangThai: fc.constantFrom<'CON_NO' | 'DA_TRA' | 'QUA_HAN'>(
                'CON_NO',
                'DA_TRA',
                'QUA_HAN',
              ),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (items) => {
            const today = new Date('2024-06-15');
            const stats = calculateStats(items, today);

            // Total count should match overdue items
            const totalCount = Object.values(stats).reduce(
              (sum, b) => sum + b.count,
              0,
            );
            const overdueItems = items.filter(
              (i) => calculateAgingBucket(i.ngayDaoHan, today) !== null,
            );
            expect(totalCount).toBe(overdueItems.length);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
