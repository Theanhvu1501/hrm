import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

// Số nhập tay của báo cáo thuế, khóa theo (tenantId, nam).
// Mỗi field là mảng 4 phần tử tương ứng Q1..Q4.
@Entity('dieu_chinh_thue')
export class DieuChinhThue extends BaseEntity {
  @Column() nam: number;

  // Chi phí không được trừ (4 dòng theo sheet TNDN)
  @Column({ type: 'json', default: [0, 0, 0, 0] }) cpkdtDichVuHangHoa: number[];
  @Column({ type: 'json', default: [0, 0, 0, 0] }) cpkdtTscdCcdc: number[];
  @Column({ type: 'json', default: [0, 0, 0, 0] }) cpkdtNhanCong: number[];
  @Column({ type: 'json', default: [0, 0, 0, 0] }) cpkdtTaiChinhKhac: number[];

  // Điều chỉnh thu nhập tính thuế
  @Column({ type: 'json', default: [0, 0, 0, 0] }) thuNhapMienThue: number[];
  @Column({ type: 'json', default: [0, 0, 0, 0] }) loDuocChuyen: number[];

  // Nghĩa vụ ngân sách nhập tay
  @Column({ type: 'json', default: [0, 0, 0, 0] }) thueTNCN: number[];
  @Column({ type: 'json', default: [0, 0, 0, 0] }) bhxh3383: number[];
  @Column({ type: 'json', default: [0, 0, 0, 0] }) bhyt3384: number[];
  @Column({ type: 'json', default: [0, 0, 0, 0] }) bhtn3386: number[];

  @Column({ default: true }) isActive: boolean;
}

export interface DieuChinhThueEntities { DieuChinhThue: typeof DieuChinhThue; }
declare module '../entities' { interface Entities extends DieuChinhThueEntities {} }
