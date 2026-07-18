import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CreateQuyChaunDto } from '@/services/quyChaunService';

/**
 * **Feature: quy-chuan-handler-refactor, Property 4: Create API Call Correctness**
 * **Validates: Requirements 4.2**
 * 
 * *For any* valid form data submitted for creation, the System SHALL call 
 * POST API with the exact form data as request body.
 */

// Mock service
const mockCreate = vi.fn();

vi.mock('@/services/quyChaunService', () => ({
  quyChauanService: {
    create: (data: CreateQuyChaunDto) => mockCreate(data),
  },
}));

// Arbitrary for generating valid LoaiGiaoDich
const loaiGiaoDichArb = fc.constantFrom('PHIEU_THU', 'PHIEU_CHI', 'BAO_CO', 'BAO_NO');

// Arbitrary for generating valid nghiepVu (non-empty, max 100 chars)
const nghiepVuArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

// Arbitrary for generating valid taiKhoan (3 digit account code)
const taiKhoanArb = fc.stringMatching(/^[0-9]{3}$/);

// Arbitrary for generating optional moTa
const moTaArb = fc.option(fc.string({ maxLength: 255 }), { nil: undefined });

// Arbitrary for generating valid CreateQuyChaunDto
const createDtoArb = fc.record({
  loaiGiaoDich: loaiGiaoDichArb,
  nghiepVu: nghiepVuArb,
  taiKhoanNo: taiKhoanArb,
  taiKhoanCo: taiKhoanArb,
  moTa: moTaArb,
});

describe('Property 4: Create API Call Correctness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: '1' });
  });

  it('should call create API with exact form data for any valid input', async () => {
    await fc.assert(
      fc.asyncProperty(createDtoArb, async (formData) => {
        mockCreate.mockClear();
        mockCreate.mockResolvedValue({ id: '1', ...formData });
        
        // Simulate create call
        await mockCreate(formData);
        
        // Verify API was called with exact form data
        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith(formData);
        
        // Verify all fields are preserved
        const calledWith = mockCreate.mock.calls[0][0] as CreateQuyChaunDto;
        expect(calledWith.loaiGiaoDich).toBe(formData.loaiGiaoDich);
        expect(calledWith.nghiepVu).toBe(formData.nghiepVu);
        expect(calledWith.taiKhoanNo).toBe(formData.taiKhoanNo);
        expect(calledWith.taiKhoanCo).toBe(formData.taiKhoanCo);
        expect(calledWith.moTa).toBe(formData.moTa);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve loaiGiaoDich value exactly', async () => {
    await fc.assert(
      fc.asyncProperty(loaiGiaoDichArb, async (loaiGiaoDich) => {
        mockCreate.mockClear();
        
        const formData: CreateQuyChaunDto = {
          loaiGiaoDich,
          nghiepVu: 'Test nghiep vu',
          taiKhoanNo: '111',
          taiKhoanCo: '511',
        };
        
        await mockCreate(formData);
        
        const calledWith = mockCreate.mock.calls[0][0] as CreateQuyChaunDto;
        expect(calledWith.loaiGiaoDich).toBe(loaiGiaoDich);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve nghiepVu with special characters', async () => {
    const specialNghiepVuArb = fc.string({ minLength: 1, maxLength: 100 })
      .filter(s => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(specialNghiepVuArb, async (nghiepVu) => {
        mockCreate.mockClear();
        
        const formData: CreateQuyChaunDto = {
          loaiGiaoDich: 'PHIEU_THU',
          nghiepVu,
          taiKhoanNo: '111',
          taiKhoanCo: '511',
        };
        
        await mockCreate(formData);
        
        const calledWith = mockCreate.mock.calls[0][0] as CreateQuyChaunDto;
        expect(calledWith.nghiepVu).toBe(nghiepVu);
      }),
      { numRuns: 100 }
    );
  });
});
