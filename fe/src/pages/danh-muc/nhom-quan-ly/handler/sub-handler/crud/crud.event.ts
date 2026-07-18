import { BaseEvents } from "@/common";
import { NhomQuanLy } from "@/types";

export interface CrudEvent extends BaseEvents {
  create: { params: { data: Omit<NhomQuanLy, 'id'> }; result: NhomQuanLy };
  update: { params: { id: string; data: Partial<NhomQuanLy> }; result: NhomQuanLy };
  remove: { params: { id: string }; result: void };
  search: { params: { keyword: string }; result: void };
  changePage: { params: { page: number; pageSize: number }; result: void };
}

declare module "../../nhom-quan-ly.handler" {
  interface NhomQuanLyEvents extends CrudEvent {}
}
