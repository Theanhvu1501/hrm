import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Một nhãn trong từ điển thuật ngữ: nhãn gốc + override theo vị trí. */
export interface GlossaryItem {
  label: string;
  surfaces?: Record<string, string>;
}

/** Từ điển thuật ngữ: key khái niệm (vd 'chuDauTu') → nhãn. */
export type Glossary = Record<string, GlossaryItem>;

@Entity('tenant_app_config')
export class TenantAppConfig extends BaseEntity {
  @Column() declare tenantId: string;
  @Column({ type: 'json', default: ['KE_TOAN'] }) modules: string[];
  @Column({ nullable: true }) nganh?: string | null;
  @Column({ type: 'json', default: {} }) glossary: Glossary;
  @Column({ type: 'json', nullable: true }) dashboardBlocks?: string[] | null;
  /**
   * Thông tin pháp lý công ty dùng để in tiêu đề hợp đồng lao động (P nhân
   * sự — mẫu in HĐLĐ). Cố ý đặt ở ĐÂY (nhan_su, tự phục vụ qua config-service)
   * chứ không gọi sang identity: identity CÓ sẵn `Tenant.maSoThue/diaChi/
   * nguoiDaiDien` nhưng chỉ đọc được qua API admin tenant (`listTenants`),
   * đòi quyền admin ở identity — không phù hợp cho một HR thường bấm "In hợp
   * đồng". Chấp nhận trùng lặp dữ liệu với identity để đổi lấy self-service
   * local, tenant admin tự điền 1 lần trong màn "Mẫu in hợp đồng".
   * Rỗng → khoảng trống "……" hiện rõ trên bản in, không tự bịa giá trị.
   */
  @Column({ nullable: true }) tenCongTy?: string | null;
  @Column({ nullable: true }) diaChiCongTy?: string | null;
  @Column({ nullable: true }) maSoThue?: string | null;
  @Column({ nullable: true }) nguoiDaiDien?: string | null;
  @Column({ nullable: true }) chucVuNguoiDaiDien?: string | null;
}
