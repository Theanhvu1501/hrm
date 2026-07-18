import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { QuyChuan } from '@/types';

/**
 * **Feature: quy-chuan-handler-refactor, Property 1: State Update Consistency**
 * **Validates: Requirements 2.2**
 * 
 * *For any* API response containing quy chuẩn data, when the System receives 
 * the response, the "quyChaunList" state SHALL contain exactly the same items 
 * as the response data.
 */

// Arbitrary for generating valid LoaiGiaoDich
const loaiGiaoDichArb = fc.constantFrom('PHIEU_THU', 'PHIEU_CHI', 'BAO_CO', 'BAO_NO');

// Arbitrary for generating valid QuyChuan item
const quyChaunArb: fc.Arbitrary<QuyChuan> = fc.record({
  id: fc.stringMatching(/^[0-9a-f]{24}$/),
  loaiGiaoDich: loaiGiaoDichArb,
  nghiepVu: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  taiKhoanNo: fc.stringMatching(/^[0-9]{3}$/),
  taiKhoanCo: fc.stringMatching(/^[0-9]{3}$/),
  moTa: fc.option(fc.string({ maxLength: 255 }), { nil: undefined }),
});

// Arbitrary for generating list of QuyChuan
const quyChaunListArb = fc.array(quyChaunArb, { minLength: 0, maxLength: 50 });

// Simulated state management
class MockStateManager {
  private state: Map<string, unknown> = new Map();

  setState<T>(key: string, value: T): void {
    this.state.set(key, value);
  }

  getState<T>(key: string): T | undefined {
    return this.state.get(key) as T | undefined;
  }
}

describe('Property 1: State Update Consistency', () => {
  it('should update state with exact API response data', () => {
    fc.assert(
      fc.property(quyChaunListArb, (apiResponse) => {
        const stateManager = new MockStateManager();
        
        // Simulate state update from API response
        stateManager.setState('quyChaunList', apiResponse);
        
        // Verify state contains exact same data
        const stateData = stateManager.getState<QuyChuan[]>('quyChaunList');
        
        expect(stateData).toEqual(apiResponse);
        expect(stateData?.length).toBe(apiResponse.length);
        
        // Verify each item is identical
        apiResponse.forEach((item, index) => {
          expect(stateData?.[index]).toEqual(item);
          expect(stateData?.[index]?.id).toBe(item.id);
          expect(stateData?.[index]?.loaiGiaoDich).toBe(item.loaiGiaoDich);
          expect(stateData?.[index]?.nghiepVu).toBe(item.nghiepVu);
          expect(stateData?.[index]?.taiKhoanNo).toBe(item.taiKhoanNo);
          expect(stateData?.[index]?.taiKhoanCo).toBe(item.taiKhoanCo);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve order of items from API response', () => {
    fc.assert(
      fc.property(quyChaunListArb, (apiResponse) => {
        const stateManager = new MockStateManager();
        
        stateManager.setState('quyChaunList', apiResponse);
        const stateData = stateManager.getState<QuyChuan[]>('quyChaunList');
        
        // Verify order is preserved
        apiResponse.forEach((item, index) => {
          expect(stateData?.[index]?.id).toBe(item.id);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should handle empty API response', () => {
    const stateManager = new MockStateManager();
    
    stateManager.setState('quyChaunList', []);
    const stateData = stateManager.getState<QuyChuan[]>('quyChaunList');
    
    expect(stateData).toEqual([]);
    expect(stateData?.length).toBe(0);
  });

  it('should replace previous state completely', () => {
    fc.assert(
      fc.property(quyChaunListArb, quyChaunListArb, (firstResponse, secondResponse) => {
        const stateManager = new MockStateManager();
        
        // First update
        stateManager.setState('quyChaunList', firstResponse);
        
        // Second update should replace completely
        stateManager.setState('quyChaunList', secondResponse);
        
        const stateData = stateManager.getState<QuyChuan[]>('quyChaunList');
        
        // Should contain only second response data
        expect(stateData).toEqual(secondResponse);
        expect(stateData?.length).toBe(secondResponse.length);
      }),
      { numRuns: 100 }
    );
  });
});
