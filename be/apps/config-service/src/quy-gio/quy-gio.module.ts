import { Module } from '@nestjs/common';
import { CauHinhLuong, OvertimeBalance, OvertimeBalanceEntry } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { QuyGio_Service } from './quy-gio.service';

/**
 * Task 7 (P4.2a): tạo trước một bản tối thiểu của module này — chỉ đủ để
 * `DonChamCong_Module` inject được `QuyGio_Service` — vì kế hoạch gốc đặt
 * việc dựng controller/route "cua-toi"/"so-du" vào Task 9 (chạy SAU Task 7),
 * trong khi Task 7 đã cần `QuyGio_Module` tồn tại để import ngay bây giờ.
 * Task 9 sẽ MỞ RỘNG file này (thêm `controllers`, `forwardRef(NhanVien_Module)`
 * cho route tự phục vụ) chứ không viết lại — xem
 * docs/superpowers/plans/2026-07-31-hrm-p4.2a-quy-gio-lam-them.md Task 9.
 */
@Module({
  imports: [
    DatabaseModule.forFeature([OvertimeBalance, OvertimeBalanceEntry, CauHinhLuong]),
  ],
  providers: [QuyGio_Service],
  exports: [QuyGio_Service],
})
export class QuyGio_Module {}
