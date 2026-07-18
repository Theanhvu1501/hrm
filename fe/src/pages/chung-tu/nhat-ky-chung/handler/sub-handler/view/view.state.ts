import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { NhatKyChung } from "@/types";

export interface ViewStates extends BaseStates {
  viewModalVisible: boolean;
  viewingEntry: NhatKyChung | null;
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungStates extends ViewStates {}
}
