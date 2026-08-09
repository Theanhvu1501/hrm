import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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

  // Giữ nguyên logic của TenantService.throwFromServiceError (tenant.service.ts)
  // để một lỗi identity (token hỏng, timeout, 5xx...) ném đúng exception thay vì
  // bị nuốt thành "danh mục rỗng" — xem tenant.service.ts dòng ~105.
  private throwFromServiceError(res: {
    success: boolean;
    error?: { code?: string; message?: string };
  }): never {
    const { code, message } = res.error ?? {};
    if (code === 'NOT_FOUND') {
      throw new NotFoundException(message ?? 'Không tìm thấy');
    }
    if (code === 'CONFLICT') {
      throw new ConflictException(message ?? 'Xung đột dữ liệu');
    }
    if (code === 'FORBIDDEN')
      throw new ForbiddenException(message ?? 'Không có quyền');
    if (code === 'UNAUTHORIZED')
      throw new UnauthorizedException(message ?? 'Chưa xác thực');
    throw new InternalServerErrorException(
      message ?? 'Lỗi từ identity service',
    );
  }

  async list(token: string): Promise<PhongBanItem[]> {
    const res = await this.identityClient.listDepartments(token);
    if (!res.success) this.throwFromServiceError(res);
    const rows = Array.isArray(res.data) ? res.data : [];
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
