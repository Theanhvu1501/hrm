import { BaseEvents } from "@/common";
import dayjs from "dayjs";

export interface ApplyDrawerFiltersParams {
  searchText: string;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  filterAccount: string | undefined;
  filterLoaiChungTu: string | undefined;
  filterDoiTuong: string | undefined;
  filterDuAn: string | undefined;
  filterBoPhan: string | undefined;
  filterTaiKhoanCo: string | undefined;
}

export interface ApplyDrawerFiltersEvent extends BaseEvents {
  applyDrawerFilters: { params: ApplyDrawerFiltersParams; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends ApplyDrawerFiltersEvent {}
}
