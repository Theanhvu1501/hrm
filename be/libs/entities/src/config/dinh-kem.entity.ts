import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Tệp đính kèm dùng chung cho mọi hồ sơ nghiệp vụ (hồ sơ NV, hợp đồng, quá
 * trình công tác, thôi việc…).
 *
 * Vì sao KHÔNG nhét thẳng `storageKey` vào từng entity: yêu cầu nghiệp vụ là
 * "cho tải file" ở 6 chỗ khác nhau và mỗi chỗ nhiều file (ảnh CCCD mặt
 * trước/mặt sau, ba loại giấy tờ người phụ thuộc, biên bản bàn giao + thanh
 * lý + đơn xin nghỉ). Thêm cột cho từng chỗ là mỗi lần có chỗ mới lại sửa
 * entity + DTO + migration.
 *
 * Khoá tra cứu là bộ ba `(doiTuong, doiTuongId, nhom)`, thêm `khoaPhu` cho
 * các dòng con nằm trong mảng JSON của hồ sơ (một bằng cấp, một người phụ
 * thuộc) — `khoaPhu` là id RIÊNG của dòng đó, KHÔNG phải vị trí trong mảng:
 * xoá dòng thứ nhất là mọi vị trí phía sau tụt xuống một, file sẽ bám nhầm
 * người.
 *
 * File thật nằm ở GridFS qua `StorageService` (bucket `tai_lieu_files`, dùng
 * chung với Thư viện tài liệu — cùng một kho, khác bảng metadata).
 */
@Entity('dinh_kem')
export class DinhKem extends BaseEntity {
  /** 'nhan_vien' | 'hop_dong' | 'qua_trinh_cong_tac' | 'thoi_viec' | … */
  @Column()
  @Index()
  doiTuong: string;

  /**
   * id bản ghi chủ. Lúc form còn ở chế độ THÊM (chưa có bản ghi), FE gửi một
   * id nháp tự sinh rồi gọi `PATCH /dinh-kem/gan` để chuyển sang id thật sau
   * khi lưu — xem `DinhKem_Service.ganLai`.
   */
  @Column()
  @Index()
  doiTuongId: string;

  /** 'cccd' | 'so_yeu_ly_lich' | 'bang_cap' | 'nguoi_phu_thuoc:ca_nhan' | … */
  @Column()
  nhom: string;

  /** id của dòng con trong mảng JSON (một bằng cấp, một người phụ thuộc). */
  @Column({ nullable: true })
  khoaPhu?: string;

  @Column() tenFile: string;
  @Column() storageKey: string;
  @Column() mimeType: string;
  @Column({ default: 0 }) size: number;
  @Column({ nullable: true }) createdBy?: string;
}

export interface DinhKemEntities {
  DinhKem: typeof DinhKem;
}

declare module '../entities' {
  interface Entities extends DinhKemEntities {}
}
