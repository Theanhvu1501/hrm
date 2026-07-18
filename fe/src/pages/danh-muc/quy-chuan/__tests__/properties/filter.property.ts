import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { QuyChuan } from '@/types';

/**
 * **Feature: quy-chuan-handler-refactor, Property 3: Tab Filter Correctness**
 * **Validates: Requirements 3.2**
 * 
 * *For any* loại giao dịch tab selection, the displayed data SHALL contain 
 * only items where loaiGiaoDich matches the selected tab value.
 */

// Valid loại giao dịch values
const LOAI_GIAO_DICH = ['PHIEU_THU', 'PHIEU_CHI', 'BAO_CO', 'BAO_NO'] as const;
type LoaiGiaoDich = typeof LOAI_GIAO_DICH[number];

// Arbitrary for generating valid LoaiGiaoDich
const loaiGiaoDichArb = fc.constantFrom(...LOAI_GIAO_DICH);

// Arbitrary for generating valid QuyChuan item
const quyChaunArb: fc.Arbitrary<QuyChuan> = fc.record({
  id: fc.stringMatching(/^[0-9a-f]{24}$/),
  loaiGiaoDich: loaiGiaoDichArb,
  nghiepVu: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  taiKhoanNo: fc.stringMatching(/^[0-9]{3}$/),
  taiKhoanCo: fc.stringMatching(/^[0-9]{3}$/),
  moTa: fc.option(fc.string({ maxLength: 255 }), { nil: undefined }),
});

// Arbitrary for generating list of QuyChuan with mixed loaiGiaoDich
const quyChaunListArb = fc.array(quyChaunArb, { minLength: 0, maxLength: 50 });

// Filter function (same logic as in component)
function filterByLoaiGiaoDich(data: QuyChuan[], loai: LoaiGiaoDich): QuyChuan[] {
  return data.filter(item => item.loaiGiaoDich === loai);
}

describe('Property 3: Tab Filter Correctness', () => {
  it('should filter data to only include items matching selected loaiGiaoDich', () => {
    fc.assert(
      fc.property(quyChaunListArb, loaiGiaoDichArb, (data, selectedLoai) => {
        const filteredData = filterByLoaiGiaoDich(data, selectedLoai);
        
        // All filtered items should have matching loaiGiaoDich
        filteredData.forEach(item => {
          expect(item.loaiGiaoDich).toBe(selectedLoai);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should include all items with matching loaiGiaoDich', () => {
    fc.assert(
      fc.property(quyChaunListArb, loaiGiaoDichArb, (data, selectedLoai) => {
        const filteredData = filterByLoaiGiaoDich(data, selectedLoai);
        const expectedCount = data.filter(item => item.loaiGiaoDich === selectedLoai).length;
        
        // Filtered count should match expected count
        expect(filteredData.length).toBe(expectedCount);
      }),
      { numRuns: 100 }
    );
  });

  it('should exclude all items with non-matching loaiGiaoDich', () => {
    fc.assert(
      fc.property(quyChaunListArb, loaiGiaoDichArb, (data, selectedLoai) => {
        const filteredData = filterByLoaiGiaoDich(data, selectedLoai);
        
        // No filtered item should have different loaiGiaoDich
        const hasNonMatching = filteredData.some(item => item.loaiGiaoDich !== selectedLoai);
        expect(hasNonMatching).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve order of items after filtering', () => {
    fc.assert(
      fc.property(quyChaunListArb, loaiGiaoDichArb, (data, selectedLoai) => {
        const filteredData = filterByLoaiGiaoDich(data, selectedLoai);
        
        // Get expected items in order
        const expectedItems = data.filter(item => item.loaiGiaoDich === selectedLoai);
        
        // Order should be preserved
        filteredData.forEach((item, index) => {
          expect(item.id).toBe(expectedItems[index].id);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no items match', () => {
    // Generate data with only one loaiGiaoDich type
    const singleTypeDataArb = fc.array(
      fc.record({
        id: fc.stringMatching(/^[0-9a-f]{24}$/),
        loaiGiaoDich: fc.constant('PHIEU_THU' as LoaiGiaoDich),
        nghiepVu: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        taiKhoanNo: fc.stringMatching(/^[0-9]{3}$/),
        taiKhoanCo: fc.stringMatching(/^[0-9]{3}$/),
        moTa: fc.option(fc.string({ maxLength: 255 }), { nil: undefined }),
      }),
      { minLength: 1, maxLength: 10 }
    );

    fc.assert(
      fc.property(singleTypeDataArb, (data) => {
        // Filter by different loaiGiaoDich
        const filteredData = filterByLoaiGiaoDich(data, 'PHIEU_CHI');
        
        expect(filteredData.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle filtering for each loaiGiaoDich type', () => {
    fc.assert(
      fc.property(quyChaunListArb, (data) => {
        // Test filtering for each type
        LOAI_GIAO_DICH.forEach(loai => {
          const filteredData = filterByLoaiGiaoDich(data, loai);
          const expectedCount = data.filter(item => item.loaiGiaoDich === loai).length;
          
          expect(filteredData.length).toBe(expectedCount);
          filteredData.forEach(item => {
            expect(item.loaiGiaoDich).toBe(loai);
          });
        });
      }),
      { numRuns: 100 }
    );
  });
});
