// This file is kept for backward compatibility
// The getNhatKyChung method is now defined directly in ServiceClient class
// See: be/libs/service-client/src/service-client.ts

export interface NhatKyChungPaginatedResponse {
  data: import('@app/dto').NhatKyChungEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
