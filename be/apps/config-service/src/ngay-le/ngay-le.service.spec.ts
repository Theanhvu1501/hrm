import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
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
  });
});
