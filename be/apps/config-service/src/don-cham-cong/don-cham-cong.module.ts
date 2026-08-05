import { Module } from '@nestjs/common';
import { AttendanceRequest, Employee } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NgayLe_Module } from '../ngay-le/ngay-le.module';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';
import { QuyPhep_Module } from '../quy-phep/quy-phep.module';
import { QuyGio_Module } from '../quy-gio/quy-gio.module';
import { CauHinhChamCong_Module } from '../cau-hinh-cham-cong/cau-hinh-cham-cong.module';
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
    // Task 7 (P4.2a): song song với QuyPhep_Module — DonChamCong_Service gọi
    // thẳng QuyGio_Service để tích quỹ giờ khi duyệt đơn OT, và giữ/nhả/
    // chuyển/hoàn quỹ giờ xuyên vòng đời đơn nghỉ bù. Xem create()/
    // updateStatus().
    QuyGio_Module,
    // (P4.5) cacNgayTruPhep()/tinhCacTruongSnapshot() đọc lịch tuần chung khi
    // NV không khai riêng — CauHinhChamCong_Module không phụ thuộc module
    // nào (không có vòng import ngược), nên không cần forwardRef().
    CauHinhChamCong_Module,
  ],
  controllers: [DonChamCong_Controller],
  providers: [DonChamCong_Service],
  exports: [DonChamCong_Service],
})
export class DonChamCong_Module {}
