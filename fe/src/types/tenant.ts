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
  // Lĩnh vực (module) công ty được cấp, vd ['KE_TOAN','KHO'].
  modules?: string[];
}

export interface GlossaryItem {
  label?: string;
  surfaces?: Record<string, string>;
}

export type Glossary = Record<string, GlossaryItem>;

export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
  // Lĩnh vực (module) công ty được cấp. BE luôn trả; optional để chịu data cũ.
  modules?: string[];
  // Từ điển nhãn của công ty (theo ngành); BE trả trong /me. Optional cho data cũ.
  glossary?: Glossary;
  // Ngành công ty (vd 'XAY_DUNG'); FE dùng để 'Lưu thành chuẩn ngành'.
  nganh?: string | null;
}

export interface UserTenant {
  tenantId: string;
  role: string;
}
