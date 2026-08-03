import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { HopDong_Service } from './hop-dong.service';
import { LaborContract, ContractCounter, PhieuTemplate, TenantAppConfig, Employee } from '@app/entities';
import { TenantContextService } from '@app/core';
import { DEFAULT_HOP_DONG_HTML } from './lib/hopDongRender';

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
  let mockMauInRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let mockCongTyRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockEmployeeRepo: { findOne: jest.Mock };

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

    mockMauInRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ ...v, _id: v._id ?? 'tpl-id' })),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    mockCongTyRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ ...v, _id: v._id ?? 'cfg-id' })),
    };

    mockEmployeeRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HopDong_Service,
        { provide: getRepositoryToken(LaborContract), useValue: mockContractRepo },
        { provide: getRepositoryToken(ContractCounter), useValue: mockCounterRepo },
        { provide: getRepositoryToken(PhieuTemplate), useValue: mockMauInRepo },
        { provide: getRepositoryToken(TenantAppConfig), useValue: mockCongTyRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
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

  // ──────────────────────────────────────────────────────────────────────────
  // getMauIn / upsertMauIn / removeMauIn — mẫu in HĐLĐ (tái dùng PhieuTemplate)
  // ──────────────────────────────────────────────────────────────────────────
  describe('getMauIn', () => {
    it('chưa cấu hình (repo trả null) → trả mẫu mặc định, isCustom=false', async () => {
      const result = await service.getMauIn();

      expect(result.isCustom).toBe(false);
      expect(result.html).toBe(DEFAULT_HOP_DONG_HTML);
      expect(mockMauInRepo.findOne).toHaveBeenCalledWith({
        where: { loai: 'HOP_DONG_LAO_DONG' },
      });
    });

    it('đã cấu hình → trả mẫu riêng của tenant, isCustom=true', async () => {
      mockMauInRepo.findOne.mockResolvedValueOnce({ loai: 'HOP_DONG_LAO_DONG', html: '<p>Mẫu riêng</p>' });

      const result = await service.getMauIn();

      expect(result.isCustom).toBe(true);
      expect(result.html).toBe('<p>Mẫu riêng</p>');
    });
  });

  describe('upsertMauIn', () => {
    it('tạo mới khi chưa có bản ghi', async () => {
      const result = await service.upsertMauIn('<p>Mẫu mới</p>');

      expect(result.html).toBe('<p>Mẫu mới</p>');
      expect(mockMauInRepo.create).toHaveBeenCalledWith({
        loai: 'HOP_DONG_LAO_DONG',
        html: '<p>Mẫu mới</p>',
      });
      expect(mockMauInRepo.save).toHaveBeenCalled();
    });

    it('cập nhật bản ghi cũ khi đã tồn tại', async () => {
      const existing = { loai: 'HOP_DONG_LAO_DONG', html: '<p>Cũ</p>' };
      mockMauInRepo.findOne.mockResolvedValueOnce(existing);

      await service.upsertMauIn('<p>Mới</p>');

      expect(mockMauInRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ html: '<p>Mới</p>' }),
      );
      expect(mockMauInRepo.create).not.toHaveBeenCalled();
    });

    it('lọc bỏ thẻ <script> khỏi HTML trước khi lưu (chặn XSS từ mẫu tenant tự soạn)', async () => {
      await service.upsertMauIn('<p>ok</p><script>alert(1)</script>');

      expect(mockMauInRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ html: expect.not.stringContaining('<script') }),
      );
    });

    it('lọc payload XSS thật (onerror qua "/", không phải khoảng trắng) — regex cũ để lọt, sanitize-html thì không', async () => {
      await service.upsertMauIn('<img src=x/onerror=alert(1)>');

      expect(mockMauInRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ html: expect.not.stringContaining('onerror') }),
      );
    });

    it('ném BadRequestException khi mẫu dùng token không tồn tại (lỗi gõ), KHÔNG lưu gì (review Important #7)', async () => {
      await expect(service.upsertMauIn('<p>Lương: {{mucLuongg}}</p>')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockMauInRepo.findOne).not.toHaveBeenCalled();
      expect(mockMauInRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('removeMauIn', () => {
    it('xoá bản ghi khi tồn tại (khôi phục mặc định)', async () => {
      const existing = { loai: 'HOP_DONG_LAO_DONG', html: '<p>Cũ</p>' };
      mockMauInRepo.findOne.mockResolvedValueOnce(existing);

      await service.removeMauIn();

      expect(mockMauInRepo.remove).toHaveBeenCalledWith(existing);
    });

    it('không lỗi khi chưa có bản ghi để xoá', async () => {
      await expect(service.removeMauIn()).resolves.toBeUndefined();
      expect(mockMauInRepo.remove).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getThongTinCongTy / upsertThongTinCongTy — letterhead công ty (TenantAppConfig)
  // ──────────────────────────────────────────────────────────────────────────
  describe('getThongTinCongTy', () => {
    it('chưa cấu hình → mọi trường null (KHÔNG bịa giá trị)', async () => {
      const result = await service.getThongTinCongTy();

      expect(result).toEqual({
        tenCongTy: null,
        diaChiCongTy: null,
        maSoThue: null,
        nguoiDaiDien: null,
        chucVuNguoiDaiDien: null,
        thanhPhoKy: null,
        maHopDongMau: null,
      });
    });

    it('đã cấu hình → trả đúng giá trị đã lưu', async () => {
      mockCongTyRepo.findOne.mockResolvedValueOnce({
        tenCongTy: 'CÔNG TY CỔ PHẦN MASTER CEO',
        diaChiCongTy: 'Hà Nội',
        maSoThue: '0110595215',
        nguoiDaiDien: 'Nguyễn Thị Mai Phương',
        chucVuNguoiDaiDien: 'Giám đốc',
      });

      const result = await service.getThongTinCongTy();

      expect(result.tenCongTy).toBe('CÔNG TY CỔ PHẦN MASTER CEO');
      expect(result.maSoThue).toBe('0110595215');
    });

    // review Critical 3: TenantAppConfig nằm trong TENANT_EXEMPT_ENTITIES —
    // proxy KHÔNG tự lọc tenantId. Trước bản vá `findOne({ where: {} })` lấy
    // ĐẠI document đầu tiên Mongo trả, bất kể tenant nào — có thể đọc/in tên
    // công ty của TENANT KHÁC. Test này assert ĐÚNG filter được gửi xuống
    // repo, không chỉ assert kết quả (mock luôn trả giá trị đã set sẵn nên
    // assert riêng kết quả sẽ KHÔNG bắt được lỗi thiếu filter — đây chính là
    // lý do 1374 test trước đó không phát hiện ra).
    it('LUÔN lọc theo tenantId hiện tại — không được lấy đại document đầu tiên', async () => {
      await service.getThongTinCongTy();

      expect(mockCongTyRepo.findOne).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
      });
    });
  });

  describe('upsertThongTinCongTy', () => {
    it('tạo mới khi tenant chưa có TenantAppConfig cho thông tin này', async () => {
      const result = await service.upsertThongTinCongTy({ tenCongTy: 'ABC', maSoThue: '123' });

      expect(result.tenCongTy).toBe('ABC');
      expect(mockCongTyRepo.save).toHaveBeenCalled();
    });

    it('cập nhật (giữ nguyên trường không truyền) khi đã có bản ghi', async () => {
      mockCongTyRepo.findOne.mockResolvedValueOnce({
        tenCongTy: 'CŨ',
        diaChiCongTy: 'Địa chỉ cũ',
      });

      const result = await service.upsertThongTinCongTy({ tenCongTy: 'MỚI' });

      expect(result.tenCongTy).toBe('MỚI');
      expect(result.diaChiCongTy).toBe('Địa chỉ cũ');
    });

    it('LUÔN lọc theo tenantId hiện tại lúc TÌM bản ghi cũ (review Critical 3)', async () => {
      await service.upsertThongTinCongTy({ tenCongTy: 'ABC' });

      expect(mockCongTyRepo.findOne).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
      });
    });

    it('gắn tenantId khi TẠO MỚI — không được để trống (review Critical 3: tránh ghi document không tenant, dễ bị đọc nhầm sau này)', async () => {
      await service.upsertThongTinCongTy({ tenCongTy: 'ABC' });

      expect(mockCongTyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // renderHopDong — ghép template + hợp đồng + nhân viên + công ty
  // ──────────────────────────────────────────────────────────────────────────
  describe('renderHopDong', () => {
    const contractId = '507f1f77bcf86cd799439011';
    const employeeId = '507f1f77bcf86cd799439022';

    it('ném NotFoundException khi hợp đồng không tồn tại', async () => {
      mockContractRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.renderHopDong(contractId)).rejects.toThrow(NotFoundException);
    });

    it('ném NotFoundException khi nhân viên của hợp đồng không còn tồn tại', async () => {
      mockContractRepo.findOne.mockResolvedValueOnce({
        _id: contractId,
        contractNo: 'HD0001',
        employeeId,
        loaiHopDong: 'thu_viec',
      });
      mockEmployeeRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.renderHopDong(contractId)).rejects.toThrow(NotFoundException);
    });

    it('ghép đủ dữ liệu hợp đồng + nhân viên + công ty ra HTML, kèm danh sách cảnh báo', async () => {
      mockContractRepo.findOne.mockResolvedValueOnce({
        _id: contractId,
        contractNo: 'HD0001',
        employeeId,
        loaiHopDong: 'thu_viec',
        ngayBatDau: '2026-08-01',
        mucLuong: 5000000,
      });
      mockEmployeeRepo.findOne.mockResolvedValueOnce({
        _id: employeeId,
        hoTen: 'Trần Thị B',
        cccd: '001199001122',
      });
      mockCongTyRepo.findOne.mockResolvedValueOnce({ tenCongTy: 'CÔNG TY ABC' });

      const result = await service.renderHopDong(contractId);

      expect(result.html).toContain('Trần Thị B');
      expect(result.html).toContain('HD0001');
      expect(result.html).toContain('CÔNG TY ABC');
      expect(Array.isArray(result.canhBao)).toBe(true);
      expect(result.canhBao.length).toBeGreaterThan(0);
    });

    it('dùng mẫu riêng của tenant nếu đã cấu hình thay vì mẫu mặc định', async () => {
      mockContractRepo.findOne.mockResolvedValueOnce({
        _id: contractId,
        contractNo: 'HD0001',
        employeeId,
        loaiHopDong: 'thu_viec',
      });
      mockEmployeeRepo.findOne.mockResolvedValueOnce({ _id: employeeId, hoTen: 'C' });
      mockMauInRepo.findOne.mockResolvedValueOnce({
        loai: 'HOP_DONG_LAO_DONG',
        html: '<p>Mẫu riêng — NV: {{hoTenNLD}}</p>',
      });

      const result = await service.renderHopDong(contractId);

      // html luôn có tiền tố <style>TRUSTED_PRINT_CSS</style> (review Critical
      // 1 vòng 2 — CSS in không đi qua sanitize/tenant không chỉnh được).
      expect(result.html.endsWith('<p>Mẫu riêng — NV: C</p>')).toBe(true);
    });

    it('ưu tiên chucDanh SNAPSHOT trên hợp đồng hơn chức danh HIỆN TẠI của nhân viên (review Important #4)', async () => {
      mockContractRepo.findOne.mockResolvedValueOnce({
        _id: contractId,
        contractNo: 'HD0001',
        employeeId,
        loaiHopDong: 'thu_viec',
        chucDanh: 'Trưởng phòng (lúc ký)',
      });
      mockEmployeeRepo.findOne.mockResolvedValueOnce({
        _id: employeeId,
        hoTen: 'C',
        chucDanh: 'Giám đốc (hiện tại)',
      });
      mockMauInRepo.findOne.mockResolvedValueOnce({
        loai: 'HOP_DONG_LAO_DONG',
        html: '<p>{{chucDanh}}</p>',
      });

      const result = await service.renderHopDong(contractId);

      expect(result.html.endsWith('<p>Trưởng phòng (lúc ký)</p>')).toBe(true);
    });

    // review Minor: id/employeeId sai định dạng trước bản vá này ném BSONError
    // (500 thô) thay vì NotFoundException (404 sạch).
    it('id hợp đồng sai định dạng ObjectId → NotFoundException, không phải lỗi 500 thô', async () => {
      await expect(service.renderHopDong('khong-phai-object-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('employeeId lưu trên hợp đồng sai định dạng ObjectId → NotFoundException, không phải lỗi 500 thô', async () => {
      mockContractRepo.findOne.mockResolvedValueOnce({
        _id: contractId,
        contractNo: 'HD0001',
        employeeId: 'khong-phai-object-id',
        loaiHopDong: 'thu_viec',
      });

      await expect(service.renderHopDong(contractId)).rejects.toThrow(NotFoundException);
    });
  });
});
