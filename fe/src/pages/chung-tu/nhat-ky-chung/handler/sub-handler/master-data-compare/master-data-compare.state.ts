import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { MasterDataChanges } from "./master-data-compare.types";

export interface MasterDataCompareStates extends BaseStates {
  masterDataChanges: MasterDataChanges;
  hasChanges: boolean;
  showUpdateConfirmModal: boolean;
  pendingSubmitData: Record<string, unknown> | null;
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungStates extends MasterDataCompareStates {}
}
