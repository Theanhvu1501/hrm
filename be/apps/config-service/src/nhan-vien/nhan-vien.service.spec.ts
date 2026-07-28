import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { NhanVien_Service } from './nhan-vien.service';
import { Employee, EmployeeCounter } from '@app/entities';
import { TenantContextService } from '@app/core';
import { QuyPhep_Service } from '../quy-phep/quy-phep.service';

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
      save: jest.fn((v) =>
        Promise.resolve({ ...v, _id: v._id ?? 'generated-id' }),
      ),
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
        {
          provide: getRepositoryToken(EmployeeCounter),
          useValue: mockCounterRepo,
        },
        { provide: TenantContextService, useValue: mockTenantContext },
        // Không có test nào ở describe gốc này quan tâm tới mở khoá quỹ phép
        // (xem describe riêng "mở khoá quỹ phép (P3.8)" cuối file) — chỉ cần
        // đủ hình dạng để constructor tiêm được, không rớt vào undefined.
        {
          provide: QuyPhep_Service,
          useValue: { moKhoaLenChinhThuc: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get<NhanVien_Service>(NhanVien_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create — employeeId generation
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — employeeId generation', () => {
    it('generates sequential employeeId NV0001 then NV0002', async () => {
      const first = await service.create({
        hoTen: 'Nguyen Van A',
        cccd: '001111111111',
      } as any);
      expect(first.employeeId).toBe('NV0001');

      const second = await service.create({
        hoTen: 'Tran Thi B',
        cccd: '002222222222',
      } as any);
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
      expect(mockCounterRepo.manager.getMongoRepository).toHaveBeenCalledWith(
        EmployeeCounter,
      );
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

    // ──────────────────────────────────────────────────────────────────────
    // userId dedup — same shape as cccd, but userId is optional: only
    // enforced when a real value is provided.
    // ──────────────────────────────────────────────────────────────────────
    it('throws ConflictException when userId already belongs to another employee', async () => {
      // First findOne call = cccd check (no dup), second = userId check (dup found)
      mockEmployeeRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: 'existing-id', userId: 'sso-sub-123' });

      await expect(
        service.create({
          hoTen: 'Nguyen Van A',
          cccd: '005555555555',
          userId: 'sso-sub-123',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('succeeds when userId is provided and not yet used by anyone', async () => {
      const result = await service.create({
        hoTen: 'Nguyen Van A',
        cccd: '006666666666',
        userId: 'sso-sub-456',
      } as any);

      expect(result.employeeId).toBe('NV0001');
      expect(result.userId).toBe('sso-sub-456');
    });

    it('succeeds without checking userId duplication when userId is not provided', async () => {
      const result = await service.create({
        hoTen: 'Nguyen Van A',
        cccd: '007777777777',
      } as any);

      expect(result.employeeId).toBe('NV0001');
      // Only the cccd lookup should have happened, not a userId lookup
      expect(mockEmployeeRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('allows two employees to both have an empty userId', async () => {
      // Neither create() call supplies userId — the dedup check must be
      // skipped both times, so cccd is the only lookup performed each time.
      await service.create({
        hoTen: 'Nguyen Van A',
        cccd: '008888888888',
      } as any);
      await service.create({
        hoTen: 'Tran Thi B',
        cccd: '009999999999',
      } as any);

      expect(mockEmployeeRepo.findOne).toHaveBeenCalledTimes(2);
    });

    /**
     * Cùng lý do như ở `update`: hồ sơ xoá mềm phải nhả tài khoản ra, nếu
     * không thì tạo hồ sơ mới cho đúng người đó cũng bị chặn 409 vĩnh viễn.
     */
    it('truy vấn kiểm trùng userId chỉ xét hồ sơ còn hiệu lực (isActive: true)', async () => {
      await service.create({
        hoTen: 'Nguyen Van A',
        cccd: '004444444444',
        userId: 'sso-sub-789',
      } as any);

      expect(mockEmployeeRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: { userId: 'sso-sub-789', isActive: true },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // update — userId dedup
  // ──────────────────────────────────────────────────────────────────────────
  describe('update — userId dedup', () => {
    const id = '507f1f77bcf86cd799439011';

    it('throws ConflictException when the new userId already belongs to another employee', async () => {
      const existingItem = {
        _id: id,
        hoTen: 'Nguyen Van A',
        cccd: '001111111111',
        userId: undefined,
      };
      // findOne(id) via service.findOne, then the userId dedup lookup
      mockEmployeeRepo.findOne
        .mockResolvedValueOnce(existingItem)
        .mockResolvedValueOnce({ _id: 'other-id', userId: 'sso-sub-123' });

      await expect(
        service.update(id, { userId: 'sso-sub-123' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('does not treat the current employee own userId as a duplicate of itself', async () => {
      const existingItem = {
        _id: id,
        hoTen: 'Nguyen Van A',
        cccd: '001111111111',
        userId: 'sso-sub-123',
      };
      // Only the findOne(id) lookup should occur — since dto.userId ===
      // item.userId, the dedup check is skipped entirely.
      mockEmployeeRepo.findOne.mockResolvedValueOnce(existingItem);

      const result = await service.update(id, { userId: 'sso-sub-123' } as any);

      expect(result.userId).toBe('sso-sub-123');
      expect(mockEmployeeRepo.findOne).toHaveBeenCalledTimes(1);
    });

    /**
     * Hồ sơ xoá mềm (`isActive: false`) PHẢI nhả tài khoản ra. Nếu truy vấn
     * kiểm trùng không lọc `isActive` thì `userId` bị giam vĩnh viễn ở một
     * hồ sơ đã xoá: HR không gán lại được cho ai, và người đó mất hẳn đường
     * chấm công cho tới khi có người sửa thẳng MongoDB.
     */
    it('truy vấn kiểm trùng userId chỉ xét hồ sơ còn hiệu lực (isActive: true)', async () => {
      const existingItem = {
        _id: id,
        hoTen: 'Nguyen Van B',
        cccd: '001111111112',
        userId: undefined,
      };
      mockEmployeeRepo.findOne
        .mockResolvedValueOnce(existingItem)
        .mockResolvedValueOnce(null);

      await service.update(id, { userId: 'sso-sub-123' } as any);

      expect(mockEmployeeRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: { userId: 'sso-sub-123', isActive: true },
      });
    });

    /**
     * Đường thoát khi HR gán nhầm tài khoản: FE gửi chuỗi rỗng (không phải
     * `undefined` — `JSON.stringify` sẽ loại hẳn khoá `undefined` khỏi body
     * và `Object.assign` không đổi gì). Chuỗi rỗng phải đi thẳng vào bản ghi
     * và KHÔNG được kích hoạt nhánh kiểm trùng.
     */
    it('gửi userId chuỗi rỗng thì gỡ liên kết, không kiểm trùng', async () => {
      const existingItem = {
        _id: id,
        hoTen: 'Nguyen Van A',
        cccd: '001111111111',
        userId: 'sso-sub-123',
        workShiftId: 'shift-1',
      };
      mockEmployeeRepo.findOne.mockResolvedValueOnce(existingItem);

      const result = await service.update(id, {
        userId: '',
        workShiftId: '',
      } as any);

      expect(result.userId).toBe('');
      expect(result.workShiftId).toBe('');
      // Chỉ findOne(id); nhánh `if (dto.userId && ...)` bỏ qua chuỗi rỗng.
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
      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
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

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: { isActive: false },
      });
    });

    it('coerces the string "true" query param to boolean true', async () => {
      await service.findAll({ isActive: 'true' as any });

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('honors a real boolean false (non-HTTP callers)', async () => {
      await service.findAll({ isActive: false });

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: { isActive: false },
      });
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
      await expect(service.resolveEmployeeFromUser({ id: '' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // choPhepChamNgoaiVung — cờ HR bật cho từng người, mở khoá chấm công ngoài
  // bán kính (P3.5 mặc định chặn, xem employee.entity.ts).
  // ──────────────────────────────────────────────────────────────────────────
  describe('choPhepChamNgoaiVung', () => {
    it('lưu được cờ cho phép chấm ngoài vùng', async () => {
      await service.create({
        hoTen: 'Nguyễn Văn Hải',
        cccd: '001',
        choPhepChamNgoaiVung: true,
      } as any);

      expect(mockEmployeeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ choPhepChamNgoaiVung: true }),
      );
    });

    /**
     * Tắt cờ phải ghi được `false`, không phải bỏ trường đi. Nếu DTO nuốt mất
     * `false` thì HR bỏ tick sẽ không bao giờ gỡ được quyền đã cấp — đúng lỗi
     * đã gặp với ngayLamViecTrongTuan ở P3.1.
     */
    it('tắt cờ ghi false, không phải bỏ trường', async () => {
      const id = '507f1f77bcf86cd799439011';
      mockEmployeeRepo.findOne.mockResolvedValueOnce({
        _id: id,
        hoTen: 'Nguyễn Văn Hải',
        cccd: '001',
        choPhepChamNgoaiVung: true,
      });

      await service.update(id, { choPhepChamNgoaiVung: false } as any);

      const daGhi = mockEmployeeRepo.save.mock.calls.at(-1)?.[0];
      expect(daGhi).toHaveProperty('choPhepChamNgoaiVung', false);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// mở khoá quỹ phép (P3.8, Task 9) — harness RIÊNG, không dùng
// mockEmployeeRepo ở trên. Nhóm test này cần đọc lại đúng `ngayChinhThuc`
// đã lưu TRƯỚC khi update() ghi đè (để phân biệt "vừa đổi" khỏi "giữ
// nguyên"), nên mượn kiểu repo giả có trạng thái thật từ
// quy-phep.service.spec.ts: find/findOne/save xử lý cả tạo mới lẫn cập nhật,
// và find/findOne trả BẢN SAO NÔNG (không phải tham chiếu sống) để buộc mọi
// thay đổi phải đi qua save() — đúng hành vi TypeORM thật.
// ──────────────────────────────────────────────────────────────────────────
function taoRepoNvGia(banDau: any[] = []) {
  const kho: any[] = [...banDau];
  let seq = 0;
  return {
    kho,
    create: (x: any) => ({ ...x }),
    save: async (x: any) => {
      if (!x._id) {
        seq += 1;
        // Hex 24 ký tự thật: NhanVien_Service.findOne() gọi `new ObjectId(id)`.
        x._id = { toString: () => seq.toString(16).padStart(24, '0') };
        kho.push(x);
        return { ...x };
      }
      const idx = kho.findIndex((y) => String(y._id) === String(x._id));
      if (idx === -1) kho.push(x);
      else kho[idx] = { ...x };
      return { ...x };
    },
    find: async ({ where }: any = {}) =>
      kho
        .filter((x) =>
          Object.entries(where ?? {}).every(([k, v]) => x[k] === v),
        )
        .map((x) => ({ ...x })),
    findOne: async ({ where }: any) => {
      const x = kho.find((x) =>
        Object.entries(where ?? {}).every(
          ([k, v]) => String(x[k]) === String(v),
        ),
      );
      return x ? { ...x } : null;
    },
  };
}

/**
 * Dựng NhanVien_Service với repo NV giả có trạng thái thật + một
 * QuyPhep_Service giả (mặc định `moKhoaLenChinhThuc` resolve `[]`, ghi đè
 * qua `opts.quyPhep`). `counterRepo` chỉ cần đủ hình dạng cho constructor —
 * các test ở đây không đi qua generateEmployeeId() qua service.create()
 * (dùng repoNv.save() thẳng để dựng dữ liệu ban đầu), trừ khi test tự gọi
 * service.create().
 */
async function dungServiceNhanVien(opts: { quyPhep?: any } = {}) {
  const repoNv = taoRepoNvGia();
  const counterStore = new Map<string | undefined, number>();
  const counterRepo = {
    manager: {
      getMongoRepository: () => ({
        findOneAndUpdate: async (query: any, update: any) => {
          const key = query?.tenantId;
          const inc = update?.$inc?.seq ?? 0;
          const next = (counterStore.get(key) ?? 0) + inc;
          counterStore.set(key, next);
          return { tenantId: key, seq: next };
        },
      }),
    },
  };
  const tenantContext = { getCurrentTenantId: () => 'test-tenant-id' };
  const quyPhep = opts.quyPhep ?? {
    moKhoaLenChinhThuc: jest.fn().mockResolvedValue([]),
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      NhanVien_Service,
      { provide: getRepositoryToken(Employee), useValue: repoNv },
      { provide: getRepositoryToken(EmployeeCounter), useValue: counterRepo },
      { provide: TenantContextService, useValue: tenantContext },
      { provide: QuyPhep_Service, useValue: quyPhep },
    ],
  }).compile();

  return { service: moduleRef.get(NhanVien_Service), repoNv, quyPhep };
}

describe('NhanVien_Service — mở khoá quỹ phép (P3.8)', () => {
  it('điền ngayChinhThuc lần đầu → gọi moKhoaLenChinhThuc', async () => {
    const quyPhep = { moKhoaLenChinhThuc: jest.fn().mockResolvedValue([]) };
    const { service, repoNv } = await dungServiceNhanVien({ quyPhep });
    const nv = await repoNv.save({
      hoTen: 'A',
      cccd: '001',
      ngayVaoLam: '2026-08-01',
      isActive: true,
    });

    await service.update(String(nv._id), {
      ngayChinhThuc: '2026-10-01',
    } as any);

    expect(quyPhep.moKhoaLenChinhThuc).toHaveBeenCalledWith(
      String(nv._id),
      expect.any(String),
    );
  });

  it('sửa hồ sơ mà KHÔNG đổi ngayChinhThuc → không gọi lại', async () => {
    const quyPhep = { moKhoaLenChinhThuc: jest.fn() };
    const { service, repoNv } = await dungServiceNhanVien({ quyPhep });
    const nv = await repoNv.save({
      hoTen: 'A',
      cccd: '001',
      ngayVaoLam: '2026-08-01',
      ngayChinhThuc: '2026-10-01',
      isActive: true,
    });

    await service.update(String(nv._id), {
      soDienThoai: '0900',
    } as any);

    expect(quyPhep.moKhoaLenChinhThuc).not.toHaveBeenCalled();
  });

  it('lỗi cấp quỹ KHÔNG làm hỏng việc lưu hồ sơ', async () => {
    const quyPhep = {
      moKhoaLenChinhThuc: jest.fn().mockRejectedValue(new Error('db sập')),
    };
    const { service, repoNv } = await dungServiceNhanVien({ quyPhep });
    const nv = await repoNv.save({
      hoTen: 'A',
      cccd: '001',
      ngayVaoLam: '2026-08-01',
      isActive: true,
    });

    const daLuu = await service.update(String(nv._id), {
      ngayChinhThuc: '2026-10-01',
    } as any);

    expect(daLuu.ngayChinhThuc).toBe('2026-10-01');
  });

  // (P3.8 review round 4, IMPORTANT 10): log lỗi PHẢI kèm employeeId — đây là
  // tín hiệu DUY NHẤT cho biết quỹ của MỘT NGƯỜI CỤ THỂ đã âm thầm không được
  // cấp. Trước fix, log chỉ có mỗi thông điệp chung chung, không ai lần ra
  // được nhân viên nào cần cấp bù tay.
  it('lỗi cấp quỹ ghi log KÈM employeeId, không chỉ mỗi thông điệp chung chung', async () => {
    const quyPhep = {
      moKhoaLenChinhThuc: jest.fn().mockRejectedValue(new Error('db sập')),
    };
    const { service, repoNv } = await dungServiceNhanVien({ quyPhep });
    const nv = await repoNv.save({
      hoTen: 'A',
      cccd: '001',
      ngayVaoLam: '2026-08-01',
      isActive: true,
    });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await service.update(String(nv._id), {
      ngayChinhThuc: '2026-10-01',
    } as any);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining(String(nv._id)),
      expect.any(Error),
    );
    spy.mockRestore();
  });

  /**
   * Hồ sơ nhập liệu từ hệ thống cũ có thể tạo mới với `ngayChinhThuc` đã có
   * sẵn (NV đã chính thức từ trước, chỉ mới được đưa vào hệ thống nhân sự
   * này) — không thể đợi một lần update() sau đó mới mở khoá quỹ, vì có thể
   * sẽ không có lần update() nào đổi ngayChinhThuc nữa.
   */
  it('create() với ngayChinhThuc có sẵn → cũng gọi moKhoaLenChinhThuc', async () => {
    const quyPhep = { moKhoaLenChinhThuc: jest.fn().mockResolvedValue([]) };
    const { service, quyPhep: quyPhepGia } = await dungServiceNhanVien({
      quyPhep,
    });

    const daTao = await service.create({
      hoTen: 'Nguyễn Văn A',
      cccd: '001',
      ngayVaoLam: '2026-08-01',
      ngayChinhThuc: '2026-10-01',
    } as any);

    expect(quyPhepGia.moKhoaLenChinhThuc).toHaveBeenCalledWith(
      String((daTao as any)._id),
      expect.any(String),
    );
  });

  it('create() không có ngayChinhThuc → không gọi moKhoaLenChinhThuc', async () => {
    const quyPhep = { moKhoaLenChinhThuc: jest.fn() };
    const { service } = await dungServiceNhanVien({ quyPhep });

    await service.create({
      hoTen: 'Nguyễn Văn A',
      cccd: '001',
      ngayVaoLam: '2026-08-01',
    } as any);

    expect(quyPhep.moKhoaLenChinhThuc).not.toHaveBeenCalled();
  });
});
