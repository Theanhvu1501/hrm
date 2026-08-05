import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CauHinhChamCong } from '@app/entities';
import { CapNhatCauHinhChamCongDto } from './dto';
import { CAU_HINH_CHAM_CONG_MAC_DINH } from './cau-hinh-cham-cong.seed';

@Injectable()
export class CauHinhChamCong_Service {
  constructor(
    @InjectRepository(CauHinhChamCong)
    private readonly repo: Repository<CauHinhChamCong>,
  ) {}

  /**
   * Bản ghi singleton. Chưa có thì tạo từ seed rồi lưu lại — cùng khuôn
   * `BangLuong_Service.layCauHinh()`. Không có migration, không có seed script.
   */
  async layCauHinh(): Promise<CauHinhChamCong> {
    const rows = await this.repo.find({ where: { isActive: true } as any });
    if (rows.length > 0) return rows[0];

    const created = this.repo.create({ ...CAU_HINH_CHAM_CONG_MAC_DINH });
    return this.repo.save(created);
  }

  /**
   * Lịch tuần chung của công ty, hoặc `undefined` khi HR cố ý bỏ trống.
   *
   * Trả `undefined` chứ không `[]`: nơi gọi (`lichTuanApDung`) dùng
   * `undefined` làm tín hiệu rơi xuống đáy "mọi ngày đều là ngày làm việc".
   * Trả `[]` sẽ khiến các hàm thuần hạ nguồn hiểu thành "không ngày nào là
   * ngày làm việc" — xoá sạch công của cả công ty.
   */
  async lichTuanChung(): Promise<number[] | undefined> {
    const lich = (await this.layCauHinh()).ngayLamViecTrongTuan;
    return lich && lich.length > 0 ? lich : undefined;
  }

  async capNhat(dto: CapNhatCauHinhChamCongDto): Promise<CauHinhChamCong> {
    const item = await this.layCauHinh();
    Object.assign(item, dto);
    return this.repo.save(item);
  }
}
