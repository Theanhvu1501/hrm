import { BaseEvents } from "@/common";
import { CauHinhLuong } from "@/services/cauHinhLuongService";

export interface LuuEvent extends BaseEvents {
  luu: { params: { cauHinh: CauHinhLuong }; result: void };
}

declare module "../../cauHinhLuongHandler" {
  interface CauHinhLuongEvents extends LuuEvent {}
}
