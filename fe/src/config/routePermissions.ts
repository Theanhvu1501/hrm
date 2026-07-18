// Route permission mapping - maps routes to their required permission string
// Used by ProtectedRoute to check if user has access via hasPermission()
export const routePermissions: Record<string, string> = {
  '/cau-hinh/phan-quyen': '/cau-hinh/phan-quyen:xem',
  '/cau-hinh/vai-tro': '/cau-hinh/vai-tro:xem',
  '/cau-hinh/thanh-vien': '/cau-hinh/thanh-vien:xem',
  '/nhan-su/ho-so-nhan-vien': '/nhan-su/ho-so-nhan-vien:xem',
  '/nhan-su/hop-dong-lao-dong': '/nhan-su/hop-dong-lao-dong:xem',
  '/nhan-su/qua-trinh-cong-tac': '/nhan-su/qua-trinh-cong-tac:xem',
  '/nhan-su/thoi-viec': '/nhan-su/thoi-viec:xem',
  '/cham-cong/ca-lam-viec': '/cham-cong/ca-lam-viec:xem',
  '/cham-cong/dia-diem': '/cham-cong/dia-diem:xem',
  '/cham-cong/don-tu': '/cham-cong/don-tu:xem',
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
