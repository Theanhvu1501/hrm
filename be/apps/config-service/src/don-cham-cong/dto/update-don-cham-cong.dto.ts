import { PartialType } from '@nestjs/mapped-types';
import { CreateDonChamCongDto } from './create-don-cham-cong.dto';

// DTO này vẫn khai `trangThai`/`employeeId`/`nguoiDuyet` (thừa hưởng từ
// CreateDonChamCongDto qua PartialType) để pipe validation không chặn nhầm —
// nhưng client gửi kèm ba trường này trong body PUT :id giờ VÔ NGHĨA:
// `DonChamCong_Service.update()` destructure và bỏ hẳn cả ba trước khi merge
// vào entity, một cách cấu trúc (không phải "nếu có thì xoá"). Trạng thái
// đơn CHỈ di chuyển qua `updateStatus()` (PATCH :id/trang-thai) — nơi duy
// nhất kiểm luật KHONG_TU_DUYET_DON và ghi vết nguoiDuyetId/thoiDiemDuyet.
//
// `trangThai` đóng "cửa thứ hai" ở vòng sửa đầu (xem lịch sử report task-4):
// một ADMIN đồng thời là chủ đơn từng gọi PUT với `{ trangThai: 'da_duyet' }`
// để tự duyệt. `employeeId` đóng "cửa thứ ba" ở vòng sửa 2 (task-4-fix2):
// luật KHONG_TU_DUYET_DON đọc chủ đơn TẠI THỜI ĐIỂM DUYỆT, nên nếu PUT còn
// sửa được employeeId thì đổi đơn sang tên đồng nghiệp → nhờ duyệt → đổi
// employeeId về lại tên mình cũng né được luật, chỉ khác đường vào. Chủ đơn
// được chốt lúc tạo; muốn đổi người đứng tên thì huỷ đơn và tạo đơn mới.
// `nguoiDuyet` bị bỏ cùng lý do: nửa đáng tin của vết duyệt là
// `nguoiDuyetId`, chỉ updateStatus() được ghi — không để PUT ghi lệch nửa
// tên hiển thị còn lại.
export class UpdateDonChamCongDto extends PartialType(CreateDonChamCongDto) {}
