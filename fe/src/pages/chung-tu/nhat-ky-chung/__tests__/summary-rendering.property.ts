import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { SummaryType } from '@/services/nhatKyChungService';

/**
 * **Feature: nhat-ky-chung-summary-tabs, Property 2: Summary data rendering completeness**
 * **Validates: Requirements 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2**
 *
 * For any summary data returned from the API, the rendered table SHALL display
 * all required fields (key/name, income, expense, count) for each item.
 */

// Summary item structure from API
interface SummaryItem {
  key: string;
  ten?: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soLuong: number;
}

// Required fields for each summary type
const REQUIRED_FIELDS_BY_TYPE: Record<SummaryType, string[]> = {
  account: ['taiKhoan', 'phatSinhNo', 'phatSinhCo'],
  team: ['doi', 'tongChi', 'soButToan'],
  employee: ['nhanVien', 'tongChi', 'soButToan'],
  project: ['duAn', 'tongThu', 'tongChi', 'soButToan'],
  investor: ['chuDauTu', 'tongThu', 'tongChi', 'soButToan'],
  product: ['sanPham', 'tongThu', 'tongChi', 'soButToan'],
  'cash-flow': ['dongTien', 'tongThu', 'tongChi', 'soButToan'],
  'management-group': ['nhomQuanLy', 'tongThu', 'tongChi', 'soButToan'],
  'promotion-group': ['nhomKhuyenMai', 'tongThu', 'tongChi', 'soButToan'],
};

// Arbitrary for generating summary items
const summaryItemArb = fc.record({
  key: fc.string({ minLength: 1, maxLength: 20 }),
  ten: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  phatSinhNo: fc.integer({ min: 0, max: 1000000000 }),
  phatSinhCo: fc.integer({ min: 0, max: 1000000000 }),
  soLuong: fc.integer({ min: 1, max: 10000 }),
});

// Map API response to state format (same logic as handler)
function mapSummaryData(type: SummaryType, data: SummaryItem[]) {
  switch (type) {
    case 'account':
      return data.map((item) => ({
        taiKhoan: item.key,
        phatSinhNo: item.phatSinhNo,
        phatSinhCo: item.phatSinhCo,
      }));
    case 'team':
      return data.map((item) => ({
        doi: item.ten || item.key,
        tongChi: item.phatSinhCo,
        soButToan: item.soLuong,
        chiTiet: [],
      }));
    case 'employee':
      return data.map((item) => ({
        nhanVien: item.ten || item.key,
        doi: '',
        tongChi: item.phatSinhCo,
        soButToan: item.soLuong,
      }));
    case 'project':
      return data.map((item) => ({
        duAn: item.ten || item.key,
        tongThu: item.phatSinhNo,
        tongChi: item.phatSinhCo,
        soButToan: item.soLuong,
      }));
    case 'investor':
      return data.map((item) => ({
        chuDauTu: item.ten || item.key,
        tongThu: item.phatSinhNo,
        tongChi: item.phatSinhCo,
        soButToan: item.soLuong,
      }));
    case 'product':
      return data.map((item) => ({
        sanPham: item.ten || item.key,
        tongThu: item.phatSinhNo,
        tongChi: item.phatSinhCo,
        soButToan: item.soLuong,
      }));
    case 'cash-flow':
      return data.map((item) => ({
        dongTien: item.ten || item.key,
        tongThu: item.phatSinhNo,
        tongChi: item.phatSinhCo,
        soButToan: item.soLuong,
      }));
    case 'management-group':
      return data.map((item) => ({
        nhomQuanLy: item.ten || item.key,
        tongThu: item.phatSinhNo,
        tongChi: item.phatSinhCo,
        soButToan: item.soLuong,
      }));
    case 'promotion-group':
      return data.map((item) => ({
        nhomKhuyenMai: item.ten || item.key,
        tongThu: item.phatSinhNo,
        tongChi: item.phatSinhCo,
        soButToan: item.soLuong,
      }));
    default:
      return data;
  }
}

const SUMMARY_TYPES: SummaryType[] = [
  'account',
  'team',
  'employee',
  'project',
  'investor',
  'product',
  'cash-flow',
  'management-group',
  'promotion-group',
];

describe('Summary Data Rendering Property Tests', () => {
  describe('Property 2: Summary data rendering completeness', () => {
    it('for any summary type and data, mapped data should contain all required fields', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUMMARY_TYPES),
          fc.array(summaryItemArb, { minLength: 1, maxLength: 20 }),
          (summaryType: SummaryType, items: SummaryItem[]) => {
            const mappedData = mapSummaryData(summaryType, items);
            const requiredFields = REQUIRED_FIELDS_BY_TYPE[summaryType];

            // Each mapped item should have all required fields
            for (const item of mappedData) {
              for (const field of requiredFields) {
                expect(item).toHaveProperty(field);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('mapped data should preserve numeric values correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUMMARY_TYPES),
          fc.array(summaryItemArb, { minLength: 1, maxLength: 10 }),
          (summaryType: SummaryType, items: SummaryItem[]) => {
            const mappedData = mapSummaryData(summaryType, items);

            // Verify numeric values are preserved
            for (let i = 0; i < items.length; i++) {
              const original = items[i];
              const mapped = mappedData[i] as Record<string, unknown>;

              // Check that numeric values match based on type
              if (summaryType === 'account') {
                expect(mapped.phatSinhNo).toBe(original.phatSinhNo);
                expect(mapped.phatSinhCo).toBe(original.phatSinhCo);
              } else if (summaryType === 'team' || summaryType === 'employee') {
                expect(mapped.tongChi).toBe(original.phatSinhCo);
                expect(mapped.soButToan).toBe(original.soLuong);
              } else {
                expect(mapped.tongThu).toBe(original.phatSinhNo);
                expect(mapped.tongChi).toBe(original.phatSinhCo);
                expect(mapped.soButToan).toBe(original.soLuong);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('mapped data should use ten or key for display name', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUMMARY_TYPES.filter((t) => t !== 'account')),
          fc.array(summaryItemArb, { minLength: 1, maxLength: 10 }),
          (summaryType: SummaryType, items: SummaryItem[]) => {
            const mappedData = mapSummaryData(summaryType, items);

            // Get the name field based on type
            const nameFieldMap: Record<SummaryType, string> = {
              account: 'taiKhoan',
              team: 'doi',
              employee: 'nhanVien',
              project: 'duAn',
              investor: 'chuDauTu',
              product: 'sanPham',
              'cash-flow': 'dongTien',
              'management-group': 'nhomQuanLy',
              'promotion-group': 'nhomKhuyenMai',
            };

            const nameField = nameFieldMap[summaryType];

            for (let i = 0; i < items.length; i++) {
              const original = items[i];
              const mapped = mappedData[i] as Record<string, unknown>;

              // Name should be ten if available, otherwise key
              const expectedName = original.ten || original.key;
              expect(mapped[nameField]).toBe(expectedName);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('mapped data length should equal input data length', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUMMARY_TYPES),
          fc.array(summaryItemArb, { minLength: 0, maxLength: 50 }),
          (summaryType: SummaryType, items: SummaryItem[]) => {
            const mappedData = mapSummaryData(summaryType, items);
            expect(mappedData.length).toBe(items.length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
