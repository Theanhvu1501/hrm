import { BaseEvents } from "@/common";

export interface TuanEvent extends BaseEvents {
  /** Nạp tuần chỉ định; bỏ trống thì nạp tuần chứa hôm nay. */
  napTuan: { params: { tuanBatDau?: string }; result: void };
  /** Lùi (-1) hoặc tiến (+1) một tuần so với tuần đang xem. */
  doiTuan: { params: { lech: number }; result: void };
  /** Chọn một ngày trong dải tuần để xem 3 ô + chi tiết của ngày đó. */
  chonNgay: { params: { ngay: string }; result: void };
}

declare module "../../chamCongCuaToiHandler" {
  interface ChamCongCuaToiEvents extends TuanEvent {}
}
