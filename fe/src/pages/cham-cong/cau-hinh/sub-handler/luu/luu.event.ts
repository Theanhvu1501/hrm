import { BaseEvents } from "@/common";
import { CauHinhChamCong } from "@/services/cauHinhChamCongService";

export interface LuuEvent extends BaseEvents {
  luu: { params: { cauHinh: CauHinhChamCong }; result: void };
}

declare module "../../cauHinhChamCongHandler" {
  interface CauHinhChamCongEvents extends LuuEvent {}
}
