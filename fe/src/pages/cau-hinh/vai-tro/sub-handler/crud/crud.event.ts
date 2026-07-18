import { BaseEvents } from "@/common";
import { VaiTroItem } from "../../components/table/VaiTroTable.state";

export interface CrudEvent extends BaseEvents {
  createVaiTro: { params: { ten: string; moTa: string; trangThai: "HOAT_DONG" | "KHOA" }; result: void };
  updateVaiTro: { params: { id: string; data: Partial<VaiTroItem> }; result: void };
  deleteVaiTro: { params: { id: string }; result: void };
  openModal: { params: { record?: VaiTroItem }; result: void };
  closeModal: { params: Record<string, never>; result: void };
}

declare module "../../vaiTroHandler" {
  interface VaiTroEvents extends CrudEvent {}
}
