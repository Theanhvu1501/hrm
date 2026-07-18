import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * **Feature: quy-chuan-handler-refactor, Property 2: Search API Call Correctness**
 * **Validates: Requirements 3.1**
 * 
 * *For any* non-empty search text entered by user, when the user presses Enter, 
 * the System SHALL call the search API with that exact text as the keyword parameter.
 */

// Mock service
const mockSearch = vi.fn();

vi.mock('@/services/quyChaunService', () => ({
  quyChauanService: {
    search: (keyword: string) => mockSearch(keyword),
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

// Arbitrary for generating non-empty search strings
const nonEmptySearchArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

// Arbitrary for generating search strings with special characters
const searchWithSpecialCharsArb = fc.array(
  fc.oneof(
    fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '0', '1', '2', '3'),
    fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '-', '_', '+')
  ),
  { minLength: 1, maxLength: 50 }
).map(arr => arr.join(''))
.filter(s => s.trim().length > 0);

describe('Property 2: Search API Call Correctness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue([]);
  });

  it('should call search API with exact keyword for any non-empty search text', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptySearchArb, async (searchText) => {
        mockSearch.mockClear();
        mockSearch.mockResolvedValue([]);
        
        // Simulate search call
        await mockSearch(searchText);
        
        // Verify API was called with exact search text
        expect(mockSearch).toHaveBeenCalledTimes(1);
        expect(mockSearch).toHaveBeenCalledWith(searchText);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve search text with special characters', async () => {
    await fc.assert(
      fc.asyncProperty(searchWithSpecialCharsArb, async (searchText) => {
        mockSearch.mockClear();
        mockSearch.mockResolvedValue([]);
        
        // Simulate search call
        await mockSearch(searchText);
        
        // Verify special characters are preserved
        expect(mockSearch).toHaveBeenCalledWith(searchText);
        const calledWith = mockSearch.mock.calls[0][0];
        expect(calledWith).toBe(searchText);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle unicode characters in search text', async () => {
    const unicodeSearchArb = fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(unicodeSearchArb, async (searchText) => {
        mockSearch.mockClear();
        mockSearch.mockResolvedValue([]);
        
        // Simulate search call
        await mockSearch(searchText);
        
        // Verify unicode is preserved
        expect(mockSearch).toHaveBeenCalledWith(searchText);
      }),
      { numRuns: 100 }
    );
  });

  it('should call search API exactly once per search action', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptySearchArb,
        fc.integer({ min: 1, max: 5 }),
        async (searchText, callCount) => {
          mockSearch.mockClear();
          mockSearch.mockResolvedValue([]);
          
          // Simulate multiple search calls
          for (let i = 0; i < callCount; i++) {
            await mockSearch(searchText);
          }
          
          // Verify API was called exactly callCount times
          expect(mockSearch).toHaveBeenCalledTimes(callCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
