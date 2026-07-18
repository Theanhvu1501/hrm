// Login DTOs
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginDTOs {
  LoginRequest: LoginRequest;
}

declare module '../dto' {
  interface DTOs extends LoginDTOs {}
}
