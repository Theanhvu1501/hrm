import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { NhatKyChung } from "@/types";

export interface CreateStates extends BaseStates {
  formModalVisible: boolean;
  editingEntry: NhatKyChung | null;
  formLoading: boolean;
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungStates extends CreateStates {}
}
