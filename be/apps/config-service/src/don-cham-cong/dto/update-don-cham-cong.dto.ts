import { PartialType } from '@nestjs/mapped-types';
import { CreateDonChamCongDto } from './create-don-cham-cong.dto';

// DTO này vẫn khai `trangThai` (thừa hưởng từ CreateDonChamCongDto qua
// PartialType) để pipe validation không chặn nhầm — nhưng client gửi kèm
// trường này trong body PUT :id giờ VÔ NGHĨA: `DonChamCong_Service.update()`
// destructure và bỏ hẳn `trangThai` trước khi merge vào entity, một cách cấu
// trúc (không phải "nếu có thì xoá"). Trạng thái đơn CHỈ di chuyển qua
// `updateStatus()` (PATCH :id/trang-thai) — nơi duy nhất kiểm luật
// KHONG_TU_DUYET_DON và ghi vết nguoiDuyetId/thoiDiemDuyet. Quyết định này
// đóng "cửa thứ hai" mà Task 4 ban đầu cố tình để ngỏ (xem lịch sử report
// task-4): một ADMIN đồng thời là chủ đơn từng có thể gọi PUT với
// `{ trangThai: 'da_duyet' }` để tự duyệt, né hoàn toàn luật chặn tự duyệt.
export class UpdateDonChamCongDto extends PartialType(CreateDonChamCongDto) {}
