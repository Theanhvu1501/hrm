import { BaseEvents } from "@/common";
import { NhomKhuyenMai } from "@/types";

export interface CrudEvent extends BaseEvents {
  create: { params: { data: Omit<NhomKhuyenMai, 'id'> }; result: NhomKhuyenMai };
  update: { params: { id: string; data: Partial<NhomKhuyenMai> }; result: NhomKhuyenMai };
  remove: { params: { id: string }; result: void };
  search: { params: { keyword: string }; result: void };
  changePage: { params: { page: number; pageSize: number }; result: void };
}

declare module "../../nhom-khuyen-mai.handler" {
  interface NhomKhuyenMaiEvents extends CrudEvent {}
}
