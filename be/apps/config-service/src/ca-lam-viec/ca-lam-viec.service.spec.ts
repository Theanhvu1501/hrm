import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CaLamViec_Service } from './ca-lam-viec.service';
import { WorkShift } from '@app/entities';

describe('CaLamViec_Service', () => {
  let service: CaLamViec_Service;
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
        CaLamViec_Service,
        { provide: getRepositoryToken(WorkShift), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CaLamViec_Service>(CaLamViec_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────────────────────────────────
  describe('create — ca ngày thường (08:00–17:00)', () => {
    it('saves the shift with laCaQuaDem=false', async () => {
      const result = await service.create({
        ten: 'Ca hành chính',
        gioBatDau: '08:00',
        gioKetThuc: '17:00',
      } as any);

      expect(result.laCaQuaDem).toBe(false);
      expect(result.ten).toBe('Ca hành chính');
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ laCaQuaDem: false }),
      );
    });
  });

  describe('create — ca qua đêm (22:00–06:00)', () => {
    it('is accepted (not rejected) and saves with laCaQuaDem=true', async () => {
      const result = await service.create({
        ten: 'Ca đêm',
        gioBatDau: '22:00',
        gioKetThuc: '06:00',
      } as any);

      expect(result.laCaQuaDem).toBe(true);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ laCaQuaDem: true }),
      );
    });
  });

  describe('create — giờ bắt đầu trùng giờ kết thúc', () => {
    it('throws BadRequestException', async () => {
      await expect(
        service.create({
          ten: 'Ca lỗi',
          gioBatDau: '08:00',
          gioKetThuc: '08:00',
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('create — giờ không hợp lệ', () => {
    it('throws BadRequestException for an out-of-range "HH:mm" like 25:00', async () => {
      await expect(
        service.create({
          ten: 'Ca lỗi',
          gioBatDau: '25:00',
          gioKetThuc: '08:00',
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for a malformed string like "8h00"', async () => {
      await expect(
        service.create({
          ten: 'Ca lỗi',
          gioBatDau: '8h00',
          gioKetThuc: '17:00',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create — giờ nghỉ chỉ có một đầu', () => {
    it('throws BadRequestException when gioNghiTu is set without gioNghiDen', async () => {
      await expect(
        service.create({
          ten: 'Ca có nghỉ',
          gioBatDau: '08:00',
          gioKetThuc: '17:00',
          gioNghiTu: '12:00',
        } as any),
      ).rejects.toThrow(BadRequestException);
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
  describe('update — recomputes laCaQuaDem when times change', () => {
    it('flips a day shift to overnight when times are updated to cross midnight', async () => {
      const existing = {
        _id: '507f1f77bcf86cd799439099',
        ten: 'Ca hành chính',
        gioBatDau: '08:00',
        gioKetThuc: '17:00',
        laCaQuaDem: false,
        isActive: true,
      };
      mockRepo.findOne.mockResolvedValue(existing);

      const result = await service.update('507f1f77bcf86cd799439099', {
        gioBatDau: '22:00',
        gioKetThuc: '06:00',
      } as any);

      expect(result.laCaQuaDem).toBe(true);
    });

    it('throws BadRequestException when updated times are equal', async () => {
      const existing = {
        _id: '507f1f77bcf86cd799439099',
        ten: 'Ca hành chính',
        gioBatDau: '08:00',
        gioKetThuc: '17:00',
        laCaQuaDem: false,
        isActive: true,
      };
      mockRepo.findOne.mockResolvedValue(existing);

      await expect(
        service.update('507f1f77bcf86cd799439099', {
          gioBatDau: '09:00',
          gioKetThuc: '09:00',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // remove — soft delete
  // ──────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('sets isActive=false instead of hard deleting', async () => {
      const id = '507f1f77bcf86cd799439099';
      const existing = { _id: id, ten: 'Ca hành chính', isActive: true };
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
