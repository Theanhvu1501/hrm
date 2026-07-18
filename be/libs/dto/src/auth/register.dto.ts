// Register DTOs
export interface RegisterRequest {
  email: string;
  password: string;
  hoTen: string;
  vaiTro?: string;
  permissions?: string[];
}

export interface RegisterResponse {
  id: string;
  email: string;
  hoTen: string;
  vaiTro: string;
}

export interface RegisterDTOs {
  RegisterRequest: RegisterRequest;
  RegisterResponse: RegisterResponse;
}

declare module '../dto' {
  interface DTOs extends RegisterDTOs {}
}
