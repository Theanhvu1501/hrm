// Tenant info for login response
export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
  // Lĩnh vực (module) công ty được cấp, vd ['KE_TOAN','KHO'].
  modules: string[];
  // Từ điển nhãn của công ty (theo ngành); FE dùng render nhãn động.
  glossary?: Record<string, { label: string; surfaces?: Record<string, string> }>;
  // Ngành công ty (vd 'XAY_DUNG'); FE dùng để 'Lưu thành chuẩn ngành'.
  nganh?: string | null;
}

// User info for auth responses
export interface AuthUserResponse {
  id: string;
  email: string;
  hoTen: string;
  isSuperAdmin?: boolean;
}

// Login response - 2 cases:
// Case 1: User có 1 tenant - trả về accessToken luôn
// Case 2: User có nhiều tenants - trả về tempToken + danh sách tenants
export interface LoginResponse {
  // Case 1: Single tenant - return accessToken directly
  accessToken?: string;
  tenant?: TenantInfo;
  permissions?: string[];

  // Case 2: Multiple tenants - return tempToken + tenants list
  tempToken?: string;
  tenants?: TenantInfo[];

  user: AuthUserResponse;
}

// Response after selecting tenant
export interface SelectTenantResponse {
  accessToken: string;
  tenant: TenantInfo;
  user: AuthUserResponse;
  permissions: string[];
}

export interface AuthResponseDTOs {
  TenantInfo: TenantInfo;
  AuthUserResponse: AuthUserResponse;
  LoginResponse: LoginResponse;
  SelectTenantResponse: SelectTenantResponse;
}

declare module '../dto' {
  interface DTOs extends AuthResponseDTOs {}
}
