import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { NhatKyChung } from "@/types";

export interface EditingRowValues {
  [columnKey: string]: unknown;
}

export interface InlineEditStates extends BaseStates {
  // Row edit (click Edit button or double-click)
  editingRowId: string | null;
  editingRowOriginal: NhatKyChung | null;
  editingRowValues: EditingRowValues;
  savingRow: boolean;
  inlineEditError: string | null;
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungStates extends InlineEditStates {}
}
