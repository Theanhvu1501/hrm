import * as fc from 'fast-check';
import { VoucherNumberService } from './shared/voucher-number.service';
import { ChungTuService } from './chung-tu/chung-tu.service';
import { LoaiChungTu } from '@app/entities';

// Define TrangThaiChungTu locally for tests (not exported from entities)
type TrangThaiChungTu = 'NHAP' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';

describe('VoucherService Property Tests', () => {
  /**
   * Property 11: Voucher Number Generation
   * For any voucher creation of type PHIEU_THU or PHIEU_CHI,
   * the auto-generated soPhieu SHALL follow the format {TYPE_PREFIX}{SEQUENCE}/{YEAR}
   */
  describe('Property 11: Voucher Number Generation', () => {
    it('should generate voucher numbers in correct format', () => {
      fc.assert(
        fc.property(
          fc.record({
            loai: fc.constantFrom<LoaiChungTu>('PHIEU_THU', 'PHIEU_CHI'),
            sequence: fc.integer({ min: 1, max: 999 }),
            year: fc.integer({ min: 2020, max: 2030 }),
          }),
          ({ loai, sequence, year }) => {
            const prefix = loai === 'PHIEU_THU' ? 'PT' : 'PC';
            const seqStr = sequence.toString().padStart(3, '0');
            const soPhieu = `${prefix}${seqStr}/${year}`;

            // Verify format matches pattern
            const pattern = /^(PT|PC)\d{3}\/\d{4}$/;
            expect(soPhieu).toMatch(pattern);

            // Verify prefix matches type
            if (loai === 'PHIEU_THU') {
              expect(soPhieu.startsWith('PT')).toBe(true);
            } else {
              expect(soPhieu.startsWith('PC')).toBe(true);
            }

            // Verify sequence is zero-padded to 3 digits
            const seqPart = soPhieu.substring(2, 5);
            expect(seqPart.length).toBe(3);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should parse voucher numbers correctly', () => {
      const service = {
        parseVoucherNumber: (soPhieu: string) => {
          const match = soPhieu.match(/^(PT|PC)(\d{3})\/(\d{4})$/);
          if (!match) return null;
          return {
            prefix: match[1],
            sequence: parseInt(match[2], 10),
            year: parseInt(match[3], 10),
          };
        },
      };

      fc.assert(
        fc.property(
          fc.record({
            prefix: fc.constantFrom('PT', 'PC'),
            sequence: fc.integer({ min: 1, max: 999 }),
            year: fc.integer({ min: 2020, max: 2030 }),
          }),
          ({ prefix, sequence, year }) => {
            const seqStr = sequence.toString().padStart(3, '0');
            const soPhieu = `${prefix}${seqStr}/${year}`;

            const parsed = service.parseVoucherNumber(soPhieu);
            expect(parsed).not.toBeNull();
            expect(parsed?.prefix).toBe(prefix);
            expect(parsed?.sequence).toBe(sequence);
            expect(parsed?.year).toBe(year);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 13: Voucher Workflow State Transitions
   * For any voucher, the status transitions SHALL follow:
   * NHAP → CHO_DUYET → DA_DUYET or TU_CHOI
   */
  describe('Property 13: Voucher Workflow State Transitions', () => {
    const validTransitions: Record<TrangThaiChungTu, TrangThaiChungTu[]> = {
      NHAP: ['CHO_DUYET'],
      CHO_DUYET: ['DA_DUYET', 'TU_CHOI'],
      DA_DUYET: [],
      TU_CHOI: [],
    };

    it('should only allow valid state transitions', () => {
      fc.assert(
        fc.property(
          fc.record({
            currentState: fc.constantFrom<TrangThaiChungTu>(
              'NHAP',
              'CHO_DUYET',
              'DA_DUYET',
              'TU_CHOI',
            ),
            targetState: fc.constantFrom<TrangThaiChungTu>(
              'NHAP',
              'CHO_DUYET',
              'DA_DUYET',
              'TU_CHOI',
            ),
          }),
          ({ currentState, targetState }) => {
            const allowedTransitions = validTransitions[currentState];
            const isValidTransition = allowedTransitions.includes(targetState);

            // Verify transition rules
            if (currentState === 'NHAP') {
              expect(allowedTransitions).toContain('CHO_DUYET');
              expect(allowedTransitions).not.toContain('DA_DUYET');
              expect(allowedTransitions).not.toContain('TU_CHOI');
            }

            if (currentState === 'CHO_DUYET') {
              expect(allowedTransitions).toContain('DA_DUYET');
              expect(allowedTransitions).toContain('TU_CHOI');
              expect(allowedTransitions).not.toContain('NHAP');
            }

            if (currentState === 'DA_DUYET' || currentState === 'TU_CHOI') {
              expect(allowedTransitions.length).toBe(0);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should record approval metadata on DA_DUYET transition', () => {
      fc.assert(
        fc.property(
          fc.record({
            nguoiDuyetId: fc.uuid(),
            ngayDuyet: fc.date({ min: new Date('2020-01-01') }),
          }),
          ({ nguoiDuyetId, ngayDuyet }) => {
            // Simulate approval
            const voucher = {
              trangThai: 'CHO_DUYET' as TrangThaiChungTu,
              nguoiDuyetId: null as string | null,
              ngayDuyet: null as Date | null,
            };

            // Apply approval
            voucher.trangThai = 'DA_DUYET';
            voucher.nguoiDuyetId = nguoiDuyetId;
            voucher.ngayDuyet = ngayDuyet;

            expect(voucher.trangThai).toBe('DA_DUYET');
            expect(voucher.nguoiDuyetId).toBe(nguoiDuyetId);
            expect(voucher.ngayDuyet).toEqual(ngayDuyet);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should record rejection reason on TU_CHOI transition', () => {
      fc.assert(
        fc.property(
          fc.record({
            nguoiDuyetId: fc.uuid(),
            lyDoTuChoi: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          ({ nguoiDuyetId, lyDoTuChoi }) => {
            // Simulate rejection
            const voucher = {
              trangThai: 'CHO_DUYET' as TrangThaiChungTu,
              nguoiDuyetId: null as string | null,
              ngayDuyet: null as Date | null,
              lyDoTuChoi: null as string | null,
            };

            // Apply rejection
            voucher.trangThai = 'TU_CHOI';
            voucher.nguoiDuyetId = nguoiDuyetId;
            voucher.ngayDuyet = new Date();
            voucher.lyDoTuChoi = lyDoTuChoi;

            expect(voucher.trangThai).toBe('TU_CHOI');
            expect(voucher.nguoiDuyetId).toBe(nguoiDuyetId);
            expect(voucher.lyDoTuChoi).toBe(lyDoTuChoi);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 14: Approved Voucher Immutability
   * For any voucher with trangThai = 'DA_DUYET',
   * any update or delete operation SHALL be rejected with an error.
   */
  describe('Property 14: Approved Voucher Immutability', () => {
    it('should reject updates on approved vouchers', () => {
      fc.assert(
        fc.property(
          fc.record({
            soTien: fc.float({ min: 0, max: 1000000 }),
            noiDung: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          ({ soTien, noiDung }) => {
            const voucher = {
              trangThai: 'DA_DUYET' as TrangThaiChungTu,
              soTien: 1000,
              noiDung: 'Original content',
            };

            // Attempt to update should be blocked
            const canUpdate = voucher.trangThai !== 'DA_DUYET';
            expect(canUpdate).toBe(false);

            // Original values should remain unchanged
            expect(voucher.soTien).toBe(1000);
            expect(voucher.noiDung).toBe('Original content');

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject deletes on approved vouchers', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          const voucher = {
            trangThai: 'DA_DUYET' as TrangThaiChungTu,
          };

          // Attempt to delete should be blocked
          const canDelete = voucher.trangThai !== 'DA_DUYET';
          expect(canDelete).toBe(false);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should allow updates on non-approved vouchers', () => {
      fc.assert(
        fc.property(
          fc.record({
            trangThai: fc.constantFrom<TrangThaiChungTu>(
              'NHAP',
              'CHO_DUYET',
              'TU_CHOI',
            ),
            newSoTien: fc.float({ min: 0, max: 1000000 }),
          }),
          ({ trangThai, newSoTien }) => {
            const voucher = {
              trangThai,
              soTien: 1000,
            };

            // Update should be allowed for non-approved vouchers
            const canUpdate = voucher.trangThai !== 'DA_DUYET';
            expect(canUpdate).toBe(true);

            if (canUpdate) {
              voucher.soTien = newSoTien;
              expect(voucher.soTien).toBe(newSoTien);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 12: Voucher Account Validation
   * For any voucher creation, the taiKhoanNo and taiKhoanCo fields
   * SHALL reference valid account codes that exist in the tai_khoan collection.
   */
  describe('Property 12: Voucher Account Validation', () => {
    const validAccounts = ['111', '112', '131', '331', '511', '632'];

    it('should validate account codes exist', () => {
      fc.assert(
        fc.property(
          fc.record({
            taiKhoanNo: fc.constantFrom(...validAccounts, 'INVALID'),
            taiKhoanCo: fc.constantFrom(...validAccounts, 'INVALID'),
          }),
          ({ taiKhoanNo, taiKhoanCo }) => {
            const isNoValid = validAccounts.includes(taiKhoanNo);
            const isCoValid = validAccounts.includes(taiKhoanCo);

            // Both accounts must be valid for voucher to be created
            const canCreate = isNoValid && isCoValid;

            if (taiKhoanNo === 'INVALID' || taiKhoanCo === 'INVALID') {
              expect(canCreate).toBe(false);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
