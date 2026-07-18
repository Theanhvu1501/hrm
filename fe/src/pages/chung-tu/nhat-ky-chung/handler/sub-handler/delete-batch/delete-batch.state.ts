import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

export interface DeleteBatchStates extends BaseStates {
  // ID các bút toán đang được tích chọn (theo trang hiện tại)
  selectedEntryIds: string[];
  // Đang gọi xóa hàng loạt
  deletingBatch: boolean;
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungStates extends DeleteBatchStates {}
}
