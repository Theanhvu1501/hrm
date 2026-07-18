// Du An DTOs
export type DuAnStatus = 'DANG_THUC_HIEN' | 'HOAN_THANH' | 'TAM_DUNG';

export interface DuAnResponse {
  _id: string;
  ma: string;
  ten: string;
  ngayBatDau?: Date;
  ngayKetThuc?: Date;
  chuDuAnMa?: string;
  chuDuAn?: string;
  trangThai: DuAnStatus;
  moTa?: string;
  isActive: boolean;
}

export interface CreateDuAnRequest {
  ma: string;
  ten: string;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  chuDuAnMa?: string;
  chuDuAn?: string;
  trangThai?: DuAnStatus;
  moTa?: string;
}

export interface DuAnDTOs {
  DuAnResponse: DuAnResponse;
  CreateDuAnRequest: CreateDuAnRequest;
}

declare module '../dto' {
  interface DTOs extends DuAnDTOs {}
}
