import { BaseEvents } from "@/common";
import { NhatKyChung } from "@/types";

// Row edit params
export interface StartEditRowParams {
  rowId: string;
  record: NhatKyChung;
}

export interface UpdateRowValueParams {
  columnKey: string;
  value: unknown;
}

export interface InlineEditEvents extends BaseEvents {
  // Row edit events
  startEditRow: { params: StartEditRowParams; result: void };
  cancelEditRow: { params: Record<string, never>; result: void };
  saveEditRow: { params: Record<string, never>; result: void };
  updateRowValue: { params: UpdateRowValueParams; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends InlineEditEvents {}
}
