import { BaseEvents } from "@/common";
import { QuyChuan } from "@/types";
import { QuyChaunStats, QuyChaunPaginatedResponse } from "@/services/quyChaunService";

export interface FetchPaginatedParams {
  page?: number;
  limit?: number;
  keyword?: string;
  loaiGiaoDich?: string;
}

export interface FetchEvent extends BaseEvents {
  fetchAll: { params: {}; result: QuyChuan[] };
  fetchPaginated: { params: FetchPaginatedParams; result: QuyChaunPaginatedResponse };
  fetchStats: { params: { keyword?: string }; result: QuyChaunStats };
  search: { params: { keyword: string }; result: QuyChuan[] };
  searchPaginated: { params: FetchPaginatedParams; result: QuyChaunPaginatedResponse };
  refresh: { params: {}; result: void };
  changePage: { params: { page: number; pageSize: number }; result: void };
}

declare module "../../quyChaunHandler" {
  interface QuyChaunEvents extends FetchEvent {}
}
