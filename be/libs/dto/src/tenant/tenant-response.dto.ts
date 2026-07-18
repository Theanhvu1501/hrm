export interface TenantResponse {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantDTOs {
  TenantResponse: TenantResponse;
}

declare module '../dto' {
  interface DTOs extends TenantDTOs {}
}
