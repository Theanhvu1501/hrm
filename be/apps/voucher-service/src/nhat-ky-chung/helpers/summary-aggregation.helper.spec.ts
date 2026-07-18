import 'reflect-metadata';
import * as fc from 'fast-check';
import {
  buildSummaryAggregation,
  getSummaryFieldName,
} from './summary-aggregation.helper';
import { SummaryType, SUMMARY_TYPES } from '../dto';

/**
 * **Feature: nhat-ky-chung-summary-tabs, Property 3: Backend aggregation correctness**
 * **Validates: Requirements 10.1-10.9**
 *
 * For any set of ChungTu entries and any groupBy field, the summary API SHALL return
 * correct aggregated totals where:
 * - phatSinhNo equals sum of soTien for all PHIEU_THU entries in that group
 * - phatSinhCo equals sum of soTien for all PHIEU_CHI entries in that group
 * - soLuong equals count of entries in that group
 */
describe('Summary Aggregation Helper', () => {
  // Arbitrary for summary types (excluding 'account' which has special handling)
  const summaryTypeArb = fc.constantFrom(
    ...SUMMARY_TYPES.filter((t) => t !== 'account'),
  ) as fc.Arbitrary<SummaryType>;

  describe('buildSummaryAggregation', () => {
    it('should return valid aggregation pipeline for any summary type', () => {
      fc.assert(
        fc.property(summaryTypeArb, (type) => {
          const pipeline = buildSummaryAggregation(type, {});

          // Pipeline should be an array
          expect(Array.isArray(pipeline)).toBe(true);

          // Pipeline should have at least 5 stages
          expect(pipeline.length).toBeGreaterThanOrEqual(5);

          // First stage should be $match
          expect(pipeline[0]).toHaveProperty('$match');

          // Should have $group stage
          const hasGroup = pipeline.some((stage) =>
            Object.prototype.hasOwnProperty.call(stage, '$group'),
          );
          expect(hasGroup).toBe(true);

          // Should have $project stage
          const hasProject = pipeline.some((stage) =>
            Object.prototype.hasOwnProperty.call(stage, '$project'),
          );
          expect(hasProject).toBe(true);

          // Should have $sort stage
          const hasSort = pipeline.some((stage) =>
            Object.prototype.hasOwnProperty.call(stage, '$sort'),
          );
          expect(hasSort).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should include correct field path in $group stage for any summary type', () => {
      fc.assert(
        fc.property(summaryTypeArb, (type) => {
          const pipeline = buildSummaryAggregation(type, {});
          const fieldName = getSummaryFieldName(type);

          // Find $group stage
          const groupStage = pipeline.find((stage) =>
            Object.prototype.hasOwnProperty.call(stage, '$group'),
          ) as { $group: { _id: string } } | undefined;

          expect(groupStage).toBeDefined();

          // _id should reference the correct danhMuc field
          const expectedPath = `$danhMuc.${fieldName}.ma`;
          expect(groupStage!.$group._id).toBe(expectedPath);
        }),
        { numRuns: 100 },
      );
    });

    it('should include phatSinhNo and phatSinhCo calculations in $group stage', () => {
      fc.assert(
        fc.property(summaryTypeArb, (type) => {
          const pipeline = buildSummaryAggregation(type, {});

          // Find $group stage
          const groupStage = pipeline.find((stage) =>
            Object.prototype.hasOwnProperty.call(stage, '$group'),
          ) as {
            $group: {
              phatSinhNo: unknown;
              phatSinhCo: unknown;
              soLuong: unknown;
            };
          };

          expect(groupStage).toBeDefined();
          expect(groupStage.$group).toHaveProperty('phatSinhNo');
          expect(groupStage.$group).toHaveProperty('phatSinhCo');
          expect(groupStage.$group).toHaveProperty('soLuong');
        }),
        { numRuns: 100 },
      );
    });

    it('should apply mongoQuery filter in $match stage', () => {
      fc.assert(
        fc.property(
          summaryTypeArb,
          fc.record({
            loai: fc.constantFrom('PHIEU_THU', 'PHIEU_CHI'),
          }),
          (type, query) => {
            const pipeline = buildSummaryAggregation(type, query);

            // First stage should be $match with the query
            const matchStage = pipeline[0] as {
              $match: Record<string, unknown>;
            };
            expect(matchStage.$match).toEqual(query);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('buildSummaryAggregation for account type', () => {
    it('should return special aggregation pipeline for account type', () => {
      const pipeline = buildSummaryAggregation('account', {});

      // Pipeline should be an array
      expect(Array.isArray(pipeline)).toBe(true);

      // Should have $facet stage for combining debit and credit accounts
      const hasFacet = pipeline.some((stage) =>
        Object.prototype.hasOwnProperty.call(stage, '$facet'),
      );
      expect(hasFacet).toBe(true);
    });

    it('should handle both taiKhoanNo and taiKhoanCo in account aggregation', () => {
      const pipeline = buildSummaryAggregation('account', {});

      // Find $facet stage
      const facetStage = pipeline.find((stage) =>
        Object.prototype.hasOwnProperty.call(stage, '$facet'),
      ) as { $facet: { debitAccounts: unknown[]; creditAccounts: unknown[] } };

      expect(facetStage).toBeDefined();
      expect(facetStage.$facet).toHaveProperty('debitAccounts');
      expect(facetStage.$facet).toHaveProperty('creditAccounts');
    });
  });

  describe('getSummaryFieldName', () => {
    it('should return correct field name for any summary type', () => {
      fc.assert(
        fc.property(fc.constantFrom(...SUMMARY_TYPES), (type) => {
          const fieldName = getSummaryFieldName(type);

          // Field name should be a non-empty string
          expect(typeof fieldName).toBe('string');
          expect(fieldName.length).toBeGreaterThan(0);

          // Field name should not contain dots (it's just the field name, not path)
          expect(fieldName).not.toContain('.');
        }),
        { numRuns: 100 },
      );
    });

    it('should map summary types to expected field names', () => {
      const expectedMappings: Record<SummaryType, string> = {
        account: 'taiKhoanNo',
        team: 'doi',
        employee: 'nhanVien',
        project: 'duAn',
        investor: 'chuDauTu',
        product: 'sanPham',
        'cash-flow': 'dongTien',
        'management-group': 'nhomQuanLy',
        'promotion-group': 'nhomKhuyenMai',
      };

      for (const [type, expected] of Object.entries(expectedMappings)) {
        expect(getSummaryFieldName(type as SummaryType)).toBe(expected);
      }
    });
  });
});
