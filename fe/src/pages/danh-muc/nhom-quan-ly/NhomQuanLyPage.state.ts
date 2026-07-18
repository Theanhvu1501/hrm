import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { NhomQuanLy } from "@/types";

export interface NhomQuanLyPageStates extends BaseStates {
  data: NhomQuanLy[];
  loading: boolean;
  searchText: string;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  stats: { total: number };
}

declare module "./handler/nhom-quan-ly.handler" {
  interface NhomQuanLyStates extends NhomQuanLyPageStates {}
}
