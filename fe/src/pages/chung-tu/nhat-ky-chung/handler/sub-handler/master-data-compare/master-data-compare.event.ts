import { BaseEvents } from "@/common";
import { DanhMuc } from "@/types";

export interface CompareMasterDataPayload {
  danhMuc: DanhMuc;
}

export interface SetPendingSubmitPayload {
  data: Record<string, unknown>;
}

export interface ConfirmUpdatePayload {
  useNewValues: boolean;
}

export interface ConfirmUpdateSelectivePayload {
  selectedUpdates: Record<string, boolean>;
}

export interface ClearFieldChangePayload {
  field: string;
}

export interface MasterDataCompareEvents extends BaseEvents {
  compareMasterData: { params: CompareMasterDataPayload; result: void };
  clearMasterDataChanges: { params: Record<string, never>; result: void };
  clearFieldChange: { params: ClearFieldChangePayload; result: void };
  setPendingSubmitData: { params: SetPendingSubmitPayload; result: void };
  showUpdateConfirm: { params: Record<string, never>; result: void };
  hideUpdateConfirm: { params: Record<string, never>; result: void };
  confirmMasterDataUpdate: { params: ConfirmUpdatePayload; result: void };
  confirmMasterDataUpdateSelective: {
    params: ConfirmUpdateSelectivePayload;
    result: void;
  };
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends MasterDataCompareEvents {}
}
