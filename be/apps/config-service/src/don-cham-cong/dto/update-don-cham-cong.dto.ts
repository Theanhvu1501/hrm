import { PartialType } from '@nestjs/mapped-types';
import { CreateDonChamCongDto } from './create-don-cham-cong.dto';

// KHÔNG loại trangThai/nguoiDuyet khỏi DTO này — brief Task 4 nói rõ đường
// duyệt là PATCH :id/trang-thai (body inline riêng), "mở rộng đường đó chứ
// không phải DTO create/update", và spec §6 liệt PUT :id là "sửa + duyệt"
// của nhóm quản trị. Xem ghi chú rủi ro còn lại ở don-cham-cong.service.ts
// (update()): PUT hiện có thể set thẳng trangThai mà không qua luật chặn tự
// duyệt trong updateStatus() — cố tình để nguyên theo đúng phạm vi brief,
// gắn cờ trong report thay vì tự ý mở rộng phạm vi.
export class UpdateDonChamCongDto extends PartialType(CreateDonChamCongDto) {}
