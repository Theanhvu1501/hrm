import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Employee, TamUngLuong } from '@app/entities';
import { TamUng_Service } from './tam-ung.service';

const NV_ID = '507f1f77bcf86cd799439011';
const DON_ID = '507f1f77bcf86cd799439099';

describe('TamUng_Service', () => {
  let service: TamUng_Service;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let nhanVienRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ ...v, _id: v._id ?? 'tu-1' })),
    };
    nhanVienRepo = {
      findOne: jest.fn().mockResolvedValue({
        _id: NV_ID,
        hoTen: 'Trần Thị B',
        employeeId: 'NV0002',
      }),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        TamUng_Service,
        { provide: getRepositoryToken(TamUngLuong), useValue: repo },
        { provide: getRepositoryToken(Employee), useValue: nhanVienRepo },
      ],
    }).compile();

    service = mod.get(TamUng_Service);
  });

  const donMoi = {
    thang: '2026-09',
    ngayDeNghi: '2026-09-10',
    soTien: 3_000_000,
    lyDo: 'Việc gia đình',
  };

  describe('create', () => {
    it('điền sẵn tên/mã nhân viên và để trạng thái chờ duyệt', async () => {
      const don = await service.create(donMoi as any, NV_ID);

      expect(don).toMatchObject({
        employeeId: NV_ID,
        employeeName: 'Trần Thị B',
        employeeCode: 'NV0002',
        soTien: 3_000_000,
        trangThai: 'cho_duyet',
      });
    });

    it('không có hồ sơ nhân viên thì từ chối', async () => {
      nhanVienRepo.findOne.mockResolvedValue(null);
      await expect(service.create(donMoi as any, NV_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('duyet', () => {
    it('duyệt đơn chờ duyệt: ghi người duyệt và ngày duyệt', async () => {
      repo.findOne.mockResolvedValue({
        _id: DON_ID,
        trangThai: 'cho_duyet',
        employeeId: NV_ID,
      });

      const ra = await service.duyet(
        DON_ID,
        { trangThai: 'da_duyet' } as any,
        'hr@congty.vn',
        '2026-09-11',
      );

      expect(ra.trangThai).toBe('da_duyet');
      expect(ra.nguoiDuyet).toBe('hr@congty.vn');
      expect(ra.ngayDuyet).toBe('2026-09-11');
    });

    it('từ chối mà không nêu lý do thì KHÔNG cho', async () => {
      repo.findOne.mockResolvedValue({ _id: DON_ID, trangThai: 'cho_duyet' });

      await expect(
        service.duyet(
          DON_ID,
          { trangThai: 'tu_choi', lyDoTuChoi: '   ' } as any,
          'hr@congty.vn',
          '2026-09-11',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('đơn ĐÃ duyệt không duyệt lại — số của nó có thể đã vào bảng lương', async () => {
      repo.findOne.mockResolvedValue({ _id: DON_ID, trangThai: 'da_duyet' });

      await expect(
        service.duyet(
          DON_ID,
          { trangThai: 'tu_choi', lyDoTuChoi: 'nhầm' } as any,
          'hr@congty.vn',
          '2026-09-11',
        ),
      ).rejects.toThrow(/không duyệt lại/);
    });
  });

  describe('remove', () => {
    it('đơn đã duyệt thì không huỷ được từ giao diện', async () => {
      repo.findOne.mockResolvedValue({ _id: DON_ID, trangThai: 'da_duyet' });
      await expect(service.remove(DON_ID)).rejects.toThrow(/đã duyệt/);
    });

    it('đơn chờ duyệt: xoá mềm', async () => {
      const don: any = { _id: DON_ID, trangThai: 'cho_duyet', isActive: true };
      repo.findOne.mockResolvedValue(don);

      await service.remove(DON_ID);

      expect(don.isActive).toBe(false);
    });
  });

  describe('kiemChuNhan', () => {
    it('đơn của người khác thì chặn', async () => {
      repo.findOne.mockResolvedValue({ _id: DON_ID, employeeId: 'nguoi-khac' });
      await expect(
        service.kiemChuNhan(DON_ID, NV_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('tongDaDuyetTheoKy', () => {
    it('cộng dồn nhiều đơn của cùng một người', async () => {
      repo.find.mockResolvedValue([
        { employeeId: 'a', soTien: 1_000_000 },
        { employeeId: 'a', soTien: 500_000 },
        { employeeId: 'b', soTien: 2_000_000 },
      ]);

      expect(await service.tongDaDuyetTheoKy('2026-09')).toStrictEqual({
        a: 1_500_000,
        b: 2_000_000,
      });
    });

    it('CHỈ lấy đơn đã duyệt — đơn chờ duyệt không được trừ vào lương', async () => {
      await service.tongDaDuyetTheoKy('2026-09');

      expect(repo.find).toHaveBeenCalledWith({
        where: { thang: '2026-09', trangThai: 'da_duyet', isActive: true },
      });
    });
  });
});
