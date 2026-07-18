import { BaseEvents } from "@/common";
import { HopDong } from "@/types";

export interface CrudEvent extends BaseEvents {
  create: { params: { data: Omit<HopDong, 'id'> }; result: HopDong };
  update: { params: { id: string; data: Partial<HopDong> }; result: HopDong };
  remove: { params: { id: string }; result: void };
  search: { params: { keyword: string }; result: void };
  changePage: { params: { page: number; pageSize: number }; result: void };
}

declare module "../../hop-dong.handler" {
  interface HopDongEvents extends CrudEvent {}
}
