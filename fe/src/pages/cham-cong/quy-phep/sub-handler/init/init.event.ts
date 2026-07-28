import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
  // Nạp lại toàn bộ danh sách quỹ (mọi năm, mọi NV) — dùng sau khi thao tác
  // hàng loạt hoặc điều chỉnh tay để bảng phản ánh đúng số dư mới.
  taiLai: { params: Record<string, never>; result: void };
  // Đổi năm mục tiêu cho hai nút thao tác hàng loạt ở toolbar.
  doiNamLoc: { params: { nam: number }; result: void };
}

declare module "../../quyPhepHandler" {
  interface QuyPhepEvents extends InitEvent {}
}
