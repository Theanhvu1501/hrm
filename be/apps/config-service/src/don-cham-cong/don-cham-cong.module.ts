import { Module } from '@nestjs/common';
import { AttendanceRequest, Employee } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NgayLe_Module } from '../ngay-le/ngay-le.module';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';
import { QuyPhep_Module } from '../quy-phep/quy-phep.module';
import { DonChamCong_Service } from './don-cham-cong.service';
import { DonChamCong_Controller } from './don-cham-cong.controller';

@Module({
  imports: [
    DatabaseModule.forFeature([AttendanceRequest, Employee]),
    NgayLe_Module,
    // Cần ở HAI chỗ, cùng một lý do "employeeId phải suy từ token":
    //  - controller, route tự phục vụ `cua-toi` — KHÔNG BAO GIỜ đọc từ body;
    //  - service, `updateStatus()` — nhận diện chủ đơn khi hồ sơ chủ đơn
    //    không (còn) gắn `userId`, xem `laChuDonTheoHoSo()`.
    NhanVien_Module,
    // P3.8: DonChamCong_Service gọi thẳng QuyPhep_Service để giữ/nhả/chuyển/
    // hoàn quỹ phép năm xuyên vòng đời đơn — xem create()/updateStatus()/
    // huyDonCuaToi()/remove().
    QuyPhep_Module,
  ],
  controllers: [DonChamCong_Controller],
  providers: [DonChamCong_Service],
  exports: [DonChamCong_Service],
})
export class DonChamCong_Module {}
