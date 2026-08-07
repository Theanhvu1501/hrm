// Route permission mapping - maps routes to their required permission string
// Used by ProtectedRoute to check if user has access via hasPermission()
export const routePermissions: Record<string, string> = {
  '/cau-hinh/phan-quyen': '/cau-hinh/phan-quyen:xem',
  '/cau-hinh/vai-tro': '/cau-hinh/vai-tro:xem',
  '/cau-hinh/thanh-vien': '/cau-hinh/thanh-vien:xem',
  '/cau-hinh/cau-hinh-luong': '/luong/cau-hinh:xem',
  '/luong/bang-luong': '/luong/bang-luong:xem',
  // Bảng lương thêm giờ dùng chung quyền với bảng lương chính — cùng nhóm rủi
  // ro (thu nhập thật), và không mở module quyền mới thì không phải chạy
  // ops/grant-quyen-module-moi.ts lúc deploy.
  '/luong/bang-luong-them-gio': '/luong/bang-luong:xem',
  '/luong/quyet-toan-tncn': '/luong/bang-luong:xem',
  '/nhan-su/ho-so-nhan-vien': '/nhan-su/ho-so-nhan-vien:xem',
  // Báo cáo nhân sự dùng CHUNG quyền với hồ sơ nhân viên: nó chỉ tổng hợp lại
  // chính dữ liệu đó, và khai một module quyền mới sẽ bắt phải chạy
  // `ops/grant-quyen-module-moi.ts` lúc deploy — quên là màn hình 403 với tất
  // cả mọi người. Cùng tiền lệ với '/nhan-su/mau-in-hop-dong'. Khi nào báo cáo
  // có endpoint BE riêng thì tách thành '/bao-cao/nhan-su:xem' và nhớ bổ sung
  // vào script grant.
  '/bao-cao/nhan-su': '/nhan-su/ho-so-nhan-vien:xem',
  '/nhan-su/hop-dong-lao-dong': '/nhan-su/hop-dong-lao-dong:xem',
  // Mẫu in dùng CHUNG bộ quyền với hợp đồng — soạn mẫu là cấu hình cách in
  // hợp đồng, không phải một tài nguyên nghiệp vụ riêng. Khai module quyền
  // mới sẽ bắt chạy `ops/grant-quyen-module-moi.ts` lúc deploy, quên là 403.
  '/nhan-su/mau-in-hop-dong': '/nhan-su/hop-dong-lao-dong:xem',
  '/nhan-su/qua-trinh-cong-tac': '/nhan-su/qua-trinh-cong-tac:xem',
  '/nhan-su/thoi-viec': '/nhan-su/thoi-viec:xem',
  '/cham-cong/ca-lam-viec': '/cham-cong/ca-lam-viec:xem',
  '/cham-cong/dia-diem': '/cham-cong/dia-diem:xem',
  '/cham-cong/don-tu': '/cham-cong/don-tu:xem',
  '/cham-cong/bang-cong': '/cham-cong/bang-cong:xem',
  '/cham-cong/ngay-le': '/cham-cong/ngay-le:xem',
  '/cham-cong/quy-phep': '/cham-cong/quy-phep:xem',
  '/cham-cong/quy-gio': '/cham-cong/quy-gio:xem',
  '/cham-cong/thiet-bi': '/cham-cong/thiet-bi:xem',
  '/cham-cong/ban-ghi': '/cham-cong/ban-ghi:xem',
  '/cham-cong/cau-hinh': '/cham-cong/cau-hinh:xem',
  // CỐ Ý KHÔNG khai '/cham-cong/cua-toi' ở đây, và route đó cũng cố ý không
  // bọc `requiredPermission` trong App.tsx: mọi nhân viên đăng nhập đều phải
  // chấm công được ngay ngày đầu tiên đi làm, trước khi HR kịp gán vai trò.
  // BE cũng chỉ đặt JwtGuard cho check-in/check-out/hom-nay (xem
  // ban-ghi-cham-cong.controller.ts) — phạm vi dữ liệu khoá bằng employeeId
  // suy từ token, không bằng quyền. Đừng "bổ sung cho đủ bộ": thêm một dòng
  // ở đây là khoá đường chấm công của cả công ty.
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
