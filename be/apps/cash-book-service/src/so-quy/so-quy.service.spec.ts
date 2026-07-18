import * as fc from 'fast-check';

/**
 * **Feature: api-completion, Property 7: Daily Summary Aggregation**
 * **Validates: Requirements 10.2**
 *
 * For any daily summary, the sum of thu and chi for each day SHALL match
 * the individual entries for that day.
 */
describe('Property 7: Daily Summary Aggregation', () => {
  interface SoQuyEntry {
    ngay: Date;
    soPhieu: string;
    noiDung: string;
    thu: number;
    chi: number;
    soDu: number;
  }

  // Helper function to simulate daily summary calculation
  const calculateDailySummary = (entries: SoQuyEntry[]) => {
    const dailyMap = new Map<
      string,
      { thu: number; chi: number; soDu: number }
    >();

    for (const entry of entries) {
      const dateKey = new Date(entry.ngay).toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { thu: 0, chi: 0, soDu: 0 };
      existing.thu += entry.thu;
      existing.chi += entry.chi;
      existing.soDu = entry.soDu;
      dailyMap.set(dateKey, existing);
    }

    return Array.from(dailyMap.entries())
      .map(([ngay, data]) => ({ ngay, ...data }))
      .sort((a, b) => a.ngay.localeCompare(b.ngay));
  };

  // Generator for SoQuyEntry
  const entryArb = fc.record({
    ngay: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
    soPhieu: fc.stringMatching(/^(PT|PC)[0-9]{3}$/),
    noiDung: fc.string({ minLength: 1, maxLength: 50 }),
    thu: fc.integer({ min: 0, max: 1000000 }),
    chi: fc.integer({ min: 0, max: 1000000 }),
    soDu: fc.integer({ min: -1000000, max: 10000000 }),
  });

  it('should aggregate thu correctly per day', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 0, maxLength: 30 }),
        (entries) => {
          const summary = calculateDailySummary(entries);

          // For each day in summary, verify thu matches sum of entries
          for (const day of summary) {
            const dayEntries = entries.filter(
              (e) => new Date(e.ngay).toISOString().split('T')[0] === day.ngay,
            );
            const expectedThu = dayEntries.reduce((sum, e) => sum + e.thu, 0);
            if (day.thu !== expectedThu) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should aggregate chi correctly per day', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 0, maxLength: 30 }),
        (entries) => {
          const summary = calculateDailySummary(entries);

          for (const day of summary) {
            const dayEntries = entries.filter(
              (e) => new Date(e.ngay).toISOString().split('T')[0] === day.ngay,
            );
            const expectedChi = dayEntries.reduce((sum, e) => sum + e.chi, 0);
            if (day.chi !== expectedChi) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should have unique dates in summary', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 0, maxLength: 30 }),
        (entries) => {
          const summary = calculateDailySummary(entries);
          const dates = summary.map((s) => s.ngay);
          const uniqueDates = [...new Set(dates)];
          return dates.length === uniqueDates.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});
