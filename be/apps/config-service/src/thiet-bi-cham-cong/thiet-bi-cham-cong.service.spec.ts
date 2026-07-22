import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import {
  ThietBiChamCong_Service,
  MA_LOI_THIET_BI,
} from './thiet-bi-cham-cong.service';
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
    });

    it('thiếu deviceId → ném lỗi, không cho chấm', async () => {
      await expect(service.kiemTraThietBi(NV, '')).rejects.toThrow(
        ForbiddenException,
      );
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

      mockRepo.findOne.mockResolvedValue(may_moi);
      mockRepo.find.mockResolvedValue([may_cu]);

      await service.duyet('507f1f77bcf86cd799439012', 'HR Lan');

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'dev-A',
          trangThai: 'thu_hoi',
        }),
      );
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'dev-B',
          trangThai: 'da_duyet',
          nguoiDuyet: 'HR Lan',
        }),
      );
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
  });

  describe('thuHoi', () => {
    it('chuyển trạng thái sang thu_hoi kèm lý do', async () => {
      mockRepo.findOne.mockResolvedValue({
        _id: 'dev-row-1',
        deviceId: 'dev-A',
        employeeId: 'emp-1',
        trangThai: 'da_duyet',
      });

      await service.thuHoi('507f1f77bcf86cd799439011', 'HR Lan', 'NV nghỉ việc');

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          trangThai: 'thu_hoi',
          lyDoThuHoi: 'NV nghỉ việc',
        }),
      );
    });
  });
});
