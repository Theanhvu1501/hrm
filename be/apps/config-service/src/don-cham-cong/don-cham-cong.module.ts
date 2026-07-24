import { Module } from '@nestjs/common';
import { AttendanceRequest, Employee } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NgayLe_Module } from '../ngay-le/ngay-le.module';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';
import { DonChamCong_Service } from './don-cham-cong.service';
import { DonChamCong_Controller } from './don-cham-cong.controller';

@Module({
  imports: [
    DatabaseModule.forFeature([AttendanceRequest, Employee]),
    NgayLe_Module,
    // Cần cho route tự phục vụ `cua-toi`: controller gọi
    // NhanVien_Service.resolveEmployeeFromUser(req.user) để suy employeeId
    // từ token, KHÔNG BAO GIỜ đọc từ body (Task 4 — vá lỗ hổng đơn từ).
    NhanVien_Module,
  ],
  controllers: [DonChamCong_Controller],
  providers: [DonChamCong_Service],
  exports: [DonChamCong_Service],
})
export class DonChamCong_Module {}
