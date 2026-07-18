export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}
