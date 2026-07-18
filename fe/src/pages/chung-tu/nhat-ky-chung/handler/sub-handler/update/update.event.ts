import { BaseEvents } from "@/common";
import { NhatKyChung } from "@/types";
import { UpdateEntryDto } from "@/services/nhatKyChungService";

export interface UpdateEvent extends BaseEvents {
  openEditModal: { params: { entry: NhatKyChung }; result: void };
  updateEntry: { params: { id: string; data: UpdateEntryDto }; result: void };
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends UpdateEvent {}
}
