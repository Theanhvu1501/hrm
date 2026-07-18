// Verify Token DTOs
export interface VerifyTokenRequest {
  token: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  vaiTro?: string;
}

export interface VerifyTokenDTOs {
  VerifyTokenRequest: VerifyTokenRequest;
  VerifyTokenResponse: VerifyTokenResponse;
}

declare module '../dto' {
  interface DTOs extends VerifyTokenDTOs {}
}
