import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
});
