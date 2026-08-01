import { Module, forwardRef } from '@nestjs/common';
import { CauHinhLuong, OvertimeBalance, OvertimeBalanceEntry } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';
import { QuyGio_Service } from './quy-gio.service';
import { QuyGio_Controller } from './quy-gio.controller';

/**
 * Task 7 (P4.2a) dựng trước một bản tối thiểu của module này (chỉ
 * `DatabaseModule.forFeature` + provider/export `QuyGio_Service`) vì
 * `DonChamCong_Module` cần import được `QuyGio_Service` trước khi Task 9
 * (task này) chạy để dựng controller/route.
 *
 * Task 9 MỞ RỘNG file này — thêm `controllers` và `forwardRef(NhanVien_Module)`
 * mà route tự phục vụ (`cua-toi/so-du`, qua `resolveEmployeeFromUser`) cần —
 * chứ không viết lại. `forwardRef` bắt buộc vì `NhanVien_Module` đã nằm
 * trong một vòng phụ thuộc sẵn có với `QuyPhep_Module` (xem doc-comment
 * `quy-phep.module.ts`) — thêm cạnh mới vào cùng cụm đó cần cùng cách gỡ.
 */
@Module({
  imports: [
    DatabaseModule.forFeature([OvertimeBalance, OvertimeBalanceEntry, CauHinhLuong]),
    forwardRef(() => NhanVien_Module),
  ],
  controllers: [QuyGio_Controller],
  providers: [QuyGio_Service],
  exports: [QuyGio_Service],
})
export class QuyGio_Module {}
