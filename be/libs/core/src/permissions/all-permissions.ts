/**
 * Shared permission modules and generator — used by master-data-service (tenant provisioning)
 * and auth-service (lazy provisioning for Portal-created companies).
 */
export const PERMISSION_MODULES = [
  '/tong-quan',
  '/phan-tich/bao-cao-tai-chinh',
  '/phan-tich/ban-hang',
  '/phan-tich/mua-hang',
  '/phan-tich/cong-no',
  '/phan-tich/dong-tien',
  '/phan-tich/ton-kho',
  '/phan-tich/thanh-khoan',
  '/bao-cao/tai-chinh',
  '/bao-cao/so-chi-tiet-tai-khoan',
  '/bao-cao/so-chi-tiet-cong-no',
  '/bao-cao/so-chi-tiet-phat-sinh',
  '/bao-cao/bang-tong-hop',
  '/thue/bang-ke-mua-vao',
  '/thue/bang-ke-ban-ra',
  '/thue/tong-hop',
  '/thue/bao-cao-tndn',
  '/trung-tam-du-lieu/ke-hoach',
  '/trung-tam-du-lieu/du-bao',
  '/chung-tu/nhat-ky-chung',
  '/trung-tam-du-lieu/tai-san',
  '/trung-tam-du-lieu/hang-hoa',
  '/trung-tam-du-lieu/nguyen-lieu',
  '/trung-tam-du-lieu/dung-cu',
  '/trung-tam-du-lieu/hop-dong',
  '/trung-tam-du-lieu/nhan-su',
  '/trung-tam-du-lieu/luong-bhxh',
  '/chung-tu/phieu-thu',
  '/chung-tu/phieu-chi',
  '/chung-tu/phieu-nhap',
  '/chung-tu/phieu-xuat',
  '/chung-tu/phieu-luong',
  '/chung-tu/bang-tinh-luong',
  '/chung-tu/bang-cham-cong',
  '/chung-tu/cham-cong-lam-them',
  '/chung-tu/phan-bo-khau-hao',
  '/chung-tu/phieu-ke-toan',
  '/chung-tu/de-nghi-thanh-toan',
  '/danh-muc/tai-khoan',
  '/danh-muc/doi-tuong',
  '/danh-muc/du-an',
  '/danh-muc/san-pham',
  '/danh-muc/hop-dong',
  '/danh-muc/bo-phan',
  '/danh-muc/khoan-muc',
  '/danh-muc/so-du-dau-ky',
  '/danh-muc/kho',
  '/danh-muc/chu-dau-tu',
  '/danh-muc/nhom-khoan-muc',
  '/danh-muc/ngan-hang',
  '/danh-muc/dong-tien',
  '/danh-muc/nhom-khuyen-mai',
  '/danh-muc/nhom-quan-ly',
  '/danh-muc/loai-chung-tu',
  '/danh-muc/loai-giao-dich',
  '/danh-muc/quy-chuan',
  '/danh-muc/ho-so-chung-tu',
  '/danh-muc/ly-do-khong-hop-le',
  '/bep-an/dinh-muc-tien-an',
  '/bep-an/cong-thuc-dinh-luong',
  '/bep-an/diem-danh-an',
  '/bep-an/de-xuat-mua',
  '/bep-an/kiem-soat-chi-phi',
  '/so-quy',
  '/cong-no/phai-thu',
  '/cong-no/phai-tra',
  '/quy-trinh',
  '/chinh-sach',
  '/bieu-mau',
  '/huong-dan',
  '/cau-hinh/vai-tro',
  '/cau-hinh/phan-quyen',
  '/cau-hinh/thanh-vien',
];

const PERMISSION_ACTIONS = ['xem', 'them', 'sua', 'xoa', 'xuat'];

export function generateAllPermissions(): string[] {
  const permissions: string[] = [];
  for (const mod of PERMISSION_MODULES) {
    for (const action of PERMISSION_ACTIONS) {
      permissions.push(`${mod}:${action}`);
    }
  }
  return permissions;
}
