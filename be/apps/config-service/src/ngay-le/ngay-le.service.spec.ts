import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { In } from 'typeorm';
import { NgayLe_Service } from './ngay-le.service';
import { Holiday } from '@app/entities';

describe('NgayLe_Service', () => {
  let service: NgayLe_Service;
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
        NgayLe_Service,
        { provide: getRepositoryToken(Holiday), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<NgayLe_Service>(NgayLe_Service);
  });

  describe('create', () => {
    it('suy trường nam từ tuNgay', async () => {
      const result = await service.create({
        ten: 'Quốc khánh',
        tuNgay: '2026-09-02',
        denNgay: '2026-09-02',
      } as any);

      expect(result.nam).toBe(2026);
    });

    it('từ chối khi denNgay < tuNgay', async () => {
      await expect(
        service.create({
          ten: 'Sai khoảng',
          tuNgay: '2026-09-05',
          denNgay: '2026-09-02',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('chấp nhận khoảng nhiều ngày', async () => {
      const result = await service.create({
        ten: 'Tết Nguyên đán',
        tuNgay: '2027-02-06',
        denNgay: '2027-02-12',
      } as any);

      expect(result.nam).toBe(2027);
      expect(result.denNgay).toBe('2027-02-12');
    });
  });

  describe('timTheoNgay', () => {
    it('trả về ngày lễ khi ngày nằm trong khoảng (bao gồm hai đầu)', async () => {
      mockRepo.find.mockResolvedValue([
        {
          ten: 'Tết',
          tuNgay: '2027-02-06',
          denNgay: '2027-02-12',
          loai: 'le',
          isActive: true,
        },
      ]);

      const bienDau = await service.timTheoNgay('2027-02-06');
      const giua = await service.timTheoNgay('2027-02-09');
      const bienCuoi = await service.timTheoNgay('2027-02-12');

      expect(bienDau?.ten).toBe('Tết');
      expect(giua?.ten).toBe('Tết');
      expect(bienCuoi?.ten).toBe('Tết');
    });

    it('trả về null khi ngày ngoài khoảng', async () => {
      mockRepo.find.mockResolvedValue([
        {
          ten: 'Tết',
          tuNgay: '2027-02-06',
          denNgay: '2027-02-12',
          loai: 'le',
          isActive: true,
        },
      ]);

      expect(await service.timTheoNgay('2027-02-05')).toBeNull();
      expect(await service.timTheoNgay('2027-02-13')).toBeNull();
    });

    it('tìm thấy ngày lễ vắt qua năm mới khi hỏi từ phía năm mới', async () => {
      mockRepo.find.mockResolvedValue([
        {
          ten: 'Nghỉ bù Tết Dương lịch',
          tuNgay: '2026-12-31',
          denNgay: '2027-01-01',
          loai: 'le',
          isActive: true,
        },
      ]);

      const ket = await service.timTheoNgay('2027-01-01');

      expect(ket?.ten).toBe('Nghỉ bù Tết Dương lịch');
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { nam: In([2026, 2027]), isActive: true },
      });
    });

    it('tìm thấy ngày lễ vắt qua năm mới khi hỏi từ phía năm cũ', async () => {
      mockRepo.find.mockResolvedValue([
        {
          ten: 'Nghỉ bù Tết Dương lịch',
          tuNgay: '2026-12-31',
          denNgay: '2027-01-01',
          loai: 'le',
          isActive: true,
        },
      ]);

      const ket = await service.timTheoNgay('2026-12-31');

      expect(ket?.ten).toBe('Nghỉ bù Tết Dương lịch');
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { nam: In([2025, 2026]), isActive: true },
      });
    });
  });

  /**
   * Bản theo KHOẢNG của `timTheoNgay`, cho màn hình lịch tuần: hỏi từng ngày
   * một là 7 lượt truy vấn cho mỗi lần lật tuần, trong khi cùng một tập ngày
   * lễ được nạp đi nạp lại.
   */
  describe('timTheoKhoang', () => {
    const TET = {
      ten: 'Tết',
      tuNgay: '2027-02-06',
      denNgay: '2027-02-12',
      loai: 'le',
      isActive: true,
    };

    it('trả về tập ngày lễ giao với khoảng hỏi', async () => {
      mockRepo.find.mockResolvedValue([TET]);

      const kq = await service.timTheoKhoang('2027-02-08', '2027-02-14');

      expect(kq.map((h) => h.ten)).toEqual(['Tết']);
    });

    it('loại ngày lễ không giao khoảng', async () => {
      mockRepo.find.mockResolvedValue([TET]);

      expect(await service.timTheoKhoang('2027-02-13', '2027-02-20')).toEqual(
        [],
      );
      expect(await service.timTheoKhoang('2027-01-01', '2027-02-05')).toEqual(
        [],
      );
    });

    it('chạm biên vẫn tính là giao (một đầu trùng nhau)', async () => {
      mockRepo.find.mockResolvedValue([TET]);

      expect(
        await service.timTheoKhoang('2027-02-12', '2027-02-20'),
      ).toHaveLength(1);
      expect(
        await service.timTheoKhoang('2027-01-01', '2027-02-06'),
      ).toHaveLength(1);
    });

    it('quét đủ các năm liên quan, kể cả kỳ nghỉ vắt qua năm mới', async () => {
      mockRepo.find.mockResolvedValue([]);

      // Tuần 28/12/2026 → 03/01/2027: phải quét cả 2025 (kỳ nghỉ bắt đầu
      // năm trước lấn sang), 2026 và 2027. Cùng lý do đã ghi ở timTheoNgay.
      await service.timTheoKhoang('2026-12-28', '2027-01-03');

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { nam: In([2025, 2026, 2027]), isActive: true },
      });
    });

    it('một lượt truy vấn duy nhất cho cả khoảng', async () => {
      mockRepo.find.mockResolvedValue([TET]);

      await service.timTheoKhoang('2027-02-01', '2027-02-28');

      expect(mockRepo.find).toHaveBeenCalledTimes(1);
    });
  });
});
