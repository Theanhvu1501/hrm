// Doi Tuong DTOs
export type DoiTuongType =
  | 'KHACH_HANG'
  | 'NHA_CUNG_CAP'
  | 'NHAN_VIEN'
  | 'NHA_THAU';

export interface DoiTuongResponse {
  _id: string;
  loai: DoiTuongType[];
  ma: string;
  ten: string;
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  maSoThue?: string;
  isActive: boolean;
}

export interface CreateDoiTuongRequest {
  loai: DoiTuongType[];
  ma: string;
  ten: string;
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  maSoThue?: string;
}

export interface DoiTuongDTOs {
  DoiTuongResponse: DoiTuongResponse;
  CreateDoiTuongRequest: CreateDoiTuongRequest;
}

declare module '../dto' {
  interface DTOs extends DoiTuongDTOs {}
}
