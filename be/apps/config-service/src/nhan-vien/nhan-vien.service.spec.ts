import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
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
    manager: { getMongoRepository: jest.Mock };
  };
  let mockMongoCounterRepo: { findOneAndUpdate: jest.Mock };
  let mockTenantContext: { getCurrentTenantId: jest.Mock };

  // In-memory per-tenant counter store to genuinely exercise sequential,
  // atomic increments across calls (keyed by tenantId, like the real
  // `employee_counters` collection).
  let counterStore: Map<string | undefined, number>;

  beforeEach(async () => {
    counterStore = new Map();

    mockEmployeeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ ...v, _id: v._id ?? 'generated-id' })),
    };

    // Simulates MongoDB's atomic findOneAndUpdate($inc, upsert) — the real
    // implementation this mock stands in for; see generateEmployeeId().
    mockMongoCounterRepo = {
      findOneAndUpdate: jest.fn(
        async (
          query: { tenantId?: string },
          update: { $inc?: { seq?: number } },
          _options?: unknown,
        ) => {
          const key = query.tenantId;
          const inc = update?.$inc?.seq ?? 0;
          const next = (counterStore.get(key) ?? 0) + inc;
          counterStore.set(key, next);
          return { tenantId: key, seq: next };
        },
      ),
    };

    mockCounterRepo = {
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn(),
      manager: {
        getMongoRepository: jest.fn(() => mockMongoCounterRepo),
      },
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
  // generateEmployeeId — atomic increment (Fix 1)
  // ──────────────────────────────────────────────────────────────────────────
  describe('generateEmployeeId — atomic increment', () => {
    it('uses an atomic $inc findOneAndUpdate keyed by the explicit tenantId, not read-then-write', async () => {
      const id = await service.generateEmployeeId(TENANT_ID);

      expect(id).toBe('NV0001');
      expect(mockCounterRepo.manager.getMongoRepository).toHaveBeenCalledWith(EmployeeCounter);
      expect(mockMongoCounterRepo.findOneAndUpdate).toHaveBeenCalledWith(
        { tenantId: TENANT_ID },
        { $inc: { seq: 1 } },
        expect.objectContaining({ upsert: true, returnDocument: 'after' }),
      );
      // The old read-modify-write path is gone entirely.
      expect(mockCounterRepo.findOne).not.toHaveBeenCalled();
      expect(mockCounterRepo.save).not.toHaveBeenCalled();
    });

    it('never mints duplicate ids for two "concurrent" calls on the same tenant', async () => {
      const [a, b] = await Promise.all([
        service.generateEmployeeId(TENANT_ID),
        service.generateEmployeeId(TENANT_ID),
      ]);

      expect(new Set([a, b]).size).toBe(2);
      expect([a, b].sort()).toEqual(['NV0001', 'NV0002']);
    });

    it('keeps independent, first-id-is-NV0001 sequences per tenant', async () => {
      const tenantA1 = await service.generateEmployeeId('tenant-a');
      const tenantB1 = await service.generateEmployeeId('tenant-b');
      const tenantA2 = await service.generateEmployeeId('tenant-a');

      expect(tenantA1).toBe('NV0001');
      expect(tenantB1).toBe('NV0001');
      expect(tenantA2).toBe('NV0002');
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
    it('returns the list of employees and defaults the where clause to isActive: true', async () => {
      const list = [
        { _id: '1', hoTen: 'Nguyen Van A', isActive: true },
        { _id: '2', hoTen: 'Tran Thi B', isActive: true },
      ];
      mockEmployeeRepo.find.mockResolvedValue(list);

      const result = await service.findAll();

      expect(result).toEqual(list);
      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({ where: { isActive: true } });
    });

    it('includes trangThai in the where clause when provided, alongside the isActive default', async () => {
      await service.findAll({ trangThai: 'da_nghi' });

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, trangThai: 'da_nghi' },
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // isActive query coercion (Fix 2) — HTTP query params arrive as strings,
    // not booleans, so the string "false" must not be treated as truthy.
    // ────────────────────────────────────────────────────────────────────────
    it('coerces the string "false" query param to boolean false', async () => {
      await service.findAll({ isActive: 'false' as any });

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({ where: { isActive: false } });
    });

    it('coerces the string "true" query param to boolean true', async () => {
      await service.findAll({ isActive: 'true' as any });

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({ where: { isActive: true } });
    });

    it('honors a real boolean false (non-HTTP callers)', async () => {
      await service.findAll({ isActive: false });

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({ where: { isActive: false } });
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

  // ──────────────────────────────────────────────────────────────────────────
  // resolveEmployeeFromUser
  // ──────────────────────────────────────────────────────────────────────────
  describe('resolveEmployeeFromUser', () => {
    it('trả về hồ sơ NV khi userId đã liên kết', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({
        _id: 'emp-1',
        hoTen: 'Nguyễn Văn Hải',
        employeeId: 'NV0001',
        userId: 'sso-sub-123',
      });

      const emp = await service.resolveEmployeeFromUser({ id: 'sso-sub-123' });

      expect(emp.hoTen).toBe('Nguyễn Văn Hải');
      expect(mockEmployeeRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'sso-sub-123', isActive: true },
      });
    });

    it('ném NotFoundException khi tài khoản chưa liên kết hồ sơ', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resolveEmployeeFromUser({ id: 'sso-sub-999' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném NotFoundException khi user không có id', async () => {
      await expect(
        service.resolveEmployeeFromUser({ id: '' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
