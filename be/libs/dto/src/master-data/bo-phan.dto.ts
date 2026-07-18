// Bo Phan DTOs
export interface BoPhanResponse {
  _id: string;
  ma: string;
  ten: string;
  moTa?: string;
  isActive: boolean;
}

export interface CreateBoPhanRequest {
  ma: string;
  ten: string;
  moTa?: string;
}

export interface BoPhanDTOs {
  BoPhanResponse: BoPhanResponse;
  CreateBoPhanRequest: CreateBoPhanRequest;
}

declare module '../dto' {
  interface DTOs extends BoPhanDTOs {}
}
