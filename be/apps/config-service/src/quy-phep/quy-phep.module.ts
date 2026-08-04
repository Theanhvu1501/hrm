import { Module, forwardRef } from '@nestjs/common';
import { Employee, LeaveBalance, LeaveBalanceEntry, Timesheet } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';
import { QuyPhep_Service } from './quy-phep.service';
import { QuyPhep_Controller } from './quy-phep.controller';

@Module({
  imports: [
    DatabaseModule.forFeature([LeaveBalance, LeaveBalanceEntry, Employee, Timesheet]),
    // CHỈ controller cần (resolveEmployeeFromUser cho route cua-toi).
    // QuyPhep_Service CỐ Ý không phụ thuộc NhanVien_Service — xem Task 9,
    // NhanVien_Service gọi ngược lại service này (moKhoaLenChinhThuc), nên
    // NhanVien_Module giờ cũng import lại QuyPhep_Module ⇒ vòng phụ thuộc
    // module thật sự ⇒ forwardRef() bắt buộc ở phía này.
    forwardRef(() => NhanVien_Module),
  ],
  controllers: [QuyPhep_Controller],
  providers: [QuyPhep_Service],
  exports: [QuyPhep_Service],
})
export class QuyPhep_Module {}
