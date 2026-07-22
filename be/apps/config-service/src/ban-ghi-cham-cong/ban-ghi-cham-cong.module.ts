import { Module } from '@nestjs/common';
import { AttendanceRecord, WorkShift, AttendanceLocation } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';
import { ThietBiChamCong_Module } from '../thiet-bi-cham-cong/thiet-bi-cham-cong.module';
import { NgayLe_Module } from '../ngay-le/ngay-le.module';
import { BanGhiChamCong_Service } from './ban-ghi-cham-cong.service';
import { BanGhiChamCong_Controller } from './ban-ghi-cham-cong.controller';
import { ChamCongRules_Service } from './cham-cong-rules.service';

@Module({
  imports: [
    DatabaseModule.forFeature([
      AttendanceRecord,
      WorkShift,
      AttendanceLocation,
    ]),
    NhanVien_Module,
    ThietBiChamCong_Module,
    NgayLe_Module,
  ],
  controllers: [BanGhiChamCong_Controller],
  providers: [BanGhiChamCong_Service, ChamCongRules_Service],
  exports: [BanGhiChamCong_Service],
})
export class BanGhiChamCong_Module {}
