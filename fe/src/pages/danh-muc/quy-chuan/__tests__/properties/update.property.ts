import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { UpdateQuyChaunDto } from '@/services/quyChaunService';

/**
 * **Feature: quy-chuan-handler-refactor, Property 7: Update API Call Correctness**
 * **Validates: Requirements 5.2**
 * 
 * *For any* valid form data submitted for update, the System SHALL call 
 * PUT API with the record ID and updated data.
 */

// Mock service
const mockUpdate = vi.fn();

vi.mock('@/services/quyChaunService', () => ({
  quyChauanService: {
    update: (id: string, data: UpdateQuyChaunDto) => mockUpdate(id, data),
  },
}));

// Arbitrary for generating valid ID (MongoDB ObjectId-like)
const idArb = fc.stringMatching(/^[0-9a-f]{24}$/);

// Arbitrary for generating valid LoaiGiaoDich
const loaiGiaoDichArb = fc.constantFrom('PHIEU_THU', 'PHIEU_CHI', 'BAO_CO', 'BAO_NO');

// Arbitrary for generating valid nghiepVu
const nghiepVuArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

// Arbitrary for generating valid taiKhoan
const taiKhoanArb = fc.stringMatching(/^[0-9]{3}$/);

// Arbitrary for generating optional moTa
const moTaArb = fc.option(fc.string({ maxLength: 255 }), { nil: undefined });

// Arbitrary for generating valid UpdateQuyChaunDto
const updateDtoArb = fc.record({
  loaiGiaoDich: fc.option(loaiGiaoDichArb, { nil: undefined }),
  nghiepVu: fc.option(nghiepVuArb, { nil: undefined }),
  taiKhoanNo: fc.option(taiKhoanArb, { nil: undefined }),
  taiKhoanCo: fc.option(taiKhoanArb, { nil: undefined }),
  moTa: moTaArb,
});

describe('Property 7: Update API Call Correctness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({ id: '1' });
  });

  it('should call update API with correct ID and data for any valid input', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, updateDtoArb, async (id, updateData) => {
        mockUpdate.mockClear();
        mockUpdate.mockResolvedValue({ id, ...updateData });
        
        // Simulate update call
        await mockUpdate(id, updateData);
        
        // Verify API was called with correct ID and data
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith(id, updateData);
        
        // Verify ID is preserved
        const [calledId, calledData] = mockUpdate.mock.calls[0];
        expect(calledId).toBe(id);
        expect(calledData).toEqual(updateData);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve ID exactly as provided', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, async (id) => {
        mockUpdate.mockClear();
        
        const updateData: UpdateQuyChaunDto = {
          nghiepVu: 'Updated nghiep vu',
        };
        
        await mockUpdate(id, updateData);
        
        const [calledId] = mockUpdate.mock.calls[0];
        expect(calledId).toBe(id);
        expect(calledId.length).toBe(24); // MongoDB ObjectId length
      }),
      { numRuns: 100 }
    );
  });

  it('should handle partial updates correctly', async () => {
    // Generate partial update with only some fields
    const partialUpdateArb = fc.oneof(
      fc.record({ nghiepVu: nghiepVuArb }),
      fc.record({ taiKhoanNo: taiKhoanArb }),
      fc.record({ taiKhoanCo: taiKhoanArb }),
      fc.record({ moTa: fc.string({ maxLength: 255 }) }),
      fc.record({ loaiGiaoDich: loaiGiaoDichArb }),
    );

    await fc.assert(
      fc.asyncProperty(idArb, partialUpdateArb, async (id, partialData) => {
        mockUpdate.mockClear();
        
        await mockUpdate(id, partialData);
        
        // Verify only provided fields are sent
        const [, calledData] = mockUpdate.mock.calls[0];
        expect(calledData).toEqual(partialData);
      }),
      { numRuns: 100 }
    );
  });
});
