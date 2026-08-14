import { Module } from '@nestjs/common';
import {
  AttendanceRecord,
  WorkShift,
  AttendanceLocation,
  AttendanceRequest,
} from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';
import { ThietBiChamCong_Module } from '../thiet-bi-cham-cong/thiet-bi-cham-cong.module';
import { NgayLe_Module } from '../ngay-le/ngay-le.module';
import { CauHinhChamCong_Module } from '../cau-hinh-cham-cong/cau-hinh-cham-cong.module';
import { BanGhiChamCong_Service } from './ban-ghi-cham-cong.service';
import { BanGhiChamCong_Controller } from './ban-ghi-cham-cong.controller';
import { ChamCongRules_Service } from './cham-cong-rules.service';

@Module({
  imports: [
    DatabaseModule.forFeature([
      AttendanceRecord,
      WorkShift,
      AttendanceLocation,
      // Đơn `lam_online` mở khoá đối chiếu vị trí theo ngày — xem
      // BanGhiChamCong_Service.coDonOnlineDaDuyet().
      AttendanceRequest,
    ]),
    NhanVien_Module,
    ThietBiChamCong_Module,
    NgayLe_Module,
    // (P4.5) suyNgayNghi() đọc lịch tuần chung khi NV không khai riêng —
    // CauHinhChamCong_Module không phụ thuộc module nào, không cần forwardRef().
    CauHinhChamCong_Module,
  ],
  controllers: [BanGhiChamCong_Controller],
  providers: [BanGhiChamCong_Service, ChamCongRules_Service],
  exports: [BanGhiChamCong_Service],
})
export class BanGhiChamCong_Module {}
