import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

export interface VaiTroItem {
  id: string;
  ten: string;
  moTa: string;
  soNguoiDung: number;
  trangThai: "HOAT_DONG" | "KHOA";
}

export interface TableStates extends BaseStates {
  vaiTroList: VaiTroItem[];
}

declare module "../../vaiTroHandler" {
  interface VaiTroStates extends TableStates {}
}
