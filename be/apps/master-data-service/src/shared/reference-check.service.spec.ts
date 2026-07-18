import { ConflictException } from '@nestjs/common';
import * as fc from 'fast-check';
import { ReferenceCheckService } from './reference-check.service';

/**
 * **Feature: backend-migration, Property 10: Master Data Reference Integrity**
 * **Validates: Requirements 5.6**
 *
 * For any master data record that is referenced by transactions (vouchers, payables),
 * deletion SHALL be prevented and return an error indicating the reference exists.
 */
describe('Property 10: Master Data Reference Integrity', () => {
  let referenceCheckService: ReferenceCheckService;

  beforeEach(() => {
    referenceCheckService = new ReferenceCheckService();
  });

  describe('throwIfReferencesExist', () => {
    it('should throw ConflictException when references exist', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('TaiKhoan', 'DoiTuong', 'DuAn'),
          fc.uuid(),
          (entityType, entityId) => {
            expect(() => {
              referenceCheckService.throwIfReferencesExist(
                entityType,
                entityId,
                true,
              );
            }).toThrow(ConflictException);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should not throw when no references exist', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('TaiKhoan', 'DoiTuong', 'DuAn'),
          fc.uuid(),
          (entityType, entityId) => {
            expect(() => {
              referenceCheckService.throwIfReferencesExist(
                entityType,
                entityId,
                false,
              );
            }).not.toThrow();
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should include entity type and ID in error message', () => {
      const entityType = 'TaiKhoan';
      const entityId = 'test-id-123';

      try {
        referenceCheckService.throwIfReferencesExist(
          entityType,
          entityId,
          true,
        );
        fail('Should have thrown ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).message).toContain(entityType);
        expect((error as ConflictException).message).toContain(entityId);
      }
    });
  });
});
