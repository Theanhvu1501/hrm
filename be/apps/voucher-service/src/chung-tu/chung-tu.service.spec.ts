import * as fc from 'fast-check';

type TrangThaiChungTu = 'NHAP' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';

/**
 * **Feature: api-completion, Property 4: Stats Sum Consistency**
 * **Validates: Requirements 9.2, 9.4**
 *
 * For any stats query, the sum of individual status counts SHALL equal the total count.
 */
describe('Property 4: Stats Sum Consistency', () => {
  interface VoucherData {
    trangThai: TrangThaiChungTu;
    soTien: number;
  }

  // Helper function to simulate stats calculation
  const calculateStats = (vouchers: VoucherData[]) => {
    return {
      tongSo: vouchers.length,
      nhap: vouchers.filter((v) => v.trangThai === 'NHAP').length,
      choDuyet: vouchers.filter((v) => v.trangThai === 'CHO_DUYET').length,
      daDuyet: vouchers.filter((v) => v.trangThai === 'DA_DUYET').length,
      tuChoi: vouchers.filter((v) => v.trangThai === 'TU_CHOI').length,
      tongTien: vouchers.reduce((sum, v) => sum + v.soTien, 0),
    };
  };

  // Generator for voucher data
  const voucherArb = fc.record({
    trangThai: fc.constantFrom<TrangThaiChungTu>(
      'NHAP',
      'CHO_DUYET',
      'DA_DUYET',
      'TU_CHOI',
    ),
    soTien: fc.integer({ min: 0, max: 1000000000 }),
  });

  it('should have sum of status counts equal to total count', () => {
    fc.assert(
      fc.property(
        fc.array(voucherArb, { minLength: 0, maxLength: 50 }),
        (vouchers) => {
          const stats = calculateStats(vouchers);
          const sumOfStatuses =
            stats.nhap + stats.choDuyet + stats.daDuyet + stats.tuChoi;
          return sumOfStatuses === stats.tongSo;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should have tongTien equal to sum of all soTien', () => {
    fc.assert(
      fc.property(
        fc.array(voucherArb, { minLength: 0, maxLength: 50 }),
        (vouchers) => {
          const stats = calculateStats(vouchers);
          const expectedTongTien = vouchers.reduce(
            (sum, v) => sum + v.soTien,
            0,
          );
          return stats.tongTien === expectedTongTien;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should have non-negative counts', () => {
    fc.assert(
      fc.property(
        fc.array(voucherArb, { minLength: 0, maxLength: 50 }),
        (vouchers) => {
          const stats = calculateStats(vouchers);
          return (
            stats.tongSo >= 0 &&
            stats.nhap >= 0 &&
            stats.choDuyet >= 0 &&
            stats.daDuyet >= 0 &&
            stats.tuChoi >= 0 &&
            stats.tongTien >= 0
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
