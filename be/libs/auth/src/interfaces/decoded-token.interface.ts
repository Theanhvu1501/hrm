export interface DecodedToken {
  sub: string; // User ID
  email: string;
  tenantId: string; // Current tenant
  vaiTro?: string;        // optional: token Identity không có
  permissions?: string[]; // optional: token Identity không có
  // SSO claims từ identity-service (phase 3+)
  apps?: string[];                     // appId các tenant đã bật
  membershipRole?: 'admin' | 'member'; // vai trò trong identity
  iat: number;
  exp: number;
}

export interface UserPayload {
  id: string;
  email: string;
  tenantId: string;
  vaiTro?: string;
  permissions?: string[];
  // SSO claims forwarded from identity-service
  apps?: string[];
  membershipRole?: 'admin' | 'member';
}

// Temp token payload for 2-step login (no tenantId)
export interface TempTokenPayload {
  id: string;
  email: string;
}

export interface DecodedTempToken {
  sub: string; // User ID
  email: string;
  type: 'temp';
  iat: number;
  exp: number;
}
