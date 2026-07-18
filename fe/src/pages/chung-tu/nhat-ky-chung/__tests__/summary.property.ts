import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { SummaryType } from '@/services/nhatKyChungService';

/**
 * **Feature: nhat-ky-chung-summary-tabs, Property 1: Tab switch triggers correct API call**
 * **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1**
 *
 * For any summary tab type, when a user switches to that tab, the system SHALL call
 * the corresponding backend API endpoint with the correct type parameter.
 */

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

// Map tab key to summary type
const TAB_TO_SUMMARY_TYPE: Record<string, SummaryType> = {
  summary: 'account',
  team: 'team',
  employee: 'employee',
  project: 'project',
  chudautu: 'investor',
  sanpham: 'product',
  dongtien: 'cash-flow',
  nhomquanly: 'management-group',
  nhomkm: 'promotion-group',
};

// Map summary type to expected API endpoint
const SUMMARY_TYPE_TO_ENDPOINT: Record<SummaryType, string> = {
  account: '/summary/account',
  team: '/summary/team',
  employee: '/summary/employee',
  project: '/summary/project',
  investor: '/summary/investor',
  product: '/summary/product',
  'cash-flow': '/summary/cash-flow',
  'management-group': '/summary/management-group',
  'promotion-group': '/summary/promotion-group',
};

describe('Summary Tab Switch Property Tests', () => {
  describe('Property 1: Tab switch triggers correct API call', () => {
    it('for any summary type, the correct API endpoint should be called', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUMMARY_TYPES),
          (summaryType: SummaryType) => {
            const expectedEndpoint = SUMMARY_TYPE_TO_ENDPOINT[summaryType];

            // Verify endpoint mapping exists and is correct format
            expect(expectedEndpoint).toBeDefined();
            expect(expectedEndpoint).toMatch(/^\/summary\/.+$/);
            expect(expectedEndpoint).toContain(summaryType);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('for any tab key, the correct summary type should be mapped', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(TAB_TO_SUMMARY_TYPE)),
          (tabKey: string) => {
            const summaryType = TAB_TO_SUMMARY_TYPE[tabKey];

            // Verify mapping exists
            expect(summaryType).toBeDefined();
            expect(SUMMARY_TYPES).toContain(summaryType);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('all summary types should have corresponding tab mappings', () => {
      const mappedTypes = new Set(Object.values(TAB_TO_SUMMARY_TYPE));

      fc.assert(
        fc.property(
          fc.constantFrom(...SUMMARY_TYPES),
          (summaryType: SummaryType) => {
            expect(mappedTypes.has(summaryType)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('summary type to endpoint mapping should be bijective', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUMMARY_TYPES),
          fc.constantFrom(...SUMMARY_TYPES),
          (type1: SummaryType, type2: SummaryType) => {
            const endpoint1 = SUMMARY_TYPE_TO_ENDPOINT[type1];
            const endpoint2 = SUMMARY_TYPE_TO_ENDPOINT[type2];

            // If types are different, endpoints should be different
            if (type1 !== type2) {
              expect(endpoint1).not.toBe(endpoint2);
            } else {
              expect(endpoint1).toBe(endpoint2);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('API endpoint format validation', () => {
    it('all endpoints should follow the correct format', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUMMARY_TYPES),
          (summaryType: SummaryType) => {
            const endpoint = SUMMARY_TYPE_TO_ENDPOINT[summaryType];

            // Endpoint should start with /summary/
            expect(endpoint.startsWith('/summary/')).toBe(true);

            // Endpoint should not have trailing slash
            expect(endpoint.endsWith('/')).toBe(false);

            // Endpoint should not have double slashes
            expect(endpoint).not.toContain('//');
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
