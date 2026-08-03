import { BaseEvents } from "@/common";

export interface CapNhatEvent extends BaseEvents {
  capNhatDong: {
    params: { id: string; theoLoai?: Record<string, number>; gioNghiBu?: number };
    result: void;
  };
}

declare module "../../bangLuongThemGioHandler" {
  interface BangThemGioEvents extends CapNhatEvent {}
}
