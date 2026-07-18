import { BaseEvents } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { DoiTuong, HopDong, TrangThaiHopDong } from "@/types";

export interface HopDongPagination {
  current: number;
  pageSize: number;
  total: number;
}

export interface HopDongStats {
  total: number;
  byTrangThai: Record<TrangThaiHopDong, number>;
}

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
  refresh: { params: Record<string, never>; result: void };
}

export interface InitStates extends BaseStates {
  data: HopDong[];
  loading: boolean;
  pagination: HopDongPagination;
  stats: HopDongStats | null;
  searchKeyword: string;
  doiTuongList: DoiTuong[];
}

declare module "../../hop-dong.handler" {
  interface HopDongEvents extends InitEvent {}
  interface HopDongStates extends InitStates {}
}
