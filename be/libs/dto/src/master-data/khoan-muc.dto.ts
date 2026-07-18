// Khoan Muc DTOs
export type LoaiKhoanMuc = 'THU' | 'CHI';

export interface KhoanMucResponse {
  _id: string;
  ma: string;
  ten: string;
  loai: LoaiKhoanMuc;
  moTa?: string;
  isActive: boolean;
}

export interface CreateKhoanMucRequest {
  ma: string;
  ten: string;
  loai: LoaiKhoanMuc;
  moTa?: string;
}

export interface KhoanMucDTOs {
  KhoanMucResponse: KhoanMucResponse;
  CreateKhoanMucRequest: CreateKhoanMucRequest;
}

declare module '../dto' {
  interface DTOs extends KhoanMucDTOs {}
}
