import { BaseEvents } from "@/common";
import { NhatKyChung } from "@/types";

export interface ViewEvent extends BaseEvents {
  openViewModal: { params: { entry: NhatKyChung }; result: void };
  closeViewModal: { params: Record<string, never>; result: void };
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends ViewEvent {}
}
