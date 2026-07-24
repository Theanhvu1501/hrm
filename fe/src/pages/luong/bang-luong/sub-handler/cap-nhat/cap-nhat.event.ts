import { BaseEvents } from "@/common";
import { CapNhatDongLuongDto } from "@/services/bangLuongService";

export interface CapNhatEvent extends BaseEvents {
  capNhatDong: { params: { id: string; dto: CapNhatDongLuongDto }; result: void };
}

declare module "../../bangLuongHandler" {
  interface BangLuongEvents extends CapNhatEvent {}
}
