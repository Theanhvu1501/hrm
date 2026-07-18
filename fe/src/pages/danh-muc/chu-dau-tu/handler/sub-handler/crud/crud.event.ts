import { BaseEvents } from "@/common";
import { ChuDauTu } from "@/types";

export interface CrudEvent extends BaseEvents {
  create: { params: { data: Omit<ChuDauTu, 'id'> }; result: ChuDauTu };
  update: { params: { id: string; data: Partial<ChuDauTu> }; result: ChuDauTu };
  remove: { params: { id: string }; result: void };
  search: { params: { keyword: string }; result: void };
  changePage: { params: { page: number; pageSize: number }; result: void };
}

declare module "../../chu-dau-tu.handler" {
  interface ChuDauTuEvents extends CrudEvent {}
}
