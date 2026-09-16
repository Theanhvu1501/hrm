import { Module } from '@nestjs/common';
import { CauHinhLuong, EmploymentHistory, Employee } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { PhongBanModule } from '../phong-ban/phong-ban.module';
import { DinhKem_Module } from '../dinh-kem/dinh-kem.module';
import { HopDong_Module } from '../hop-dong/hop-dong.module';
import { QuaTrinhCongTac_Service } from './qua-trinh-cong-tac.service';
import { QuaTrinhCongTac_Controller } from './qua-trinh-cong-tac.controller';

@Module({
  imports: [
    // `CauHinhLuong` chỉ ĐỌC — lấy nhãn khoản lương khi in phụ lục hợp đồng.
    DatabaseModule.forFeature([EmploymentHistory, Employee, CauHinhLuong]),
    PhongBanModule,
    // Chứng từ đính kèm là BẮT BUỘC khi ghi nhận thay đổi (yêu cầu d13), nên
    // service cần đếm tệp trước khi ghi và gán lại sau khi ghi.
    DinhKem_Module,
    // Thông tin công ty (letterhead) trên phụ lục hợp đồng dùng chung nguồn
    // với hợp đồng — không dựng bản sao thứ hai của cùng dữ liệu.
    HopDong_Module,
  ],
  controllers: [QuaTrinhCongTac_Controller],
  providers: [QuaTrinhCongTac_Service],
  exports: [QuaTrinhCongTac_Service],
})
export class QuaTrinhCongTac_Module {}
