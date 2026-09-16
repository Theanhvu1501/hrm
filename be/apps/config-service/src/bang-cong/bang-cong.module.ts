import { Module } from '@nestjs/common';
import {
  Timesheet,
  Employee,
  AttendanceRequest,
  AttendanceRecord,
  Holiday,
  Resignation,
} from '@app/entities';
import { DatabaseModule } from '@app/database';
import { QuyPhep_Module } from '../quy-phep/quy-phep.module';
import { CauHinhChamCong_Module } from '../cau-hinh-cham-cong/cau-hinh-cham-cong.module';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';
import { BangCong_Service } from './bang-cong.service';
import { BangCong_Controller } from './bang-cong.controller';

@Module({
  imports: [
    DatabaseModule.forFeature([
      Timesheet,
      Employee,
      AttendanceRequest,
      AttendanceRecord,
      Holiday,
      Resignation,
    ]),
    // (P3.10) finalize() tích phép năm cho tháng vừa chốt.
    QuyPhep_Module,
    // (P4.5) generate()/suyLaiMotNgay()/demLaiOTrong() đọc lịch tuần chung.
    CauHinhChamCong_Module,
    // Hai route TỰ PHỤC VỤ (`cua-toi`, `:id/phan-hoi`) cần suy hồ sơ NV từ
    // token — cùng đường mà các module chấm công khác đang dùng.
    NhanVien_Module,
  ],
  controllers: [BangCong_Controller],
  providers: [BangCong_Service],
  exports: [BangCong_Service],
})
export class BangCong_Module {}
