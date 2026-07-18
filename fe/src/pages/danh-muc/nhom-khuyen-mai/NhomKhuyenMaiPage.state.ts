import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { NhomKhuyenMai } from "@/types";

export interface NhomKhuyenMaiPageStates extends BaseStates {
  data: NhomKhuyenMai[];
  loading: boolean;
  searchText: string;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  stats: { total: number };
}

declare module "./handler/nhom-khuyen-mai.handler" {
  interface NhomKhuyenMaiStates extends NhomKhuyenMaiPageStates {}
}
