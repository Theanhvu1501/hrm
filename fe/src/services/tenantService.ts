import { ServiceBase } from './base/service-base';

export interface TenantAdmin {
  id: string;
  email: string;
  hoTen: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  maSoThue?: string;
  diaChi?: string;
  dienThoai?: string;
  email?: string;
  nguoiDaiDien?: string;
  isActive: boolean;
  modules?: string[];
  nganh?: string;
  admins?: TenantAdmin[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  maSoThue?: string;
  diaChi?: string;
  dienThoai?: string;
  email?: string;
  nguoiDaiDien?: string;
  isActive?: boolean;
  modules?: string[];
  nganh?: string;
  admin?: {
    email: string;
    hoTen: string;
    password?: string;
  };
  adminUserId?: string;
}

export interface UpdateTenantDto {
  name?: string;
  slug?: string;
  maSoThue?: string;
  diaChi?: string;
  dienThoai?: string;
  email?: string;
  nguoiDaiDien?: string;
  isActive?: boolean;
  modules?: string[];
  nganh?: string;
}

export interface UserOption {
  id: string;
  email: string;
  hoTen: string;
}

export interface CreateTenantResponse {
  tenant: Tenant;
  admin?: TenantAdmin;
}

export interface TenantMember {
  id: string;
  email: string;
  hoTen: string;
  role: string;
  isActive: boolean;
  membershipId: string;
}

export interface AddMemberDto {
  userId?: string;
  email?: string;
  hoTen?: string;
  password?: string;
  role: string;
}

export interface UpdateMemberDto {
  role?: string;
  isActive?: boolean;
}

export interface UpdateMemberProfileDto {
  hoTen?: string;
  email?: string;
}

class TenantService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/tenants' });
  }

  async getAll(): Promise<Tenant[]> {
    const response = await this.get<Tenant[]>({});
    return response.map(this.transformTenant);
  }

  async getById(id: string): Promise<Tenant> {
    const response = await this.get<Tenant>({ endpoint: `/${id}` });
    return this.transformTenant(response);
  }

  async create(data: CreateTenantDto): Promise<CreateTenantResponse> {
    const response = await this.post<{ tenant: Record<string, unknown>; admin?: Record<string, unknown> }>(data, {});
    return {
      tenant: this.transformTenant(response.tenant),
      admin: response.admin ? {
        id: (response.admin._id as string) || (response.admin.id as string),
        email: response.admin.email as string,
        hoTen: response.admin.hoTen as string,
      } : undefined,
    };
  }

  async update(id: string, data: UpdateTenantDto): Promise<Tenant> {
    const response = await this.put<Tenant>(data, { endpoint: `/${id}` });
    return this.transformTenant(response);
  }

  async updateGlossary(glossary: import('@/types/tenant').Glossary): Promise<{ glossary: import('@/types/tenant').Glossary }> {
    const res = await this.put<Record<string, unknown>>({ glossary }, { endpoint: '/current/glossary' });
    const saved = res.glossary as import('@/types/tenant').Glossary | undefined;
    if (!saved) throw new Error('Phản hồi cập nhật glossary không hợp lệ');
    return { glossary: saved };
  }

  /** Đọc cấu hình khối dashboard của công ty hiện tại (null = hiển thị tất cả). */
  async getDashboardConfig(): Promise<string[] | null> {
    const res = await this.get<{ dashboardBlocks: string[] | null }>({ endpoint: '/current/dashboard' });
    return res?.dashboardBlocks ?? null;
  }

  /** Lưu danh sách khối dashboard hiển thị (chỉ admin/superAdmin). */
  async updateDashboardConfig(blocks: string[]): Promise<string[]> {
    const res = await this.put<{ dashboardBlocks: string[] }>(
      { dashboardBlocks: blocks },
      { endpoint: '/current/dashboard' },
    );
    return res?.dashboardBlocks ?? blocks;
  }

  async deleteTenant(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  async getAllUsers(): Promise<UserOption[]> {
    const response = await this.get<Array<Record<string, unknown>>>({ endpoint: '/users' });
    return response.map((u) => ({
      id: (u._id as string) || (u.id as string),
      email: u.email as string,
      hoTen: u.hoTen as string,
    }));
  }

  async getMembers(tenantId: string): Promise<TenantMember[]> {
    const response = await this.get<Array<Record<string, unknown>>>({ endpoint: `/${tenantId}/members` });
    return response.map((m) => ({
      id: (m._id as string) || (m.id as string),
      email: m.email as string,
      hoTen: m.hoTen as string,
      role: m.role as string,
      isActive: m.isActive as boolean,
      membershipId: m.membershipId as string,
    }));
  }

  async addMember(tenantId: string, data: AddMemberDto): Promise<{ user: { id: string; email: string; hoTen: string }; role: string; isNew: boolean }> {
    return this.post(data, { endpoint: `/${tenantId}/members` });
  }

  async updateMember(tenantId: string, userId: string, data: UpdateMemberDto): Promise<void> {
    await this.put(data, { endpoint: `/${tenantId}/members/${userId}` });
  }

  async updateMemberProfile(
    tenantId: string,
    userId: string,
    data: UpdateMemberProfileDto,
  ): Promise<{ id: string; email: string; hoTen: string }> {
    return this.put(data, { endpoint: `/${tenantId}/members/${userId}/profile` });
  }

  async resetMemberPassword(
    tenantId: string,
    userId: string,
  ): Promise<{ defaultPassword: string }> {
    return this.post({}, { endpoint: `/${tenantId}/members/${userId}/reset-password` });
  }

  async removeMember(tenantId: string, userId: string): Promise<void> {
    await super.delete({ endpoint: `/${tenantId}/members/${userId}` });
  }

  private transformTenant(tenant: Record<string, unknown>): Tenant {
    const admins = tenant.admins as Array<Record<string, unknown>> | undefined;
    return {
      id: (tenant._id as string) || (tenant.id as string),
      name: tenant.name as string,
      slug: tenant.slug as string,
      maSoThue: tenant.maSoThue as string | undefined,
      diaChi: tenant.diaChi as string | undefined,
      dienThoai: tenant.dienThoai as string | undefined,
      email: tenant.email as string | undefined,
      nguoiDaiDien: tenant.nguoiDaiDien as string | undefined,
      isActive: tenant.isActive as boolean,
      modules: tenant.modules as string[] | undefined,
      nganh: tenant.nganh as string | undefined,
      admins: admins?.map((a) => ({
        id: (a._id as string) || (a.id as string),
        email: a.email as string,
        hoTen: a.hoTen as string,
      })),
      createdAt: tenant.createdAt as string,
      updatedAt: tenant.updatedAt as string,
    };
  }
}

export const tenantService = new TenantService();
