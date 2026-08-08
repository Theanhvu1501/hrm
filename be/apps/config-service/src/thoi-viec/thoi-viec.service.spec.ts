import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ThoiViec_Service } from './thoi-viec.service';
import { Resignation, Employee } from '@app/entities';

describe('ThoiViec_Service', () => {
  let service: ThoiViec_Service;
  let mockResignationRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockEmployeeRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };

  const EMP_ID = '507f1f77bcf86cd799439011';
  const RESIGNATION_ID = '507f1f77bcf86cd799439099';
  // Hồ sơ thôi việc THỨ HAI cho cùng một NV — dùng để dựng kịch bản round 5:
  // R1 là hồ sơ cũ đã huỷ duyệt sạch, R2 là hồ sơ MỚI thực sự giữ NV ở
  // 'da_nghi'. Cả hai id đều phải là chuỗi hex 24 ký tự hợp lệ vì service
  // đưa thẳng qua `new ObjectId(id)`.
  const RESIGNATION_ID_2 = '507f1f77bcf86cd799439098';

  /**
   * Nối mock findOne/save của cả hai repo vào một "kho DB giả lập" thật sự
   * — CHỈ đổi khi `save()` thực sự resolve (không đổi khi bị mock reject).
   * Mọi test khác trong file này dùng kiểu mock đơn giản hơn (findOne trả
   * về CÙNG một tham chiếu đối tượng mỗi lần, service mutate thẳng lên đó),
   * đủ dùng khi chỉ có TỐI ĐA một lần ghi mỗi phía. Nhưng round 3 thêm một
   * lần ghi hồ sơ thứ hai (pha 1, snapshot-only) TRƯỚC lần ghi NV — nếu
   * dùng kiểu mock đơn giản đó, `item.trangThai`/`emp.trangThai` bị mutate
   * trong bộ nhớ NGAY TRƯỚC khi gọi `save()`, kể cả khi `save()` sắp bị từ
   * chối — che mất chính hành vi cần kiểm: DB THẬT không lưu gì khi save()
   * ném lỗi. Kho giả lập này mô phỏng đúng ngữ nghĩa đó.
   *
   * `loiOLanGhiHoSoThu` (1-indexed, tuỳ chọn): lần gọi `resignationRepo.save()`
   * đó sẽ reject ĐÚNG MỘT LẦN (không ghi vào kho), mọi lần khác — kể cả lần
   * gọi lại SAU ĐÓ có cùng thứ tự — ghi bình thường.
   */
  function noiKhoGiaLap(
    banDauResignation: Record<string, any>,
    banDauEmployee: Record<string, any>,
    loiOLanGhiHoSoThu?: number,
  ) {
    let resignationDb = { ...banDauResignation };
    let employeeDb = { ...banDauEmployee };
    let soLanGhiHoSo = 0;
    let daNemLoi = false;

    mockResignationRepo.findOne.mockImplementation(() =>
      Promise.resolve({ ...resignationDb }),
    );
    mockEmployeeRepo.findOne.mockImplementation(() =>
      Promise.resolve({ ...employeeDb }),
    );
    mockResignationRepo.save.mockImplementation((v: Record<string, any>) => {
      soLanGhiHoSo++;
      if (!daNemLoi && soLanGhiHoSo === loiOLanGhiHoSoThu) {
        daNemLoi = true;
        return Promise.reject(new Error('mongo down'));
      }
      resignationDb = { ...v };
      return Promise.resolve({ ...resignationDb });
    });
    mockEmployeeRepo.save.mockImplementation((v: Record<string, any>) => {
      employeeDb = { ...v };
      return Promise.resolve({ ...employeeDb });
    });

    return {
      resignationDb: () => resignationDb,
      employeeDb: () => employeeDb,
    };
  }

  /**
   * Biến thể NHIỀU hồ sơ của `noiKhoGiaLap()` — cần cho các kịch bản round 5
   * (Important): một NV có HAI hồ sơ thôi việc độc lập (R1 cũ đã huỷ duyệt,
   * R2 mới thực sự giữ họ ở 'da_nghi'). `findOne()` tra đúng hồ sơ theo
   * `where._id` thay vì luôn trả về một tham chiếu cố định.
   */
  function noiKhoGiaLapNhieuHoSo(
    banDauCacHoSo: Record<string, any>[],
    banDauEmployee: Record<string, any>,
  ) {
    const hoSoDb = new Map<string, Record<string, any>>(
      banDauCacHoSo.map((hs) => [String(hs._id), { ...hs }]),
    );
    let employeeDb = { ...banDauEmployee };

    mockResignationRepo.findOne.mockImplementation(
      (query: { where: { _id: unknown } }) => {
        const id = String(query.where._id);
        const hs = hoSoDb.get(id);
        return Promise.resolve(hs ? { ...hs } : null);
      },
    );
    mockEmployeeRepo.findOne.mockImplementation(() =>
      Promise.resolve({ ...employeeDb }),
    );
    mockResignationRepo.save.mockImplementation((v: Record<string, any>) => {
      hoSoDb.set(String(v._id), { ...v });
      return Promise.resolve({ ...v });
    });
    mockEmployeeRepo.save.mockImplementation((v: Record<string, any>) => {
      employeeDb = { ...v };
      return Promise.resolve({ ...employeeDb });
    });

    return {
      hoSo: (id: string) => hoSoDb.get(id),
      employeeDb: () => employeeDb,
    };
  }

  beforeEach(async () => {
    mockResignationRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) =>
        Promise.resolve({ ...v, _id: v._id ?? 'generated-resignation-id' }),
      ),
    };

    mockEmployeeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((v) => Promise.resolve(v)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThoiViec_Service,
        {
          provide: getRepositoryToken(Resignation),
          useValue: mockResignationRepo,
        },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
      ],
    }).compile();

    service = module.get<ThoiViec_Service>(ThoiViec_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('denormalizes employeeName/employeeCode from the loaded employee and saves with trangThai cho_duyet', async () => {
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        departmentId: 'd1',
        chucDanh: 'Nhan vien',
        trangThai: 'dang_lam_viec',
      };
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.create({
        employeeId: EMP_ID,
        ngayNopDon: '2026-07-18',
        loaiThoiViec: 'tu_nguyen',
      } as any);

      expect(result.employeeName).toBe('Nguyen Van A');
      expect(result.employeeCode).toBe('NV0001');
      expect(result.trangThai).toBe('cho_duyet');
      expect(mockResignationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: EMP_ID,
          employeeName: 'Nguyen Van A',
          employeeCode: 'NV0001',
          trangThai: 'cho_duyet',
        }),
      );
    });

    it('throws NotFoundException when the employee cannot be found, and does not save a resignation record', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          employeeId: '507f1f77bcf86cd799439000',
          ngayNopDon: '2026-07-18',
          loaiThoiViec: 'tu_nguyen',
        } as any),
      ).rejects.toThrow(NotFoundException);

      expect(mockResignationRepo.save).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // updateStatus
  // ──────────────────────────────────────────────────────────────────────────
  describe('updateStatus', () => {
    it("sets the employee's trangThai to da_nghi and saves the employee when the new status is hoan_thanh", async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'dang_lam_viec',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'hoan_thanh');

      expect(result.trangThai).toBe('hoan_thanh');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'da_nghi' }),
      );
    });

    it('does NOT touch the employee record when the new status is tu_choi and it was never approved (cho_duyet -> tu_choi)', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);

      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(mockEmployeeRepo.findOne).not.toHaveBeenCalled();
      expect(mockEmployeeRepo.save).not.toHaveBeenCalled();
    });

    // ── Gap 1: huỷ duyệt phải trả lại trạng thái làm việc cho nhân viên ──
    it('restores the employee to dang_lam_viec when an approved resignation is moved back to tu_choi', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        trangThaiNhanVienTruocKhiDuyet: 'dang_lam_viec',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_lam_viec' }),
      );
    });

    it('restores the employee to tam_nghi (not dang_lam_viec) when they were on tam_nghi before the resignation was approved', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        // Chụp lại từ lúc duyệt: NV đang tạm nghỉ (thai sản/không lương) khi
        // hồ sơ thôi việc được duyệt.
        trangThaiNhanVienTruocKhiDuyet: 'tam_nghi',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'tam_nghi' }),
      );
    });

    it('captures the employee trangThai at the moment of first entering da_duyet, for later restore', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'tam_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'da_duyet');

      expect(result.trangThaiNhanVienTruocKhiDuyet).toBe('tam_nghi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'da_nghi' }),
      );
    });

    it('does not re-capture (and does not lose) the prior status when moving da_duyet -> hoan_thanh', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        trangThaiNhanVienTruocKhiDuyet: 'tam_nghi',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'hoan_thanh');

      expect(result.trangThaiNhanVienTruocKhiDuyet).toBe('tam_nghi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'da_nghi' }),
      );
    });

    // ── legacy rows with no captured snapshot (review round 2, Important) ──
    it('falls back to dang_lam_viec when an approved resignation has no captured snapshot (legacy row predating this fix)', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        // Hồ sơ được duyệt TRƯỚC khi cột này tồn tại — không có gì để đọc
        // lại. Xem ops/README.md để biết cách rà các hồ sơ có nguy cơ này
        // trước khi thao tác — trường hợp NV vốn tam_nghi trước khi hồ sơ
        // được duyệt sẽ bị hồi sinh SAI thành dang_lam_viec.
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_lam_viec' }),
      );
    });

    // ── write-employee-first ordering (review round 2, CRITICAL) ──
    it('leaves the resignation untouched in the DB when the employee write fails, so a retry re-attempts the whole operation instead of short-circuiting', async () => {
      const resignation = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'da_duyet',
        trangThaiNhanVienTruocKhiDuyet: 'dang_lam_viec',
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(resignation);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);
      mockEmployeeRepo.save.mockRejectedValueOnce(new Error('mongo down'));

      await expect(
        service.updateStatus(RESIGNATION_ID, 'tu_choi'),
      ).rejects.toThrow('mongo down');

      // Nếu hồ sơ đã bị lưu với trangThai='tu_choi' trước khi ghi NV thất
      // bại, lần gọi lại sẽ đọc ra hồ sơ đã ở đích, coi đó là "không có
      // chuyển tiếp hiệu lực" và bỏ qua NV vĩnh viễn — đúng lỗi CRITICAL đã
      // bị review bắt.
      expect(mockResignationRepo.save).not.toHaveBeenCalled();
      expect(resignation.trangThai).toBe('da_duyet');

      // Retry: lần này ghi NV thành công, toàn bộ thao tác phải hoàn tất.
      mockEmployeeRepo.save.mockResolvedValue(employee);
      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(mockResignationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'tu_choi' }),
      );
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_lam_viec' }),
      );
    });

    // ── mirror-image: resignation write fails (review round 3, CRITICAL) ──
    it('preserves the TRUE original tam_nghi status across a final-write failure on approval — not da_nghi, and not masked by falling back to dang_lam_viec', async () => {
      const kho = noiKhoGiaLap(
        { _id: RESIGNATION_ID, employeeId: EMP_ID, trangThai: 'cho_duyet' },
        {
          _id: EMP_ID,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          trangThai: 'tam_nghi',
        },
        // Pha 1 (snapshot-only, lần ghi hồ sơ THỨ NHẤT) thành công; NV được
        // ghi 'da_nghi' thành công; rồi lần ghi hồ sơ CUỐI (thứ hai — đổi
        // trangThai sang da_duyet) mới thất bại — đúng ảnh gương của round 2
        // (ở đó lần ghi NV thất bại, ở đây lần ghi hồ sơ cuối thất bại SAU
        // KHI NV đã đổi xong).
        2,
      );

      await expect(
        service.updateStatus(RESIGNATION_ID, 'da_duyet'),
      ).rejects.toThrow('mongo down');

      // NV đã bị ghi 'da_nghi' thành công ở lần thử đầu — đúng thực tế.
      expect(kho.employeeDb().trangThai).toBe('da_nghi');
      // Nhưng snapshot đã được ghi BỀN ở pha 1, TRƯỚC khi đụng NV, nên vẫn
      // giữ đúng giá trị gốc dù lần ghi cuối thất bại — hồ sơ CHƯA sang
      // da_duyet (pha cuối chưa từng thành công).
      expect(kho.resignationDb().trangThaiNhanVienTruocKhiDuyet).toBe(
        'tam_nghi',
      );
      expect(kho.resignationDb().trangThai).toBe('cho_duyet');

      // Retry — toàn bộ thao tác phải hoàn tất, VÀ snapshot cuối cùng phải
      // là giá trị GỐC THẬT ('tam_nghi'), không phải 'da_nghi' (giá trị NV
      // đã bị mutate ở lần thử trước) và không rơi về mặc định
      // 'dang_lam_viec' che mất việc dữ liệu gốc suýt bị mất.
      const result = await service.updateStatus(RESIGNATION_ID, 'da_duyet');

      expect(result.trangThai).toBe('da_duyet');
      expect(result.trangThaiNhanVienTruocKhiDuyet).toBe('tam_nghi');
    });

    // ── phase-1 write itself fails (review round 3, Minor) ──
    // Chưa đụng gì tới NV ở thời điểm này — trivially an toàn — nhưng chưa
    // có test nào ghim hành vi đó trước round 4.
    it('is trivially safe when the phase-1 (snapshot-only) write itself fails — nothing persisted yet, retry completes cleanly', async () => {
      const kho = noiKhoGiaLap(
        { _id: RESIGNATION_ID, employeeId: EMP_ID, trangThai: 'cho_duyet' },
        {
          _id: EMP_ID,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          trangThai: 'tam_nghi',
        },
        // Lần ghi hồ sơ ĐẦU TIÊN (chính pha 1) thất bại — trước khi NV bị
        // đụng tới.
        1,
      );

      await expect(
        service.updateStatus(RESIGNATION_ID, 'da_duyet'),
      ).rejects.toThrow('mongo down');

      // Không có gì được ghi bền — cả hồ sơ lẫn NV vẫn y nguyên trạng thái
      // ban đầu.
      expect(kho.resignationDb().trangThai).toBe('cho_duyet');
      expect(kho.resignationDb().trangThaiNhanVienTruocKhiDuyet).toBeUndefined();
      expect(kho.employeeDb().trangThai).toBe('tam_nghi');

      const result = await service.updateStatus(RESIGNATION_ID, 'da_duyet');

      expect(result.trangThai).toBe('da_duyet');
      expect(result.trangThaiNhanVienTruocKhiDuyet).toBe('tam_nghi');
      expect(kho.employeeDb().trangThai).toBe('da_nghi');
    });

    // ── exiting direction with the SAME failure-injection (review round 3) ──
    // Xác nhận claim "exiting branch an toàn": nguồn khôi phục ở đây luôn là
    // `item.trangThaiNhanVienTruocKhiDuyet` đã có sẵn, không đọc `emp.trangThai`
    // sống, nên lỗi ở đúng lần ghi hồ sơ (duy nhất, không có pha 1) không làm
    // hỏng gì — retry chỉ đơn giản thử lại với cùng giá trị đã đúng từ đầu.
    it('keeps the correct restore value across a resignation-write failure when un-approving (exiting direction)', async () => {
      const kho = noiKhoGiaLap(
        {
          _id: RESIGNATION_ID,
          employeeId: EMP_ID,
          trangThai: 'da_duyet',
          trangThaiNhanVienTruocKhiDuyet: 'tam_nghi',
        },
        {
          _id: EMP_ID,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          trangThai: 'da_nghi',
        },
        // Chiều "ra khỏi hiệu lực" chỉ có MỘT lần ghi hồ sơ (không có pha 1)
        // — lần đó chính là lần đầu tiên.
        1,
      );

      await expect(
        service.updateStatus(RESIGNATION_ID, 'tu_choi'),
      ).rejects.toThrow('mongo down');

      // NV đã được khôi phục đúng ('tam_nghi') ở lần thử đầu — trước khi
      // lần ghi hồ sơ (cuối) thất bại.
      expect(kho.employeeDb().trangThai).toBe('tam_nghi');
      expect(kho.resignationDb().trangThai).toBe('da_duyet'); // chưa sang tu_choi

      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(kho.employeeDb().trangThai).toBe('tam_nghi');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('filters by trangThai', async () => {
      await service.findAll({ trangThai: 'hoan_thanh' });

      expect(mockResignationRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, trangThai: 'hoan_thanh' },
      });
    });

    it('defaults isActive filter to true', async () => {
      await service.findAll();

      expect(mockResignationRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // remove — soft delete
  // ──────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('sets isActive=false instead of hard deleting', async () => {
      const existing = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        isActive: true,
      };
      mockResignationRepo.findOne.mockResolvedValue(existing);

      await service.remove(RESIGNATION_ID);

      expect(mockResignationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('does not touch the employee record when deleting a resignation that was never approved', async () => {
      const existing = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'cho_duyet',
        isActive: true,
      };
      mockResignationRepo.findOne.mockResolvedValue(existing);

      await service.remove(RESIGNATION_ID);

      expect(mockEmployeeRepo.findOne).not.toHaveBeenCalled();
      expect(mockEmployeeRepo.save).not.toHaveBeenCalled();
    });

    // ── Gap 2: xoá một hồ sơ ĐÃ DUYỆT phải trả lại trạng thái làm việc ──
    it('restores the employee to working (undoes chanNeuDaNghiViec block) when deleting an approved resignation', async () => {
      const existing = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'hoan_thanh',
        trangThaiNhanVienTruocKhiDuyet: 'dang_lam_viec',
        isActive: true,
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(existing);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      await service.remove(RESIGNATION_ID);

      expect(mockResignationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_lam_viec' }),
      );
    });

    it('is a no-op on the employee when called again on an already-inactive resignation', async () => {
      const existing = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'hoan_thanh',
        trangThaiNhanVienTruocKhiDuyet: 'dang_lam_viec',
        isActive: false,
      };
      mockResignationRepo.findOne.mockResolvedValue(existing);

      await service.remove(RESIGNATION_ID);

      expect(mockEmployeeRepo.findOne).not.toHaveBeenCalled();
      expect(mockEmployeeRepo.save).not.toHaveBeenCalled();
    });

    // ── write-employee-first ordering (review round 2, CRITICAL) ──
    it('leaves isActive=true when the employee write fails, so a retry re-attempts the restore instead of no-op-ing on the isActive guard', async () => {
      const existing = {
        _id: RESIGNATION_ID,
        employeeId: EMP_ID,
        trangThai: 'hoan_thanh',
        trangThaiNhanVienTruocKhiDuyet: 'dang_lam_viec',
        isActive: true,
      };
      const employee = {
        _id: EMP_ID,
        employeeId: 'NV0001',
        hoTen: 'Nguyen Van A',
        trangThai: 'da_nghi',
      };
      mockResignationRepo.findOne.mockResolvedValue(existing);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);
      mockEmployeeRepo.save.mockRejectedValueOnce(new Error('mongo down'));

      await expect(service.remove(RESIGNATION_ID)).rejects.toThrow(
        'mongo down',
      );

      // Nếu isActive đã bị lưu false trước khi ghi NV thất bại, lần gọi lại
      // sẽ chạm guard `!item.isActive` ngay từ đầu và trả về im lặng — NV
      // kẹt vĩnh viễn ở da_nghi, đúng lỗi CRITICAL đã bị review bắt.
      expect(mockResignationRepo.save).not.toHaveBeenCalled();
      expect(existing.isActive).toBe(true);

      // Retry: lần này ghi NV thành công, toàn bộ thao tác phải hoàn tất.
      mockEmployeeRepo.save.mockResolvedValue(employee);
      await service.remove(RESIGNATION_ID);

      expect(mockResignationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'dang_lam_viec' }),
      );
    });

    // ── mirror-image on remove(): resignation write fails (round 3) ──
    // remove() luôn là chiều "ra khỏi hiệu lực" (không có pha 1), nên nguồn
    // khôi phục luôn là `item.trangThaiNhanVienTruocKhiDuyet` đã có sẵn —
    // cùng lý do "an toàn" như chiều exiting của updateStatus().
    it('keeps the correct restore value across a resignation-write failure when deleting an approved resignation', async () => {
      const kho = noiKhoGiaLap(
        {
          _id: RESIGNATION_ID,
          employeeId: EMP_ID,
          trangThai: 'hoan_thanh',
          trangThaiNhanVienTruocKhiDuyet: 'tam_nghi',
          isActive: true,
        },
        {
          _id: EMP_ID,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          trangThai: 'da_nghi',
        },
        1,
      );

      await expect(service.remove(RESIGNATION_ID)).rejects.toThrow(
        'mongo down',
      );

      expect(kho.employeeDb().trangThai).toBe('tam_nghi');
      expect(kho.resignationDb().isActive).toBe(true); // chưa xoá xong

      await service.remove(RESIGNATION_ID);

      expect(kho.resignationDb().isActive).toBe(false);
      expect(kho.employeeDb().trangThai).toBe('tam_nghi');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Torn-transition healing (review round 4, CRITICAL)
  //
  // Sau một lần duyệt mà lần ghi hồ sơ CUỐI (W3) thất bại SAU KHI lần ghi NV
  // đã thành công, DB bị xé rách: hồ sơ vẫn `cho_duyet` (chưa hiệu lực) với
  // snapshot durable, NV thực sự đã `da_nghi`. Duyệt lại tự lành (đã có test
  // ở round 3). Nhưng HR thấy hồ sơ "chờ duyệt" bất thường nhiều khả năng sẽ
  // TỪ CHỐI hoặc XOÁ thay vì bấm duyệt lại — cả hai đường đó phải lành tương
  // đương, xem `vaChuyenTiepDangDoNeuCo()`.
  // ──────────────────────────────────────────────────────────────────────────
  describe('vaChuyenTiepDangDoNeuCo — chuyển tiếp dang dở', () => {
    it('unblocks the employee when the resignation is rejected instead of retried after a torn W3 failure', async () => {
      const kho = noiKhoGiaLap(
        { _id: RESIGNATION_ID, employeeId: EMP_ID, trangThai: 'cho_duyet' },
        {
          _id: EMP_ID,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          trangThai: 'tam_nghi',
        },
        // Xé rách đúng như test round 3: pha 1 + ghi NV thành công, lần ghi
        // hồ sơ CUỐI (thứ hai) mới thất bại.
        2,
      );

      await expect(
        service.updateStatus(RESIGNATION_ID, 'da_duyet'),
      ).rejects.toThrow('mongo down');

      // DB xé rách: hồ sơ chưa hiệu lực (cho_duyet), NV đã thực sự da_nghi.
      expect(kho.resignationDb().trangThai).toBe('cho_duyet');
      expect(kho.employeeDb().trangThai).toBe('da_nghi');

      // HR không duyệt lại — từ chối luôn. Trước round 4, đây là nhánh
      // no-op (!dangHieuLucTruoc && !seHieuLuc) và bỏ qua NV vĩnh viễn.
      const result = await service.updateStatus(RESIGNATION_ID, 'tu_choi');

      expect(result.trangThai).toBe('tu_choi');
      expect(kho.employeeDb().trangThai).toBe('tam_nghi');
    });

    it('unblocks the employee when the resignation is deleted instead of retried after a torn W3 failure', async () => {
      const kho = noiKhoGiaLap(
        {
          _id: RESIGNATION_ID,
          employeeId: EMP_ID,
          trangThai: 'cho_duyet',
          isActive: true,
        },
        {
          _id: EMP_ID,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          trangThai: 'tam_nghi',
        },
        2,
      );

      await expect(
        service.updateStatus(RESIGNATION_ID, 'da_duyet'),
      ).rejects.toThrow('mongo down');

      expect(kho.resignationDb().trangThai).toBe('cho_duyet');
      expect(kho.employeeDb().trangThai).toBe('da_nghi');

      // HR xoá thẳng hồ sơ "chờ duyệt" bất thường thay vì duyệt lại. Trước
      // round 4, isActive=false xoá luôn dấu vết mà không chạm tới NV.
      await service.remove(RESIGNATION_ID);

      expect(kho.resignationDb().isActive).toBe(false);
      expect(kho.employeeDb().trangThai).toBe('tam_nghi');
    });

    it('stays inert through a normal approve -> reject -> delete cycle — no double-restore, no misfire', async () => {
      const kho = noiKhoGiaLap(
        {
          _id: RESIGNATION_ID,
          employeeId: EMP_ID,
          trangThai: 'cho_duyet',
          isActive: true,
        },
        {
          _id: EMP_ID,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          trangThai: 'tam_nghi',
        },
        // Không mock lỗi nào — cả chu kỳ đi trót lọt bình thường.
      );

      await service.updateStatus(RESIGNATION_ID, 'da_duyet');
      expect(kho.employeeDb().trangThai).toBe('da_nghi');

      await service.updateStatus(RESIGNATION_ID, 'tu_choi');
      expect(kho.employeeDb().trangThai).toBe('tam_nghi');
      // Snapshot CỐ Ý còn sót lại trên hồ sơ sau khi khôi phục (round 2/3
      // không xoá nó) — dấu vết lịch sử vô hại. Cờ `coChuyenTiepDangDo` thì
      // đã được tắt ngay trong lần ghi cuối của chu kỳ huỷ duyệt vừa rồi
      // (round 5) — đây mới là điều kiện thật khiến vaChuyenTiepDangDoNeuCo()
      // không làm gì ở bước xoá dưới đây.
      expect(kho.resignationDb().trangThaiNhanVienTruocKhiDuyet).toBe(
        'tam_nghi',
      );
      expect(kho.resignationDb().coChuyenTiepDangDo).toBe(false);

      const soLanGhiNvTruocKhiXoa = mockEmployeeRepo.save.mock.calls.length;

      await service.remove(RESIGNATION_ID);

      // Không có lần ghi NV nào thêm — vaChuyenTiepDangDoNeuCo() thấy cờ đã
      // false nên không làm gì, đúng như thiết kế "trơ" của nó.
      expect(mockEmployeeRepo.save.mock.calls.length).toBe(
        soLanGhiNvTruocKhiXoa,
      );
      expect(kho.employeeDb().trangThai).toBe('tam_nghi');
      expect(kho.resignationDb().isActive).toBe(false);
    });

    // ── marker cleared on the successful path (review round 5) ──
    it('leaves no stale coChuyenTiepDangDo marker behind after a normal, fault-free approve', async () => {
      const kho = noiKhoGiaLap(
        { _id: RESIGNATION_ID, employeeId: EMP_ID, trangThai: 'cho_duyet' },
        {
          _id: EMP_ID,
          employeeId: 'NV0001',
          hoTen: 'Nguyen Van A',
          trangThai: 'dang_lam_viec',
        },
      );

      await service.updateStatus(RESIGNATION_ID, 'da_duyet');

      expect(kho.resignationDb().coChuyenTiepDangDo).toBe(false);
      expect(kho.resignationDb().trangThaiNhanVienTruocKhiDuyet).toBe(
        'dang_lam_viec',
      );
    });

    // ── over-restore: stale marker-free R1 must NOT be "healed" once the
    // employee genuinely left through something else (review round 5,
    // IMPORTANT — this is the misfire the marker exists to rule out) ──
    describe('không mở khoá nhầm một NV đã thực sự nghỉ việc qua đường khác', () => {
      it('deleting a stale rejected R1 does not touch the employee once a SEPARATE resignation R2 legitimately holds them at da_nghi', async () => {
        const kho = noiKhoGiaLapNhieuHoSo(
          [
            {
              _id: RESIGNATION_ID,
              employeeId: EMP_ID,
              trangThai: 'cho_duyet',
              isActive: true,
            },
            {
              _id: RESIGNATION_ID_2,
              employeeId: EMP_ID,
              trangThai: 'cho_duyet',
              isActive: true,
            },
          ],
          {
            _id: EMP_ID,
            employeeId: 'NV0001',
            hoTen: 'Nguyen Van A',
            trangThai: 'dang_lam_viec',
          },
        );

        // R1: duyệt nhầm rồi từ chối lại (đúng kịch bản Gap 1 gốc) — kết
        // thúc SẠCH, không dang dở.
        await service.updateStatus(RESIGNATION_ID, 'da_duyet');
        await service.updateStatus(RESIGNATION_ID, 'tu_choi');
        expect(kho.employeeDb().trangThai).toBe('dang_lam_viec');
        expect(kho.hoSo(RESIGNATION_ID)?.coChuyenTiepDangDo).toBe(false);

        // NV sau đó THỰC SỰ nghỉ việc — qua một hồ sơ KHÁC, R2.
        await service.updateStatus(RESIGNATION_ID_2, 'da_duyet');
        expect(kho.employeeDb().trangThai).toBe('da_nghi');

        const soLanGhiNvTruoc = mockEmployeeRepo.save.mock.calls.length;

        // HR dọn hồ sơ R1 cũ (đã từ chối từ lâu) — xoá.
        await service.remove(RESIGNATION_ID);

        expect(mockEmployeeRepo.save.mock.calls.length).toBe(soLanGhiNvTruoc);
        expect(kho.employeeDb().trangThai).toBe('da_nghi');
      });

      it('reopening a stale rejected R1 (tu_choi -> cho_duyet) does not touch the employee once a SEPARATE resignation R2 legitimately holds them at da_nghi', async () => {
        const kho = noiKhoGiaLapNhieuHoSo(
          [
            {
              _id: RESIGNATION_ID,
              employeeId: EMP_ID,
              trangThai: 'cho_duyet',
              isActive: true,
            },
            {
              _id: RESIGNATION_ID_2,
              employeeId: EMP_ID,
              trangThai: 'cho_duyet',
              isActive: true,
            },
          ],
          {
            _id: EMP_ID,
            employeeId: 'NV0001',
            hoTen: 'Nguyen Van A',
            trangThai: 'dang_lam_viec',
          },
        );

        await service.updateStatus(RESIGNATION_ID, 'da_duyet');
        await service.updateStatus(RESIGNATION_ID, 'tu_choi');
        await service.updateStatus(RESIGNATION_ID_2, 'da_duyet');
        expect(kho.employeeDb().trangThai).toBe('da_nghi');

        const soLanGhiNvTruoc = mockEmployeeRepo.save.mock.calls.length;

        // HR mở lại R1 (đưa về chờ duyệt) thay vì xoá.
        const result = await service.updateStatus(RESIGNATION_ID, 'cho_duyet');

        expect(result.trangThai).toBe('cho_duyet');
        expect(mockEmployeeRepo.save.mock.calls.length).toBe(soLanGhiNvTruoc);
        expect(kho.employeeDb().trangThai).toBe('da_nghi');
      });

      it('deleting a stale rejected R1 does not touch the employee once trangThai was set to da_nghi DIRECTLY on the employee record (not through any resignation)', async () => {
        const kho = noiKhoGiaLapNhieuHoSo(
          [
            {
              _id: RESIGNATION_ID,
              employeeId: EMP_ID,
              trangThai: 'cho_duyet',
              isActive: true,
            },
          ],
          {
            _id: EMP_ID,
            employeeId: 'NV0001',
            hoTen: 'Nguyen Van A',
            trangThai: 'dang_lam_viec',
          },
        );

        await service.updateStatus(RESIGNATION_ID, 'da_duyet');
        await service.updateStatus(RESIGNATION_ID, 'tu_choi');
        expect(kho.employeeDb().trangThai).toBe('dang_lam_viec');
        expect(kho.hoSo(RESIGNATION_ID)?.coChuyenTiepDangDo).toBe(false);

        // Một actor KHÁC (vd nhan-vien.service.ts, không qua thôi việc) đặt
        // NV sang da_nghi trực tiếp — mô phỏng bằng cách gọi thẳng
        // employeeRepo.save(), như một request khác vừa ghi vào CÙNG một
        // collection.
        await mockEmployeeRepo.save({
          ...kho.employeeDb(),
          trangThai: 'da_nghi',
        });
        expect(kho.employeeDb().trangThai).toBe('da_nghi');

        const soLanGhiNvTruoc = mockEmployeeRepo.save.mock.calls.length;

        await service.remove(RESIGNATION_ID);

        expect(mockEmployeeRepo.save.mock.calls.length).toBe(soLanGhiNvTruoc);
        expect(kho.employeeDb().trangThai).toBe('da_nghi');
      });

      it('reopening a stale rejected R1 does not touch the employee once trangThai was set to da_nghi DIRECTLY on the employee record', async () => {
        const kho = noiKhoGiaLapNhieuHoSo(
          [
            {
              _id: RESIGNATION_ID,
              employeeId: EMP_ID,
              trangThai: 'cho_duyet',
              isActive: true,
            },
          ],
          {
            _id: EMP_ID,
            employeeId: 'NV0001',
            hoTen: 'Nguyen Van A',
            trangThai: 'dang_lam_viec',
          },
        );

        await service.updateStatus(RESIGNATION_ID, 'da_duyet');
        await service.updateStatus(RESIGNATION_ID, 'tu_choi');

        await mockEmployeeRepo.save({
          ...kho.employeeDb(),
          trangThai: 'da_nghi',
        });

        const soLanGhiNvTruoc = mockEmployeeRepo.save.mock.calls.length;

        const result = await service.updateStatus(RESIGNATION_ID, 'cho_duyet');

        expect(result.trangThai).toBe('cho_duyet');
        expect(mockEmployeeRepo.save.mock.calls.length).toBe(soLanGhiNvTruoc);
        expect(kho.employeeDb().trangThai).toBe('da_nghi');
      });
    });
  });
});
