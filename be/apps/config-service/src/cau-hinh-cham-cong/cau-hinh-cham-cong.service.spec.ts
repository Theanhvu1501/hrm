import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CauHinhChamCong } from '@app/entities';
import { CauHinhChamCong_Service } from './cau-hinh-cham-cong.service';
import { CAU_HINH_CHAM_CONG_MAC_DINH } from './cau-hinh-cham-cong.seed';

describe('CauHinhChamCong_Service', () => {
  let service: CauHinhChamCong_Service;
  let store: Partial<CauHinhChamCong>[];
  let repo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    store = [];
    repo = {
      find: jest.fn(async () => store.filter((r) => r.isActive !== false)),
      create: jest.fn((x) => ({ ...x })),
      save: jest.fn(async (x) => {
        const co = store.find((r) => r === x);
        if (!co) store.push(x);
        return x;
      }),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        CauHinhChamCong_Service,
        { provide: getRepositoryToken(CauHinhChamCong), useValue: repo },
      ],
    }).compile();

    service = mod.get(CauHinhChamCong_Service);
  });

  it('tự tạo bản ghi từ seed T2–T6 khi DB chưa có gì', async () => {
    const ch = await service.layCauHinh();
    expect(ch.ngayLamViecTrongTuan).toEqual([1, 2, 3, 4, 5]);
    expect(CAU_HINH_CHAM_CONG_MAC_DINH.ngayLamViecTrongTuan).toEqual([1, 2, 3, 4, 5]);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(store).toHaveLength(1);
  });

  it('lần đọc thứ hai dùng lại bản ghi cũ, không tạo thêm', async () => {
    await service.layCauHinh();
    await service.layCauHinh();
    expect(store).toHaveLength(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('lichTuanChung() trả mảng lịch của bản ghi', async () => {
    expect(await service.lichTuanChung()).toEqual([1, 2, 3, 4, 5]);
  });

  it('lichTuanChung() trả undefined khi HR bỏ trống hết — nơi gọi giữ đáy "mọi ngày là ngày làm việc"', async () => {
    await service.capNhat({ ngayLamViecTrongTuan: [] });
    expect(await service.lichTuanChung()).toBeUndefined();
  });

  it('capNhat() ghi đè lịch và trả bản ghi đã lưu', async () => {
    const ch = await service.capNhat({ ngayLamViecTrongTuan: [1, 2, 3, 4, 5, 6] });
    expect(ch.ngayLamViecTrongTuan).toEqual([1, 2, 3, 4, 5, 6]);
    expect((await service.layCauHinh()).ngayLamViecTrongTuan).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
