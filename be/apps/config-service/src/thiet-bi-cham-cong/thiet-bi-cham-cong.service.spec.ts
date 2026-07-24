import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import {
  ThietBiChamCong_Service,
  MA_LOI_THIET_BI,
} from './thiet-bi-cham-cong.service';
import { ThietBiChamCong_Controller } from './thiet-bi-cham-cong.controller';
import { EmployeeDevice } from '@app/entities';

const NV: any = {
  _id: 'emp-1',
  hoTen: 'Nguyễn Văn Hải',
  employeeId: 'NV0001',
};

/** Lấy `code` ra khỏi ForbiddenException để assert cho gọn. */
async function batMaLoi(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (e: any) {
    return e?.response?.code ?? e?.getResponse?.()?.code;
  }
  throw new Error('Không ném lỗi như kỳ vọng');
}

describe('ThietBiChamCong_Service', () => {
  let service: ThietBiChamCong_Service;
  let mockRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) =>
        Promise.resolve({ ...v, _id: v._id ?? 'generated-id' }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThietBiChamCong_Service,
        { provide: getRepositoryToken(EmployeeDevice), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ThietBiChamCong_Service>(ThietBiChamCong_Service);
  });

  describe('kiemTraThietBi', () => {
    it('cho qua khi deviceId khớp máy đã duyệt', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-A', trangThai: 'da_duyet', employeeId: 'emp-1' },
      ]);

      await expect(
        service.kiemTraThietBi(NV, 'dev-A'),
      ).resolves.toBeUndefined();

      // Không được tạo thêm dòng nào khi máy hợp lệ.
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('NV chưa có máy nào → tự tạo dòng cho_duyet và ném THIET_BI_CHO_DUYET', async () => {
      mockRepo.find.mockResolvedValue([]);

      const code = await batMaLoi(() =>
        service.kiemTraThietBi(NV, 'dev-MOI', 'UA/1.0', 'iPhone của Hải'),
      );

      expect(code).toBe(MA_LOI_THIET_BI.CHO_DUYET);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'dev-MOI',
          employeeId: 'emp-1',
          employeeCode: 'NV0001',
          employeeName: 'Nguyễn Văn Hải',
          tenThietBi: 'iPhone của Hải',
          userAgent: 'UA/1.0',
          trangThai: 'cho_duyet',
        }),
      );
    });

    it('deviceId lạ khi NV đã có máy khác đã duyệt → THIET_BI_CHUA_DUOC_PHEP', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-A', trangThai: 'da_duyet', employeeId: 'emp-1' },
      ]);

      const code = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-LA'));

      expect(code).toBe(MA_LOI_THIET_BI.CHUA_DUOC_PHEP);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'dev-LA', trangThai: 'cho_duyet' }),
      );
    });

    it('deviceId đang cho_duyet → THIET_BI_CHO_DUYET và KHÔNG tạo thêm dòng', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-B', trangThai: 'cho_duyet', employeeId: 'emp-1' },
      ]);

      const code = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-B'));

      expect(code).toBe(MA_LOI_THIET_BI.CHO_DUYET);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('deviceId đang cho_duyet + NV gửi tên máy → ghi đè tên trên dòng đang chờ', async () => {
      // Dòng cho_duyet được tạo tự động ở lần chấm ĐẦU TIÊN nên nhân viên chỉ
      // đặt tên được ở những lần gửi sau — nếu tên bị bỏ qua thì ô nhập tên
      // trên màn hình "Chấm công của tôi" chỉ là trang trí.
      const dong: any = {
        deviceId: 'dev-B',
        trangThai: 'cho_duyet',
        employeeId: 'emp-1',
        tenThietBi: 'Android · Chrome',
      };
      mockRepo.find.mockResolvedValue([dong]);

      const code = await batMaLoi(() =>
        service.kiemTraThietBi(NV, 'dev-B', 'UA/1.0', 'Điện thoại của Hải'),
      );

      expect(code).toBe(MA_LOI_THIET_BI.CHO_DUYET);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'dev-B',
          tenThietBi: 'Điện thoại của Hải',
          // Ghi đè tên KHÔNG được kéo theo đổi trạng thái — nếu không thì
          // nhân viên tự "duyệt" máy mình chỉ bằng cách đổi tên.
          trangThai: 'cho_duyet',
        }),
      );
    });

    it('deviceId đang cho_duyet + tên gửi lên trùng tên cũ → không ghi thừa', async () => {
      mockRepo.find.mockResolvedValue([
        {
          deviceId: 'dev-B',
          trangThai: 'cho_duyet',
          employeeId: 'emp-1',
          tenThietBi: 'iPhone · Safari',
        },
      ]);

      const code = await batMaLoi(() =>
        service.kiemTraThietBi(NV, 'dev-B', 'UA/1.0', '  iPhone · Safari  '),
      );

      expect(code).toBe(MA_LOI_THIET_BI.CHO_DUYET);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('deviceId đang cho_duyet + tên rỗng/khoảng trắng → giữ nguyên tên cũ', async () => {
      mockRepo.find.mockResolvedValue([
        {
          deviceId: 'dev-B',
          trangThai: 'cho_duyet',
          employeeId: 'emp-1',
          tenThietBi: 'iPhone · Safari',
        },
      ]);

      const code = await batMaLoi(() =>
        service.kiemTraThietBi(NV, 'dev-B', 'UA/1.0', '   '),
      );

      expect(code).toBe(MA_LOI_THIET_BI.CHO_DUYET);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('deviceId đã bị từ chối → THIET_BI_BI_TU_CHOI, không tạo lại', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-C', trangThai: 'tu_choi', employeeId: 'emp-1' },
      ]);

      const code = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-C'));

      expect(code).toBe(MA_LOI_THIET_BI.BI_TU_CHOI);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('deviceId đã bị thu hồi → THIET_BI_BI_THU_HOI', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-D', trangThai: 'thu_hoi', employeeId: 'emp-1' },
      ]);

      const code = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-D'));

      expect(code).toBe(MA_LOI_THIET_BI.BI_THU_HOI);
      // Important 4: cân với ca tu_choi — tuyệt đối không ghi thêm dòng nào.
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('thiếu deviceId → ném đúng mã THIET_BI_THIEU_DINH_DANH và KHÔNG ghi dòng nào', async () => {
      // Important 2: test cũ chỉ assert `toThrow(ForbiddenException)` nên vẫn
      // xanh khi bỏ hẳn guard (luồng rơi xuống nhánh tạo dòng, cũng ném
      // Forbidden). Phải chốt cả mã lỗi lẫn việc không đụng vào repo.
      await expect(service.kiemTraThietBi(NV, '')).rejects.toThrow(
        ForbiddenException,
      );

      mockRepo.save.mockClear();
      const code = await batMaLoi(() => service.kiemTraThietBi(NV, ''));

      expect(code).toBe(MA_LOI_THIET_BI.THIEU_DINH_DANH);
      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('deviceId toàn khoảng trắng → THIET_BI_THIEU_DINH_DANH, không tạo dòng rác', async () => {
      // Minor: '   ' vượt qua `!deviceId` và sinh dòng deviceId="   ";
      // HR duyệt nhầm dòng đó là mở cửa cho mọi request thiếu định danh.
      const code = await batMaLoi(() => service.kiemTraThietBi(NV, '   '));

      expect(code).toBe(MA_LOI_THIET_BI.THIEU_DINH_DANH);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('deviceId quá ngắn → THIET_BI_THIEU_DINH_DANH', async () => {
      const code = await batMaLoi(() => service.kiemTraThietBi(NV, 'abc'));

      expect(code).toBe(MA_LOI_THIET_BI.THIEU_DINH_DANH);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('deviceId hợp lệ nhưng có khoảng trắng thừa → trim rồi mới so khớp', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-A-12345', trangThai: 'da_duyet', employeeId: 'emp-1' },
      ]);

      await expect(
        service.kiemTraThietBi(NV, '  dev-A-12345  '),
      ).resolves.toBeUndefined();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    // ---- Critical 2: trạng thái xấu nhất thắng, không phụ thuộc thứ tự mảng ----

    it('Critical 2: cùng deviceId có cả da_duyet lẫn tu_choi (da_duyet đứng trước) → vẫn chặn', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-X', trangThai: 'da_duyet', employeeId: 'emp-1' },
        { deviceId: 'dev-X', trangThai: 'tu_choi', employeeId: 'emp-1' },
      ]);

      const code = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-X'));

      expect(code).toBe(MA_LOI_THIET_BI.BI_TU_CHOI);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('Critical 2: cùng deviceId có cả da_duyet lẫn thu_hoi (da_duyet đứng trước) → vẫn chặn', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-X', trangThai: 'da_duyet', employeeId: 'emp-1' },
        { deviceId: 'dev-X', trangThai: 'thu_hoi', employeeId: 'emp-1' },
      ]);

      const code = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-X'));

      expect(code).toBe(MA_LOI_THIET_BI.BI_THU_HOI);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('Critical 2: kết quả không đổi khi đảo thứ tự mảng trả về từ Mongo', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-X', trangThai: 'tu_choi', employeeId: 'emp-1' },
        { deviceId: 'dev-X', trangThai: 'da_duyet', employeeId: 'emp-1' },
      ]);

      const code = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-X'));

      expect(code).toBe(MA_LOI_THIET_BI.BI_TU_CHOI);
    });

    // ---- Critical 3: hai máy da_duyet cùng một nhân viên ----

    it('Critical 3: NV có 2 dòng da_duyet khác deviceId → chặn với mã THIET_BI_DU_LIEU_BAT_NHAT', async () => {
      mockRepo.find.mockResolvedValue([
        {
          _id: 'row-A',
          deviceId: 'dev-A',
          trangThai: 'da_duyet',
          employeeId: 'emp-1',
        },
        {
          _id: 'row-B',
          deviceId: 'dev-B',
          trangThai: 'da_duyet',
          employeeId: 'emp-1',
        },
      ]);

      const codeA = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-A'));
      const codeB = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-B'));

      expect(codeA).toBe(MA_LOI_THIET_BI.DU_LIEU_BAT_NHAT);
      expect(codeB).toBe(MA_LOI_THIET_BI.DU_LIEU_BAT_NHAT);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    // ---- Important 1: trạng thái lạ không được rơi xuống nhánh tạo dòng ----

    it('Important 1: dòng khớp deviceId nhưng trạng thái lạ (DA_DUYET viết hoa) → chặn, KHÔNG tạo dòng mới', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-E', trangThai: 'DA_DUYET', employeeId: 'emp-1' },
      ]);

      const code = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-E'));

      expect(code).toBe(MA_LOI_THIET_BI.TRANG_THAI_KHONG_HOP_LE);
      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('Important 1: trạng thái lạ hoàn toàn (task sau thêm vào) → chặn fail-closed', async () => {
      mockRepo.find.mockResolvedValue([
        { deviceId: 'dev-F', trangThai: 'tam_khoa', employeeId: 'emp-1' },
      ]);

      const code = await batMaLoi(() => service.kiemTraThietBi(NV, 'dev-F'));

      expect(code).toBe(MA_LOI_THIET_BI.TRANG_THAI_KHONG_HOP_LE);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('duyet', () => {
    it('duyệt máy mới thì thu hồi máy cũ trong cùng thao tác', async () => {
      // `findOne()` chuyển id qua `new ObjectId(id)` (giống mọi service khác
      // trong module này) nên id truyền vào phải là hex 24 ký tự hợp lệ;
      // các `_id` mock giữ nguyên vì repo là mock, không tự parse lại.
      const may_moi = {
        _id: 'dev-row-2',
        deviceId: 'dev-B',
        employeeId: 'emp-1',
        trangThai: 'cho_duyet',
      };
      const may_cu = {
        _id: 'dev-row-1',
        deviceId: 'dev-A',
        employeeId: 'emp-1',
        trangThai: 'da_duyet',
      };
      const may_da_thu_hoi = {
        _id: 'dev-row-0',
        deviceId: 'dev-CU',
        employeeId: 'emp-1',
        trangThai: 'thu_hoi',
      };

      mockRepo.findOne.mockResolvedValue(may_moi);
      mockRepo.find.mockResolvedValue([may_cu, may_da_thu_hoi]);

      await service.duyet('507f1f77bcf86cd799439012', 'HR Lan');

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'dev-A',
          trangThai: 'thu_hoi',
          lyDoThuHoi: 'Tự động thu hồi khi duyệt thiết bị mới',
        }),
      );
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'dev-B',
          trangThai: 'da_duyet',
          nguoiDuyet: 'HR Lan',
        }),
      );
      // Important 4: đúng 2 lượt ghi — máy cũ + máy mới. Nếu code thu hồi lây
      // sang dòng khác (vd dòng đã thu_hoi sẵn) thì số lần ghi sẽ lệch.
      expect(mockRepo.save).toHaveBeenCalledTimes(2);
    });

    it('duyệt khi NV chưa có máy nào thì không thu hồi gì', async () => {
      mockRepo.findOne.mockResolvedValue({
        _id: 'dev-row-1',
        deviceId: 'dev-A',
        employeeId: 'emp-1',
        trangThai: 'cho_duyet',
      });
      mockRepo.find.mockResolvedValue([]);

      await service.duyet('507f1f77bcf86cd799439011', 'HR Lan');

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trangThai: 'da_duyet' }),
      );
    });

    it('Important 3: không hồi sinh được thiết bị đang thu_hoi', async () => {
      mockRepo.findOne.mockResolvedValue({
        _id: 'dev-row-1',
        deviceId: 'dev-A',
        employeeId: 'emp-1',
        trangThai: 'thu_hoi',
      });

      const code = await batMaLoi(() =>
        service.duyet('507f1f77bcf86cd799439011', 'HR Lan'),
      );

      expect(code).toBe(MA_LOI_THIET_BI.TRANG_THAI_KHONG_HOP_LE);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('Important 3: không hồi sinh được thiết bị đang tu_choi', async () => {
      mockRepo.findOne.mockResolvedValue({
        _id: 'dev-row-1',
        deviceId: 'dev-A',
        employeeId: 'emp-1',
        trangThai: 'tu_choi',
      });

      const code = await batMaLoi(() =>
        service.duyet('507f1f77bcf86cd799439011', 'HR Lan'),
      );

      expect(code).toBe(MA_LOI_THIET_BI.TRANG_THAI_KHONG_HOP_LE);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('Important 3: duyệt lại dòng đã da_duyet cũng bị chặn (không ghi đè vết duyệt cũ)', async () => {
      mockRepo.findOne.mockResolvedValue({
        _id: 'dev-row-1',
        deviceId: 'dev-A',
        employeeId: 'emp-1',
        trangThai: 'da_duyet',
      });

      const code = await batMaLoi(() =>
        service.duyet('507f1f77bcf86cd799439011', 'HR Lan'),
      );

      expect(code).toBe(MA_LOI_THIET_BI.TRANG_THAI_KHONG_HOP_LE);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('tuChoi', () => {
    it('ghi nguoiDuyet/lanDuyet và KHÔNG đụng tới máy khác của nhân viên', async () => {
      const may_cho_duyet = {
        _id: 'dev-row-2',
        deviceId: 'dev-B',
        employeeId: 'emp-1',
        trangThai: 'cho_duyet',
      };
      mockRepo.findOne.mockResolvedValue(may_cho_duyet);
      mockRepo.find.mockResolvedValue([
        {
          _id: 'dev-row-1',
          deviceId: 'dev-A',
          employeeId: 'emp-1',
          trangThai: 'da_duyet',
        },
        may_cho_duyet,
      ]);

      const ket_qua = await service.tuChoi(
        '507f1f77bcf86cd799439012',
        'HR Lan',
      );

      expect(ket_qua.trangThai).toBe('tu_choi');
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'dev-B',
          trangThai: 'tu_choi',
          nguoiDuyet: 'HR Lan',
          lanDuyet: expect.any(String),
        }),
      );
      // Máy đang dùng của NV phải nguyên vẹn — từ chối máy lạ không được
      // khoá luôn máy hợp lệ.
      expect(mockRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'dev-A' }),
      );
    });
  });

  describe('thuHoi', () => {
    it('chuyển trạng thái sang thu_hoi kèm lý do', async () => {
      mockRepo.findOne.mockResolvedValue({
        _id: 'dev-row-1',
        deviceId: 'dev-A',
        employeeId: 'emp-1',
        trangThai: 'da_duyet',
      });

      await service.thuHoi(
        '507f1f77bcf86cd799439011',
        'HR Lan',
        'NV nghỉ việc',
      );

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          trangThai: 'thu_hoi',
          lyDoThuHoi: 'NV nghỉ việc',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('chỉ lấy dòng còn isActive để duyệt/từ chối/thu hồi', async () => {
      mockRepo.findOne.mockResolvedValue({
        _id: 'dev-row-1',
        deviceId: 'dev-A',
        employeeId: 'emp-1',
        trangThai: 'cho_duyet',
      });

      await service.findOne('507f1f77bcf86cd799439011');

      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });
});

// Hàng rào phân quyền của controller (PermissionGuard + @Permissions) đã
// chuyển sang spec riêng `thiet-bi-cham-cong.controller.spec.ts` — ở đó có
// cả assert quét metadata bắt được route thêm sau này.

describe('ThietBiChamCong_Controller — vết audit người thực hiện', () => {
  let controller: ThietBiChamCong_Controller;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      duyet: jest.fn().mockResolvedValue({}),
      tuChoi: jest.fn().mockResolvedValue({}),
      thuHoi: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue([]),
      cuaToi: jest.fn().mockResolvedValue([]),
    };
    controller = new ThietBiChamCong_Controller(mockService, {} as any);
  });

  it('không xác định được người thực hiện → ném lỗi, không gọi service', async () => {
    await expect(
      controller.duyet('507f1f77bcf86cd799439011', { user: {} }),
    ).rejects.toThrow();
    expect(mockService.duyet).not.toHaveBeenCalled();
  });

  it('thiếu email nhưng có id → vẫn ghi được vết audit', async () => {
    await controller.duyet('507f1f77bcf86cd799439011', {
      user: { id: 'user-9' },
    });

    expect(mockService.duyet).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'user-9',
    );
  });

  it('thu-hoi cũng chặn khi không xác định được người thực hiện', async () => {
    await expect(
      controller.thuHoi('507f1f77bcf86cd799439011', {}, { user: {} }),
    ).rejects.toThrow();
    expect(mockService.thuHoi).not.toHaveBeenCalled();
  });
});
