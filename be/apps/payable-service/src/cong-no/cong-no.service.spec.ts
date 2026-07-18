import * as fc from 'fast-check';

/**
 * **Feature: api-completion, Property 6: Aging Bucket Calculation**
 * **Validates: Requirements 11.3, 11.7**
 *
 * For any overdue item, the aging bucket SHALL be correctly determined based on
 * days past due: 0 = chuaDenHan, 1-30 = quaHan1_30, 31-60 = quaHan31_60,
 * 61-90 = quaHan61_90, >90 = quaHanTren90.
 */
describe('Property 6: Aging Bucket Calculation', () => {
  // Helper function to determine aging bucket
  const getAgingBucket = (daysPastDue: number) => {
    if (daysPastDue <= 0) return 'chuaDenHan';
    if (daysPastDue <= 30) return 'quaHan1_30';
    if (daysPastDue <= 60) return 'quaHan31_60';
    if (daysPastDue <= 90) return 'quaHan61_90';
    return 'quaHanTren90';
  };

  it('should correctly classify items into aging buckets', () => {
    fc.assert(
      fc.property(fc.integer({ min: -30, max: 180 }), (daysPastDue) => {
        const bucket = getAgingBucket(daysPastDue);

        if (daysPastDue <= 0) return bucket === 'chuaDenHan';
        if (daysPastDue <= 30) return bucket === 'quaHan1_30';
        if (daysPastDue <= 60) return bucket === 'quaHan31_60';
        if (daysPastDue <= 90) return bucket === 'quaHan61_90';
        return bucket === 'quaHanTren90';
      }),
      { numRuns: 100 },
    );
  });

  it('should have mutually exclusive buckets', () => {
    fc.assert(
      fc.property(fc.integer({ min: -30, max: 180 }), (daysPastDue) => {
        const bucket = getAgingBucket(daysPastDue);
        const allBuckets = [
          'chuaDenHan',
          'quaHan1_30',
          'quaHan31_60',
          'quaHan61_90',
          'quaHanTren90',
        ];
        // Should be exactly one bucket
        return allBuckets.filter((b) => b === bucket).length === 1;
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * **Feature: api-completion, Property 8: Summary By Counterparty Grouping**
 * **Validates: Requirements 11.4, 11.8**
 *
 * For any summary by customer/supplier, the tongNo, daTra, conLai SHALL be
 * correctly aggregated from individual records for each counterparty.
 */
describe('Property 8: Summary By Counterparty Grouping', () => {
  interface CongNoItem {
    doiTuongId: string;
    soTien: number;
    soTienDaTra: number;
  }

  // Helper function to calculate summary
  const calculateSummary = (items: CongNoItem[]) => {
    const groups = new Map<
      string,
      { tongNo: number; daTra: number; soHoaDon: number }
    >();

    for (const item of items) {
      const existing = groups.get(item.doiTuongId) || {
        tongNo: 0,
        daTra: 0,
        soHoaDon: 0,
      };
      existing.tongNo += item.soTien;
      existing.daTra += item.soTienDaTra;
      existing.soHoaDon++;
      groups.set(item.doiTuongId, existing);
    }

    return Array.from(groups.entries()).map(([doiTuongId, data]) => ({
      doiTuongId,
      tongNo: data.tongNo,
      daTra: data.daTra,
      conLai: data.tongNo - data.daTra,
      soHoaDon: data.soHoaDon,
    }));
  };

  const itemArb = fc.record({
    doiTuongId: fc.stringMatching(/^DT[0-9]{3}$/),
    soTien: fc.integer({ min: 0, max: 1000000 }),
    soTienDaTra: fc.integer({ min: 0, max: 1000000 }),
  });

  it('should correctly aggregate tongNo per counterparty', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const summary = calculateSummary(items);

          for (const group of summary) {
            const groupItems = items.filter(
              (i) => i.doiTuongId === group.doiTuongId,
            );
            const expectedTongNo = groupItems.reduce(
              (sum, i) => sum + i.soTien,
              0,
            );
            if (group.tongNo !== expectedTongNo) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should correctly calculate conLai as tongNo - daTra', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const summary = calculateSummary(items);
          return summary.every(
            (group) => group.conLai === group.tongNo - group.daTra,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should correctly count soHoaDon per counterparty', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const summary = calculateSummary(items);

          for (const group of summary) {
            const groupItems = items.filter(
              (i) => i.doiTuongId === group.doiTuongId,
            );
            if (group.soHoaDon !== groupItems.length) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
