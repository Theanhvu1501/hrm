import { BaseEvents } from "@/common";
import { QuyChuan } from "@/types";
import { CreateQuyChaunDto, UpdateQuyChaunDto } from "@/services/quyChaunService";

export interface CrudEvent extends BaseEvents {
  create: { params: CreateQuyChaunDto; result: QuyChuan };
  update: { params: { id: string; data: UpdateQuyChaunDto }; result: QuyChuan };
  deleteQuyChuan: { params: { id: string }; result: void };
  openModal: { params: { record?: QuyChuan }; result: void };
  closeModal: { params: {}; result: void };
}

declare module "../../quyChaunHandler" {
  interface QuyChaunEvents extends CrudEvent {}
}
