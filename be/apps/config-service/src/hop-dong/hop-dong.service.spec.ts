import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { HopDong_Service } from './hop-dong.service';
import { LaborContract, ContractCounter } from '@app/entities';
import { TenantContextService } from '@app/core';

const TENANT_ID = 'test-tenant-id';

describe('HopDong_Service', () => {
  let service: HopDong_Service;
  let mockContractRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
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
  // `contract_counters` collection).
  let counterStore: Map<string | undefined, number>;

  beforeEach(async () => {
    counterStore = new Map();

    mockContractRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ ...v, _id: v._id ?? 'generated-id' })),
    };

    // Simulates MongoDB's atomic findOneAndUpdate($inc, upsert) — the real
    // implementation this mock stands in for; see generateContractNo().
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
        HopDong_Service,
        { provide: getRepositoryToken(LaborContract), useValue: mockContractRepo },
        { provide: getRepositoryToken(ContractCounter), useValue: mockCounterRepo },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    service = module.get<HopDong_Service>(HopDong_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — contractNo generation
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — contractNo generation', () => {
    it('generates sequential contractNo HD0001 then HD0002', async () => {
      const first = await service.create({
        employeeId: 'emp-1',
        loaiHopDong: 'thu_viec',
      } as any);
      expect(first.contractNo).toBe('HD0001');

      const second = await service.create({
        employeeId: 'emp-2',
        loaiHopDong: 'thu_viec',
      } as any);
      expect(second.contractNo).toBe('HD0002');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // generateContractNo — atomic increment
  // ──────────────────────────────────────────────────────────────────────────
  describe('generateContractNo — atomic increment', () => {
    it('uses an atomic $inc findOneAndUpdate keyed by the explicit tenantId, not read-then-write', async () => {
      const no = await service.generateContractNo(TENANT_ID);

      expect(no).toBe('HD0001');
      expect(mockCounterRepo.manager.getMongoRepository).toHaveBeenCalledWith(ContractCounter);
      expect(mockMongoCounterRepo.findOneAndUpdate).toHaveBeenCalledWith(
        { tenantId: TENANT_ID },
        { $inc: { seq: 1 } },
        expect.objectContaining({ upsert: true, returnDocument: 'after' }),
      );
      expect(mockCounterRepo.findOne).not.toHaveBeenCalled();
      expect(mockCounterRepo.save).not.toHaveBeenCalled();
    });

    it('never mints duplicate contract numbers for two "concurrent" calls on the same tenant', async () => {
      const [a, b] = await Promise.all([
        service.generateContractNo(TENANT_ID),
        service.generateContractNo(TENANT_ID),
      ]);

      expect(new Set([a, b]).size).toBe(2);
      expect([a, b].sort()).toEqual(['HD0001', 'HD0002']);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — VN labor-law rule: max 2 fixed-term (xac_dinh_thoi_han) contracts
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — quy tắc luật 2 lần HĐ xác định thời hạn', () => {
    it('throws ConflictException on the 3rd xac_dinh_thoi_han contract for the same employee', async () => {
      // 2 existing active fixed-term contracts → find() returns both.
      mockContractRepo.find.mockResolvedValueOnce([
        { _id: 'c1', employeeId: 'emp-1', loaiHopDong: 'xac_dinh_thoi_han', isActive: true },
        { _id: 'c2', employeeId: 'emp-1', loaiHopDong: 'xac_dinh_thoi_han', isActive: true },
      ]);

      await expect(
        service.create({
          employeeId: 'emp-1',
          loaiHopDong: 'xac_dinh_thoi_han',
        } as any),
      ).rejects.toThrow(ConflictException);

      // Rule uses find({ where }) (NOT count — MongoRepository.count ignores
      // FindManyOptions.where), then counts the array length.
      expect(mockContractRepo.find).toHaveBeenCalledWith({
        where: {
          employeeId: 'emp-1',
          loaiHopDong: 'xac_dinh_thoi_han',
          isActive: true,
        },
      });
    });

    it('allows the 2nd xac_dinh_thoi_han contract (only 1 existing)', async () => {
      mockContractRepo.find.mockResolvedValueOnce([
        { _id: 'c1', employeeId: 'emp-1', loaiHopDong: 'xac_dinh_thoi_han', isActive: true },
      ]);

      const result = await service.create({
        employeeId: 'emp-1',
        loaiHopDong: 'xac_dinh_thoi_han',
      } as any);

      expect(result.contractNo).toBe('HD0001');
    });

    it('does not block khong_xac_dinh_thoi_han even when the employee already has 2 fixed-term contracts', async () => {
      mockContractRepo.find.mockResolvedValueOnce([
        { _id: 'c1', employeeId: 'emp-1', loaiHopDong: 'xac_dinh_thoi_han', isActive: true },
        { _id: 'c2', employeeId: 'emp-1', loaiHopDong: 'xac_dinh_thoi_han', isActive: true },
      ]);

      const result = await service.create({
        employeeId: 'emp-1',
        loaiHopDong: 'khong_xac_dinh_thoi_han',
      } as any);

      expect(result.contractNo).toBe('HD0001');
      // Rule only applies to xac_dinh_thoi_han, so the rule's find() check
      // should be skipped entirely for other contract types.
      expect(mockContractRepo.find).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // update — re-check the same rule (closes the PUT bypass)
  // ──────────────────────────────────────────────────────────────────────────
  describe('update — quy tắc luật 2 lần HĐ xác định thời hạn', () => {
    it('throws ConflictException when editing loaiHopDong to xac_dinh_thoi_han and the employee already has 2 OTHER active fixed-term contracts', async () => {
      const id = '507f1f77bcf86cd799439011';
      const existing = {
        _id: id,
        employeeId: 'emp-1',
        loaiHopDong: 'thu_viec',
        isActive: true,
      };
      mockContractRepo.findOne.mockResolvedValue(existing);
      mockContractRepo.find.mockResolvedValueOnce([
        { _id: 'other-1', employeeId: 'emp-1', loaiHopDong: 'xac_dinh_thoi_han', isActive: true },
        { _id: 'other-2', employeeId: 'emp-1', loaiHopDong: 'xac_dinh_thoi_han', isActive: true },
      ]);

      await expect(
        service.update(id, { loaiHopDong: 'xac_dinh_thoi_han' } as any),
      ).rejects.toThrow(ConflictException);

      expect(mockContractRepo.save).not.toHaveBeenCalled();
    });

    it('allows editing loaiHopDong to xac_dinh_thoi_han when only 1 OTHER active fixed-term contract exists (self excluded from the count)', async () => {
      const id = '507f1f77bcf86cd799439011';
      const existing = {
        _id: id,
        employeeId: 'emp-1',
        loaiHopDong: 'thu_viec',
        isActive: true,
      };
      mockContractRepo.findOne.mockResolvedValue(existing);
      mockContractRepo.find.mockResolvedValueOnce([
        { _id: 'other-1', employeeId: 'emp-1', loaiHopDong: 'xac_dinh_thoi_han', isActive: true },
      ]);

      const result = await service.update(id, { loaiHopDong: 'xac_dinh_thoi_han' } as any);

      expect(result.loaiHopDong).toBe('xac_dinh_thoi_han');
      expect(mockContractRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ loaiHopDong: 'xac_dinh_thoi_han' }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns the list of contracts and defaults the where clause to isActive: true', async () => {
      const list = [
        { _id: '1', employeeId: 'emp-1', isActive: true },
        { _id: '2', employeeId: 'emp-2', isActive: true },
      ];
      mockContractRepo.find.mockResolvedValue(list);

      const result = await service.findAll();

      expect(result).toEqual(list);
      expect(mockContractRepo.find).toHaveBeenCalledWith({ where: { isActive: true } });
    });

    it('filters by employeeId', async () => {
      await service.findAll({ employeeId: 'emp-1' });

      expect(mockContractRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, employeeId: 'emp-1' },
      });
    });

    it('filters by trangThai and loaiHopDong', async () => {
      await service.findAll({ trangThai: 'dang_hieu_luc', loaiHopDong: 'thu_viec' });

      expect(mockContractRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, trangThai: 'dang_hieu_luc', loaiHopDong: 'thu_viec' },
      });
    });

    it('coerces the string "false" isActive query param to boolean false', async () => {
      await service.findAll({ isActive: 'false' as any });

      expect(mockContractRepo.find).toHaveBeenCalledWith({ where: { isActive: false } });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // remove — soft delete
  // ──────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('sets isActive=false instead of hard deleting', async () => {
      const id = '507f1f77bcf86cd799439011';
      const existing = { _id: id, employeeId: 'emp-1', isActive: true };
      mockContractRepo.findOne.mockResolvedValue(existing);

      await service.remove(id);

      expect(mockContractRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // updateStatus
  // ──────────────────────────────────────────────────────────────────────────
  describe('updateStatus', () => {
    it('updates trangThai and saves', async () => {
      const id = '507f1f77bcf86cd799439011';
      const existing = { _id: id, employeeId: 'emp-1', trangThai: 'du_thao' };
      mockContractRepo.findOne.mockResolvedValue(existing);

      const result = await service.updateStatus(id, 'dang_hieu_luc');

      expect(result.trangThai).toBe('dang_hieu_luc');
      expect(mockContractRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_hieu_luc' }),
      );
    });
  });
});
