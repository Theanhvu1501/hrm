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

  /**
   * `Object.assign(item, dto)` trần là KHÔNG an toàn ở đây: `tsconfig.json`
   * đặt `target: ES2023` ⇒ `useDefineForClassFields` mặc định bật, nên MỌI
   * field khai trên class DTO (kể cả field optional không ai gán) đều tồn
   * tại sẵn trên instance với giá trị `undefined` —
   * `plainToInstance(CapNhatCauHinhChamCongDto, {})` cho
   * `Object.keys() === ['ngayLamViecTrongTuan']`. PUT body rỗng vì vậy sẽ
   * ghi đè lịch tuần đang có thành `undefined`, công ty rơi về "chưa cấu
   * hình" ⇒ T7/CN thành ngày làm việc ⇒ rào chặn chốt (đã gỡ ở P4.5) quay
   * lại mà không một thông báo nào. Chỉ gán những khoá dto THỰC SỰ có giá
   * trị (client cố ý gửi `null`/`[]` để xoá trắng vẫn đi qua bình thường —
   * chỉ `undefined`, tức "không gửi gì", mới bị bỏ qua).
   */
  async capNhat(dto: CapNhatCauHinhChamCongDto): Promise<CauHinhChamCong> {
    const item = await this.layCauHinh();
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        (item as unknown as Record<string, unknown>)[key] = value;
      }
    }
    return this.repo.save(item);
  }
}
