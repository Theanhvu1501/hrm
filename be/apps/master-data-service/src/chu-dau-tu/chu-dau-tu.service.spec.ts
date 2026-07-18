import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as fc from 'fast-check';
import { ChuDauTuService } from './chu-dau-tu.service';
import { ChuDauTu } from '@app/entities';
import { ObjectId } from 'mongodb';

/**
 * **Feature: danh-muc-mo-rong, Property 1: Unique Code Constraint**
 * For any master data entity (ChuDauTu), creating two records with the same `ma` value
 * should result in the second creation being rejected with a conflict error.
 */
describe('ChuDauTuService', () => {
  let service: ChuDauTuService;
  let mockRepository: any;

  const createMockChuDauTu = (
    ma: string,
    ten: string,
    moTa?: string,
  ): ChuDauTu => {
    const entity = new ChuDauTu();
    entity._id = new ObjectId();
    entity.ma = ma;
    entity.ten = ten;
    entity.moTa = moTa || '';
    entity.isActive = true;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChuDauTuService,
        {
          provide: getRepositoryToken(ChuDauTu),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ChuDauTuService>(ChuDauTuService);
  });

  describe('Property 1: Unique Code Constraint', () => {
    /**
     * **Feature: danh-muc-mo-rong, Property 1: Unique Code Constraint**
     * **Validates: Requirements 1.1**
     */
    it('should reject creation of ChuDauTu with duplicate ma', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 200 }),
          async (ma, ten, moTa) => {
            // Setup: First record exists
            const existingRecord = createMockChuDauTu(
              ma,
              'Existing',
              'Existing desc',
            );
            mockRepository.findOne.mockResolvedValue(existingRecord);

            // Act & Assert: Second creation with same ma should throw
            await expect(service.create({ ma, ten, moTa })).rejects.toThrow(
              ConflictException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should allow creation of ChuDauTu with unique ma', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 200 }),
          async (ma, ten, moTa) => {
            // Setup: No existing record
            mockRepository.findOne.mockResolvedValue(null);
            const newRecord = createMockChuDauTu(ma, ten, moTa);
            mockRepository.create.mockReturnValue(newRecord);
            mockRepository.save.mockResolvedValue(newRecord);

            // Act
            const result = await service.create({ ma, ten, moTa });

            // Assert
            expect(result.ma).toBe(ma);
            expect(result.ten).toBe(ten);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('CRUD Operations', () => {
    it('should find all active records', async () => {
      const records = [
        createMockChuDauTu('CDT001', 'Chu dau tu 1'),
        createMockChuDauTu('CDT002', 'Chu dau tu 2'),
      ];
      mockRepository.find.mockResolvedValue(records);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalled();
    });

    it('should throw NotFoundException when record not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update record successfully', async () => {
      const existingRecord = createMockChuDauTu('CDT001', 'Old Name');
      const id = existingRecord._id.toString();

      mockRepository.findOne.mockImplementation(async (options) => {
        if (options.where._id) return existingRecord;
        if (options.where.ma === 'CDT002') return null;
        return null;
      });
      mockRepository.save.mockImplementation(async (entity) => entity);

      const result = await service.update(id, {
        ten: 'New Name',
        ma: 'CDT002',
      });

      expect(result.ten).toBe('New Name');
      expect(result.ma).toBe('CDT002');
    });

    it('should soft delete record', async () => {
      const record = createMockChuDauTu('CDT001', 'Test');
      const id = record._id.toString();

      mockRepository.findOne.mockResolvedValue(record);
      mockRepository.save.mockImplementation(async (entity) => entity);

      await service.delete(id);

      expect(record.isActive).toBe(false);
      expect(mockRepository.save).toHaveBeenCalledWith(record);
    });
  });

  describe('Search', () => {
    it('should search by ma or ten', async () => {
      const records = [
        createMockChuDauTu('CDT001', 'ABC Company'),
        createMockChuDauTu('CDT002', 'XYZ Corp'),
        createMockChuDauTu('ABC003', 'Test Company'),
      ];
      mockRepository.find.mockResolvedValue(records);

      const result = await service.search('ABC');

      expect(result).toHaveLength(2);
      expect(
        result.every(
          (r) =>
            r.ma.toLowerCase().includes('abc') ||
            r.ten.toLowerCase().includes('abc'),
        ),
      ).toBe(true);
    });
  });
});
