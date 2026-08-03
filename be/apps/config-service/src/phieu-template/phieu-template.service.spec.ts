import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { PhieuTemplate_Service } from './phieu-template.service';
import { PhieuTemplate } from '@app/entities';

describe('PhieuTemplate_Service', () => {
  let service: PhieuTemplate_Service;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhieuTemplate_Service,
        { provide: getRepositoryToken(PhieuTemplate), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PhieuTemplate_Service>(PhieuTemplate_Service);
  });

  it('findByLoai trả về bản ghi tìm thấy', async () => {
    const tpl = { loai: 'PHIEU_THU', html: '<p>x</p>' };
    mockRepo.findOne.mockResolvedValue(tpl);
    await expect(service.findByLoai('PHIEU_THU')).resolves.toBe(tpl);
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { loai: 'PHIEU_THU' },
    });
  });

  it('upsert tạo mới khi chưa có', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    const created = { loai: 'PHIEU_CHI', html: '<b>new</b>' };
    mockRepo.create.mockReturnValue(created);
    mockRepo.save.mockImplementation(async (e: any) => e);

    const result = await service.upsert('PHIEU_CHI', '<b>new</b>');

    expect(mockRepo.create).toHaveBeenCalledWith({
      loai: 'PHIEU_CHI',
      html: '<b>new</b>',
    });
    expect(result).toBe(created);
  });

  it('upsert cập nhật html khi đã có', async () => {
    const existing = { loai: 'PHIEU_THU', html: 'old' };
    mockRepo.findOne.mockResolvedValue(existing);
    mockRepo.save.mockImplementation(async (e: any) => e);

    const result = await service.upsert('PHIEU_THU', 'mới');

    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(result.html).toBe('mới');
  });

  it('remove xoá bản ghi nếu tồn tại', async () => {
    const existing = { loai: 'PHIEU_THU', html: 'old' };
    mockRepo.findOne.mockResolvedValue(existing);
    await service.remove('PHIEU_THU');
    expect(mockRepo.remove).toHaveBeenCalledWith(existing);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Chặn 'HOP_DONG_LAO_DONG' — route/guard của controller này (AdminGuard,
  // theo VAI TRÒ, KHÔNG theo quyền chi tiết) không được trở thành đường
  // ghi/đọc thứ hai, không qua sanitize, vào bản ghi mà hop-dong.controller.ts
  // quản lý (xem chú thích tại entity + review Critical 2).
  // ──────────────────────────────────────────────────────────────────────────
  describe('chặn loai=HOP_DONG_LAO_DONG (thuộc về hop-dong module)', () => {
    it('findByLoai ném ForbiddenException, KHÔNG đụng repo', async () => {
      await expect(service.findByLoai('HOP_DONG_LAO_DONG')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRepo.findOne).not.toHaveBeenCalled();
    });

    it('upsert ném ForbiddenException, KHÔNG ghi gì (đây là bản vá chính — vốn là đường ghi không sanitize)', async () => {
      await expect(
        service.upsert('HOP_DONG_LAO_DONG', '<script>alert(1)</script>'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepo.findOne).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('remove ném ForbiddenException, KHÔNG xoá gì', async () => {
      await expect(service.remove('HOP_DONG_LAO_DONG')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });

    it('PHIEU_THU/PHIEU_CHI vẫn hoạt động bình thường (không bị chặn nhầm)', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findByLoai('PHIEU_THU')).resolves.toBeNull();
      await expect(service.findByLoai('PHIEU_CHI')).resolves.toBeNull();
    });
  });
});
