import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { NhanVien_Service } from './nhan-vien.service';
import { Employee, EmployeeCounter } from '@app/entities';
import { TenantContextService } from '@app/core';

const TENANT_ID = 'test-tenant-id';

describe('NhanVien_Service', () => {
  let service: NhanVien_Service;
  let mockEmployeeRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockCounterRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockTenantContext: { getCurrentTenantId: jest.Mock };

  // In-memory counter store to genuinely exercise sequential increments across calls
  let counterStore: { seq: number } | null;

  beforeEach(async () => {
    counterStore = null;

    mockEmployeeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ ...v, _id: v._id ?? 'generated-id' })),
    };

    mockCounterRepo = {
      findOne: jest.fn(async () => (counterStore ? { ...counterStore } : null)),
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => {
        counterStore = { seq: v.seq };
        return v;
      }),
    };

    mockTenantContext = {
      getCurrentTenantId: jest.fn().mockReturnValue(TENANT_ID),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NhanVien_Service,
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(EmployeeCounter), useValue: mockCounterRepo },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    service = module.get<NhanVien_Service>(NhanVien_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — employeeId generation
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — employeeId generation', () => {
    it('generates sequential employeeId NV0001 then NV0002', async () => {
      const first = await service.create({ hoTen: 'Nguyen Van A', cccd: '001111111111' } as any);
      expect(first.employeeId).toBe('NV0001');

      const second = await service.create({ hoTen: 'Tran Thi B', cccd: '002222222222' } as any);
      expect(second.employeeId).toBe('NV0002');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — dedup
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — dedup', () => {
    it('throws ConflictException when cccd already exists', async () => {
      mockEmployeeRepo.findOne.mockResolvedValueOnce({
        _id: 'existing-id',
        cccd: '001111111111',
        hoTen: 'Existing Employee',
      });

      await expect(
        service.create({ hoTen: 'Nguyen Van A', cccd: '001111111111' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when mst already exists (only when mst provided)', async () => {
      // First findOne call = cccd check (no dup), second = mst check (dup found)
      mockEmployeeRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: 'existing-id', mst: '0101234567' });

      await expect(
        service.create({
          hoTen: 'Nguyen Van A',
          cccd: '003333333333',
          mst: '0101234567',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('does not check mst duplication when mst is not provided', async () => {
      const result = await service.create({
        hoTen: 'Nguyen Van A',
        cccd: '004444444444',
      } as any);

      expect(result.employeeId).toBe('NV0001');
      // Only the cccd lookup should have happened, not an mst lookup
      expect(mockEmployeeRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns the list of employees', async () => {
      const list = [
        { _id: '1', hoTen: 'Nguyen Van A', isActive: true },
        { _id: '2', hoTen: 'Tran Thi B', isActive: true },
      ];
      mockEmployeeRepo.find.mockResolvedValue(list);

      const result = await service.findAll();

      expect(result).toEqual(list);
      expect(mockEmployeeRepo.find).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // remove — soft delete
  // ──────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('sets isActive=false instead of hard deleting', async () => {
      const id = '507f1f77bcf86cd799439011';
      const existing = { _id: id, hoTen: 'Nguyen Van A', isActive: true };
      mockEmployeeRepo.findOne.mockResolvedValue(existing);

      await service.remove(id);

      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });
});
