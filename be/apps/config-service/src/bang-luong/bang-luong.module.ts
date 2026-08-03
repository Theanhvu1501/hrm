import { Module } from '@nestjs/common';
import {
  AttendanceRequest,
  CauHinhLuong,
  DongLuong,
  DongLuongThemGio,
  Employee,
  Timesheet,
} from '@app/entities';
import { DatabaseModule } from '@app/database';
import { BangLuong_Service } from './bang-luong.service';
import { BangLuong_Controller } from './bang-luong.controller';
import { ThemGio_Service } from './them-gio.service';
import { QuyGio_Module } from '../quy-gio/quy-gio.module';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';
import { ThemGio_Controller } from './them-gio.controller';

@Module({
  imports: [
    // ThemGio_Service đọc quỹ hết hạn để quy ra tiền.
    QuyGio_Module,
    // Route tự phục vụ cần `resolveEmployeeFromUser()` để suy employeeId từ token.
    NhanVien_Module,
    DatabaseModule.forFeature([
      CauHinhLuong,
      DongLuong,
      DongLuongThemGio,
      Employee,
      Timesheet,
      AttendanceRequest,
    ]),
  ],
  controllers: [BangLuong_Controller, ThemGio_Controller],
  providers: [BangLuong_Service, ThemGio_Service],
  exports: [BangLuong_Service, ThemGio_Service],
})
export class BangLuong_Module {}
