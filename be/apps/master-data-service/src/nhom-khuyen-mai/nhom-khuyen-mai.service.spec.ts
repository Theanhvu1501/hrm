import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as fc from 'fast-check';
import { NhomKhuyenMaiService } from './nhom-khuyen-mai.service';
import { NhomKhuyenMai } from '@app/entities';
import { ObjectId } from 'mongodb';

/**
 * **Feature: danh-muc-mo-rong, Property 1: Unique Code Constraint**
 * For any master data entity (NhomKhuyenMai), creating two records with the same `ma` value
 * should result in the second creation being rejected with a conflict error.
 */
describe('NhomKhuyenMaiService', () => {
  let service: NhomKhuyenMaiService;
  let mockRepository: any;

  const createMockNhomKhuyenMai = (
    ma: string,
    ten: string,
    moTa?: string,
  ): NhomKhuyenMai => {
    const entity = new NhomKhuyenMai();
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
        NhomKhuyenMaiService,
        {
          provide: getRepositoryToken(NhomKhuyenMai),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<NhomKhuyenMaiService>(NhomKhuyenMaiService);
  });

  describe('Property 1: Unique Code Constraint', () => {
    /**
     * **Feature: danh-muc-mo-rong, Property 1: Unique Code Constraint**
     * **Validates: Requirements 2.1**
     */
    it('should reject creation of NhomKhuyenMai with duplicate ma', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 200 }),
          async (ma, ten, moTa) => {
            const existingRecord = createMockNhomKhuyenMai(
              ma,
              'Existing',
              'Existing desc',
            );
            mockRepository.findOne.mockResolvedValue(existingRecord);

            await expect(service.create({ ma, ten, moTa })).rejects.toThrow(
              ConflictException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should allow creation of NhomKhuyenMai with unique ma', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 200 }),
          async (ma, ten, moTa) => {
            mockRepository.findOne.mockResolvedValue(null);
            const newRecord = createMockNhomKhuyenMai(ma, ten, moTa);
            mockRepository.create.mockReturnValue(newRecord);
            mockRepository.save.mockResolvedValue(newRecord);

            const result = await service.create({ ma, ten, moTa });

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
        createMockNhomKhuyenMai('NKM001', 'Nhom 1'),
        createMockNhomKhuyenMai('NKM002', 'Nhom 2'),
      ];
      mockRepository.find.mockResolvedValue(records);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException when record not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
