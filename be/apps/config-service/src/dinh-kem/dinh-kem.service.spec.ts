import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DinhKem } from '@app/entities';
import { DinhKem_Service } from './dinh-kem.service';
import { STORAGE_SERVICE } from '../tai-lieu/storage/storage.interface';

const CTX = { tenantId: 'tenant-1', userId: 'user-1' };

function fakeFile(over: Partial<Express.Multer.File> = {}) {
  return {
    originalname: 'cccd-mat-truoc.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('anh'),
    ...over,
  } as Express.Multer.File;
}

describe('DinhKem_Service', () => {
  let service: DinhKem_Service;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
  };
  let storage: { save: jest.Mock; stream: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ ...v, _id: 'dk-1' })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      update: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    storage = {
      save: jest
        .fn()
        .mockResolvedValue({ storageKey: 'gridfs-1', size: 1024 }),
      stream: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        DinhKem_Service,
        { provide: getRepositoryToken(DinhKem), useValue: repo },
        { provide: STORAGE_SERVICE, useValue: storage },
      ],
    }).compile();

    service = mod.get(DinhKem_Service);
  });

  describe('tai', () => {
    it('lưu file rồi ghi bản ghi trỏ vào storageKey vừa nhận', async () => {
      const dk = await service.tai(
        fakeFile(),
        { doiTuong: 'nhan_vien', doiTuongId: 'nv-1', nhom: 'cccd' },
        CTX,
      );

      expect(storage.save).toHaveBeenCalledWith(expect.any(Buffer), {
        filename: 'cccd-mat-truoc.jpg',
        mimeType: 'image/jpeg',
        tenantId: 'tenant-1',
      });
      expect(dk).toMatchObject({
        doiTuong: 'nhan_vien',
        doiTuongId: 'nv-1',
        nhom: 'cccd',
        storageKey: 'gridfs-1',
        tenFile: 'cccd-mat-truoc.jpg',
        size: 1024,
        createdBy: 'user-1',
      });
    });

    it('từ chối định dạng ngoài danh sách cho phép', async () => {
      await expect(
        service.tai(
          fakeFile({ mimetype: 'application/x-msdownload' }),
          { doiTuong: 'nhan_vien', doiTuongId: 'nv-1', nhom: 'cccd' },
          CTX,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('từ chối file quá 15MB', async () => {
      await expect(
        service.tai(
          fakeFile({ size: 16 * 1024 * 1024 }),
          { doiTuong: 'nhan_vien', doiTuongId: 'nv-1', nhom: 'cccd' },
          CTX,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('từ chối khi thiếu nhóm — không có nhóm thì không biết file thuộc ô nào', async () => {
      await expect(
        service.tai(
          fakeFile(),
          { doiTuong: 'nhan_vien', doiTuongId: 'nv-1', nhom: '' },
          CTX,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('danhSach', () => {
    it('lọc theo khoá phụ khi có — mỗi bằng cấp một tệp riêng', async () => {
      await service.danhSach({
        doiTuong: 'nhan_vien',
        doiTuongId: 'nv-1',
        nhom: 'bang_cap',
        khoaPhu: 'bc-2',
      });
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            doiTuong: 'nhan_vien',
            doiTuongId: 'nv-1',
            nhom: 'bang_cap',
            khoaPhu: 'bc-2',
          },
        }),
      );
    });

    it('thiếu đối tượng thì từ chối, KHÔNG trả về đính kèm của cả tenant', async () => {
      await expect(
        service.danhSach({ doiTuong: 'nhan_vien', doiTuongId: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.find).not.toHaveBeenCalled();
    });
  });

  describe('ganLai', () => {
    it('chuyển đính kèm từ id nháp sang id thật sau khi lưu hồ sơ', async () => {
      const soDong = await service.ganLai('nhan_vien', 'nhap-abc', 'nv-9');
      expect(repo.update).toHaveBeenCalledWith(
        { doiTuong: 'nhan_vien', doiTuongId: 'nhap-abc' },
        { doiTuongId: 'nv-9' },
      );
      expect(soDong).toBe(2);
    });
  });

  describe('xoa', () => {
    it('không tìm thấy thì báo 404 thay vì im lặng', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.xoa('64b8f0000000000000000001')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('xoá bản ghi trước rồi mới xoá file trong kho', async () => {
      const goi: string[] = [];
      repo.findOne.mockResolvedValue({
        _id: 'dk-1',
        storageKey: 'gridfs-1',
        doiTuong: 'nhan_vien',
      });
      repo.delete.mockImplementation(async () => {
        goi.push('repo');
        return { affected: 1 };
      });
      storage.delete.mockImplementation(async () => {
        goi.push('storage');
      });

      await service.xoa('64b8f0000000000000000001');

      expect(goi).toStrictEqual(['repo', 'storage']);
    });
  });

  describe('xoaTheoDoiTuong', () => {
    it('dọn cả file lẫn bản ghi khi hồ sơ chủ bị xoá', async () => {
      repo.find.mockResolvedValue([
        { storageKey: 'g1' },
        { storageKey: 'g2' },
      ]);
      await service.xoaTheoDoiTuong('nhan_vien', 'nv-1');
      expect(storage.delete).toHaveBeenCalledTimes(2);
      expect(repo.delete).toHaveBeenCalledWith({
        doiTuong: 'nhan_vien',
        doiTuongId: 'nv-1',
      });
    });

    it('không có đính kèm thì không gọi xoá bảng', async () => {
      repo.find.mockResolvedValue([]);
      await service.xoaTheoDoiTuong('nhan_vien', 'nv-1');
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
