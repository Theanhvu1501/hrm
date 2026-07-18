import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { SummaryType } from "@/services/nhatKyChungService";

export interface NhomQuanLySummary {
  nhomQuanLy: string;
  tongThu: number;
  tongChi: number;
  soButToan: number;
}

export interface NhomKhuyenMaiSummary {
  nhomKhuyenMai: string;
  tongThu: number;
  tongChi: number;
  soButToan: number;
}

export type SummaryLoadingState = Partial<Record<SummaryType, boolean>>;

export interface SummaryStates extends BaseStates {
  summaryByNhomQuanLy: NhomQuanLySummary[];
  summaryByNhomKhuyenMai: NhomKhuyenMaiSummary[];
  summaryLoading: SummaryLoadingState;
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungStates extends SummaryStates {}
}
