import { ServiceBase, setAuthToken, clearAuthToken } from './base/service-base';
import { NguoiDung, TenantInfo } from '@/types';

function extractPermissionsFromToken(token: string): string[] {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.permissions || [];
  } catch {
    return [];
  }
}

interface LoginRequest {
  email: string;
  password: string;
}

// Step 1 response - either complete login or need tenant selection
interface LoginResponse {
  // Case 1: Single tenant - complete login
  accessToken?: string;
  user: NguoiDung;
  tenant?: TenantInfo;
  permissions?: string[];

  // Case 2: Multiple tenants - need selection
  tempToken?: string;
  tenants?: TenantInfo[];
}

interface SelectTenantRequest {
  tempToken: string;
  tenantId: string;
}

interface SelectTenantResponse {
  accessToken: string;
  user: NguoiDung;
  tenant: TenantInfo;
  permissions?: string[];
}

interface RegisterRequest {
  email: string;
  password: string;
  hoTen: string;
}

interface GetMeResponse {
  user: NguoiDung;
  tenant: TenantInfo;
  availableTenants: TenantInfo[];
  permissions?: string[];
}

class AuthService extends ServiceBase {
  constructor() {
    super({ endpoint: '/auth' });
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>(credentials, { endpoint: '/login' });
    // Only set token if single tenant (complete login)
    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }
    return response;
  }

  async selectTenant(tempToken: string, tenantId: string): Promise<SelectTenantResponse> {
    const response = await this.post<SelectTenantResponse>(
      { tempToken, tenantId } as SelectTenantRequest,
      { endpoint: '/select-tenant' }
    );
    setAuthToken(response.accessToken);
    if (!response.permissions) {
      response.permissions = extractPermissionsFromToken(response.accessToken);
    }
    return response;
  }

  async switchTenant(tenantId: string): Promise<SelectTenantResponse> {
    const response = await this.post<SelectTenantResponse>(
      { tenantId },
      { endpoint: '/switch-tenant' }
    );
    setAuthToken(response.accessToken);
    if (!response.permissions) {
      response.permissions = extractPermissionsFromToken(response.accessToken);
    }
    return response;
  }

  async register(data: RegisterRequest): Promise<NguoiDung> {
    return this.post<NguoiDung>(data, { endpoint: '/register' });
  }

  async getMe(): Promise<GetMeResponse> {
    return this.get<GetMeResponse>({ endpoint: '/me' });
  }

  async logout(): Promise<void> {
    try {
      await this.post<void>({}, { endpoint: '/logout' });
    } finally {
      clearAuthToken();
    }
  }

  async verify(token: string): Promise<NguoiDung> {
    return this.post<NguoiDung>({ token }, { endpoint: '/verify' });
  }

  async getAvailableTenants(): Promise<TenantInfo[]> {
    return this.get<TenantInfo[]>({ endpoint: '/tenants' });
  }
}

export const authService = new AuthService();
