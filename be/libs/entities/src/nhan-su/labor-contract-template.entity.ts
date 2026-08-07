import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Mẫu in hợp đồng lao động — NHIỀU mẫu mỗi tenant, mỗi mẫu một tên.
 *
 * Vì sao không tái dùng `PhieuTemplate` (nơi mẫu hợp đồng từng nằm): entity
 * đó khai bất biến "1 bản/tenant/loại" và `PhieuTemplate_Service` còn chủ
 * động chặn `loai = 'HOP_DONG_LAO_DONG'` để không tồn tại đường ghi thứ hai
 * không qua sanitize. Nhồi nhiều dòng vào đó là phá bất biến của cả phiếu
 * thu lẫn phiếu chi để mượn một cột.
 *
 * `html` chứa placeholder `{{...}}`; danh sách token hợp lệ ở
 * `hop-dong/lib/hopDongRender.ts` (`HOP_DONG_TOKENS`). HTML được sanitize
 * lúc GHI và một lần nữa lúc RENDER — không lớp nào là chốt chặn duy nhất.
 *
 * Cố ý KHÔNG có cột "áp dụng cho loại hợp đồng nào": cùng một hợp đồng có
 * thể cần in ra nhiều dạng khác nhau, nên mẫu do người in chọn tại chỗ chứ
 * không bị dữ liệu quyết định thay.
 */
@Entity('hop_dong_mau_in')
export class LaborContractTemplate extends BaseEntity {
  @Column() ten: string;

  @Column() html: string;

  @Column({ default: true }) isActive: boolean;
}

export interface HopDongMauInEntities {
  LaborContractTemplate: typeof LaborContractTemplate;
}

declare module '../entities' {
  interface Entities extends HopDongMauInEntities {}
}
