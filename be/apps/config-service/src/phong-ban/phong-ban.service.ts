import { Injectable } from '@nestjs/common';
import { IdentityClient } from '@app/service-client';

/** Phòng ban đọc từ identity. `path` = id tổ tiên, gốc → cha, KHÔNG gồm chính nó. */
export interface PhongBanItem {
  id: string;
  maPhong: string;
  tenPhong: string;
  parentId: string | null;
  path: string[];
  thuTu: number;
}

/**
 * hrm KHÔNG sở hữu danh mục phòng ban — identity mới là nguồn sự thật. Service
 * này chỉ chuyển tiếp và cắt bớt các trường hrm không dùng.
 */
@Injectable()
export class PhongBanService {
  constructor(private readonly identityClient: IdentityClient) {}

  async list(token: string): Promise<PhongBanItem[]> {
    const res = await this.identityClient.listDepartments(token);
    const rows = Array.isArray(res?.data) ? res.data : [];
    return rows.map((d: any) => ({
      id: String(d.id),
      maPhong: d.maPhong,
      tenPhong: d.tenPhong,
      parentId: d.parentId ?? null,
      path: Array.isArray(d.path) ? d.path : [],
      thuTu: d.thuTu ?? 0,
    }));
  }
}
