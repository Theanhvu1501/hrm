// Khớp fe/src/config/modules.ts (KHO_MENU_KEYS hiện tại).
export const KHO_MENU_KEYS: string[] = [
  '/kho',
  '/phan-tich/ton-kho',
  '/chung-tu/phieu-nhap',
  '/chung-tu/phieu-xuat',
  '/danh-muc/kho',
  '/danh-muc/hang-hoa-vat-tu',
  '/danh-muc/don-vi-tinh',
  '/danh-muc/nhom-vat-tu',
  '/trung-tam-du-lieu/hang-hoa',
  '/trung-tam-du-lieu/nguyen-lieu',
];

export const DEFAULT_LINH_VUC_SEED = [
  {
    code: 'KE_TOAN',
    name: 'Kế toán',
    description: 'Báo cáo, chứng từ, sổ sách, công nợ',
    icon: 'AccountBookOutlined',
    color: '#1B3A6B',
    order: 0,
    menuKeys: [] as string[], // mặc định: menu chưa gán → hiển thị ở KE_TOAN (FE)
  },
  {
    code: 'KHO',
    name: 'Kho',
    description: 'Nhập, xuất, chuyển kho và hàng hóa vật tư',
    icon: 'InboxOutlined',
    color: '#C9A227',
    order: 1,
    menuKeys: KHO_MENU_KEYS,
  },
];
