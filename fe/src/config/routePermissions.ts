// Route permission mapping - maps routes to their required permission string
// Used by ProtectedRoute to check if user has access via hasPermission()
export const routePermissions: Record<string, string> = {
  '/': '/tong-quan:xem',

  '/danh-muc/tai-khoan': '/danh-muc/tai-khoan:xem',
  '/danh-muc/doi-tuong': '/danh-muc/doi-tuong:xem',
  '/danh-muc/du-an': '/danh-muc/du-an:xem',
  '/danh-muc/san-pham': '/danh-muc/san-pham:xem',
  '/danh-muc/bo-phan': '/danh-muc/bo-phan:xem',
  '/danh-muc/khoan-muc': '/danh-muc/khoan-muc:xem',
  '/danh-muc/so-du-dau-ky': '/danh-muc/so-du-dau-ky:xem',
  '/danh-muc/ngan-hang': '/danh-muc/ngan-hang:xem',
  '/danh-muc/dong-tien': '/danh-muc/dong-tien:xem',
  '/danh-muc/chu-dau-tu': '/danh-muc/chu-dau-tu:xem',
  '/danh-muc/nhom-khuyen-mai': '/danh-muc/nhom-khuyen-mai:xem',
  '/danh-muc/nhom-quan-ly': '/danh-muc/nhom-quan-ly:xem',
  '/danh-muc/loai-chung-tu': '/danh-muc/loai-chung-tu:xem',
  '/danh-muc/nhom-khoan-muc': '/danh-muc/nhom-khoan-muc:xem',
  '/danh-muc/loai-giao-dich': '/danh-muc/loai-giao-dich:xem',
  '/danh-muc/hop-dong': '/danh-muc/hop-dong:xem',
  '/danh-muc/quy-chuan': '/danh-muc/quy-chuan:xem',
  '/danh-muc/ho-so-chung-tu': '/danh-muc/ho-so-chung-tu:xem',
  '/danh-muc/kho': '/danh-muc/kho:xem',
  '/danh-muc/don-vi-tinh': '/danh-muc/don-vi-tinh:xem',
  '/danh-muc/ly-do-khong-hop-le': '/danh-muc/ly-do-khong-hop-le:xem',
  '/danh-muc/nhom-vat-tu': '/danh-muc/nhom-vat-tu:xem',
  '/danh-muc/hang-hoa-vat-tu': '/danh-muc/hang-hoa-vat-tu:xem',

  '/kho/nhap-kho': '/kho/nhap-kho:xem',
  '/kho/xuat-kho': '/kho/xuat-kho:xem',
  '/kho/chuyen-kho': '/kho/chuyen-kho:xem',

  '/bep-an/dinh-muc-tien-an': '/bep-an/dinh-muc-tien-an:xem',
  '/bep-an/cong-thuc-dinh-luong': '/bep-an/cong-thuc-dinh-luong:xem',
  '/bep-an/diem-danh-an': '/bep-an/diem-danh-an:xem',
  '/bep-an/de-xuat-mua': '/bep-an/de-xuat-mua:xem',
  '/bep-an/kiem-soat-chi-phi': '/bep-an/kiem-soat-chi-phi:xem',

  '/trung-tam-du-lieu/hop-dong': '/trung-tam-du-lieu/hop-dong:xem',
  '/trung-tam-du-lieu/thu-tien-hop-dong': '/trung-tam-du-lieu/thu-tien-hop-dong:xem',
  '/trung-tam-du-lieu/hd-ban-ra': '/trung-tam-du-lieu/hd-ban-ra:xem',

  '/chung-tu/phieu-thu': '/chung-tu/phieu-thu:xem',
  '/chung-tu/phieu-chi': '/chung-tu/phieu-chi:xem',
  '/chung-tu/nhat-ky-chung': '/chung-tu/nhat-ky-chung:xem',

  '/so-quy': '/so-quy:xem',

  '/cong-no/phai-thu': '/cong-no/phai-thu:xem',
  '/cong-no/phai-tra': '/cong-no/phai-tra:xem',

  '/bao-cao/pnl': '/bao-cao/pnl:xem',
  '/bao-cao/so-cai': '/bao-cao/so-cai:xem',
  '/bao-cao/so-chi-tiet-tai-khoan': '/bao-cao/so-chi-tiet-tai-khoan:xem',
  '/bao-cao/bang-can-doi': '/bao-cao/bang-can-doi:xem',
  '/bao-cao/tai-chinh': '/bao-cao/tai-chinh:xem',
  '/bao-cao/hop-dong': '/bao-cao/hop-dong:xem',

  '/thue/bang-ke-mua-vao': '/thue/bang-ke-mua-vao:xem',
  '/thue/bang-ke-ban-ra': '/thue/bang-ke-ban-ra:xem',
  '/thue/tong-hop': '/thue/tong-hop:xem',
  '/thue/bao-cao-tndn': '/thue/bao-cao-tndn:xem',

  '/bieu-mau': '/bieu-mau:xem',
  '/chinh-sach': '/chinh-sach:xem',
  '/huong-dan': '/huong-dan:xem',

  '/cau-hinh/phan-quyen': '/cau-hinh/phan-quyen:xem',
  '/cau-hinh/vai-tro': '/cau-hinh/vai-tro:xem',
  '/cau-hinh/thanh-vien': '/cau-hinh/thanh-vien:xem',
};

export const getRoutePermission = (path: string): string | undefined => {
  if (routePermissions[path]) {
    return routePermissions[path];
  }

  const pathParts = path.split('/').filter(Boolean);
  while (pathParts.length > 0) {
    const parentPath = '/' + pathParts.join('/');
    if (routePermissions[parentPath]) {
      return routePermissions[parentPath];
    }
    pathParts.pop();
  }

  return undefined;
};
