import type { LoaiChungTu, DanhMuc } from './chung-tu.dto';

// Nhat Ky Chung (General Journal) DTOs

/**
 * Journal entry from ChungTu entity
 */
export interface NhatKyChungEntry {
  _id?: string;
  soPhieu: string;
  loai: LoaiChungTu;
  ngay: Date;
  soTien: number;
  noiDung: string;
  nguoiTaoId?: string;
  danhMuc?: DanhMuc;
  createdAt?: Date;
  updatedAt?: Date;
  // Legacy fields for backward compatibility
  taiKhoanNo?: string;
  taiKhoanCo?: string;
}

export interface NhatKyChungQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  loai?: LoaiChungTu;
}

export interface NhatKyChungPaginatedResponse {
  success: boolean;
  data: NhatKyChungEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface NhatKyChungDTOs {
  NhatKyChungEntry: NhatKyChungEntry;
  NhatKyChungQueryParams: NhatKyChungQueryParams;
  NhatKyChungPaginatedResponse: NhatKyChungPaginatedResponse;
}

declare module '../dto' {
  interface DTOs extends NhatKyChungDTOs {}
}
