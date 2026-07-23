/**
 * Điều hướng cả trang (tải lại), tách khỏi component để test chặn được.
 *
 * jsdom của Vitest 4 KHÔNG cho `vi.spyOn(window.location, 'assign')` — ném
 * `TypeError: Cannot redefine property: assign`. Không có seam này thì nhánh
 * "đăng nhập xong đi đâu" không thể khoá bằng test, mà đó lại là nhánh quyết
 * định người dùng có vào được hay không.
 */
export function diToi(url: string): void {
  window.location.assign(url);
}
