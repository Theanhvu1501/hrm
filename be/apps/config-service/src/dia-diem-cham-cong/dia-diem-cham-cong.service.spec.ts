import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiaDiemChamCong_Service } from './dia-diem-cham-cong.service';
import { AttendanceLocation } from '@app/entities';

describe('DiaDiemChamCong_Service', () => {
  let service: DiaDiemChamCong_Service;
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
        DiaDiemChamCong_Service,
        { provide: getRepositoryToken(AttendanceLocation), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<DiaDiemChamCong_Service>(DiaDiemChamCong_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — địa điểm GPS hợp lệ', () => {
    it('saves with latitude/longitude/banKinh', async () => {
      const result = await service.create({
        ten: 'Văn phòng chính',
        loai: 'gps',
        latitude: 10.7769,
        longitude: 106.7009,
        banKinh: 100,
      } as any);

      expect(result.ten).toBe('Văn phòng chính');
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          loai: 'gps',
          latitude: 10.7769,
          longitude: 106.7009,
          banKinh: 100,
        }),
      );
    });
  });

  describe('create — địa điểm GPS thiếu bán kính', () => {
    it('throws BadRequestException', async () => {
      await expect(
        service.create({
          ten: 'Văn phòng lỗi',
          loai: 'gps',
          latitude: 10.7769,
          longitude: 106.7009,
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('create — địa điểm Wifi thiếu ipWifi', () => {
    it('throws BadRequestException', async () => {
      await expect(
        service.create({
          ten: 'Văn phòng wifi',
          loai: 'wifi',
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('create — địa điểm QR thiếu maQr', () => {
    it('throws BadRequestException', async () => {
      await expect(
        service.create({
          ten: 'Văn phòng qr',
          loai: 'qr',
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('create — địa điểm Wifi hợp lệ', () => {
    it('saves with ipWifi', async () => {
      const result = await service.create({
        ten: 'Văn phòng wifi',
        loai: 'wifi',
        ipWifi: '192.168.1.1',
      } as any);

      expect(result.ipWifi).toBe('192.168.1.1');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('defaults isActive filter to true', async () => {
      await service.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('respects an explicit isActive=false filter (including string form)', async () => {
      await service.findAll({ isActive: 'false' as any });

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { isActive: false },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // update
  // ──────────────────────────────────────────────────────────────────────────
  describe('update — re-validates on change', () => {
    it('throws BadRequestException when updated to gps without banKinh', async () => {
      const existing = {
        _id: '507f1f77bcf86cd799439099',
        ten: 'Văn phòng',
        loai: 'wifi',
        ipWifi: '192.168.1.1',
        isActive: true,
      };
      mockRepo.findOne.mockResolvedValue(existing);

      await expect(
        service.update('507f1f77bcf86cd799439099', {
          loai: 'gps',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('saves successfully when updated fields remain valid', async () => {
      const existing = {
        _id: '507f1f77bcf86cd799439099',
        ten: 'Văn phòng',
        loai: 'gps',
        latitude: 10,
        longitude: 106,
        banKinh: 50,
        isActive: true,
      };
      mockRepo.findOne.mockResolvedValue(existing);

      const result = await service.update('507f1f77bcf86cd799439099', {
        ten: 'Văn phòng mới',
      } as any);

      expect(result.ten).toBe('Văn phòng mới');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // remove — soft delete
  // ──────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('sets isActive=false instead of hard deleting', async () => {
      const id = '507f1f77bcf86cd799439099';
      const existing = { _id: id, ten: 'Văn phòng', isActive: true };
      mockRepo.findOne.mockResolvedValue(existing);

      await service.remove(id);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('findOne — không tồn tại', () => {
    it('throws NotFoundException', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
