import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { ChungTu, DoiTuong, DuAn, BoPhan, SanPham, DongTien } from "@/types";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStats, PhieuSummaryItem, PhieuSummaryType } from "@/services/phieuService";

export interface TaiKhoanItem {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
  chiTietTheo?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InitStates extends BaseStates {
  config: PhieuConfig | null;
  data: ChungTu[];
  loading: boolean;
  taiKhoanList: TaiKhoanItem[];
  stats: PhieuStats;
  pagination: PaginationMeta;
  searchText: string;
  dateRange: [{ format: (f: string) => string }, { format: (f: string) => string }] | null;
  filterDoiTuong: string | undefined;
  filterDuAn: string | undefined;
  filterBoPhan: string | undefined;
  filterTaiKhoanNo: string | undefined;
  filterTaiKhoanCo: string | undefined;
  formModalOpen: boolean;
  editingPhieu: ChungTu | null;
  viewModalPhieu: ChungTu | null;
  importModalOpen: boolean;
  activeTab: string;
  statsCollapsed: boolean;
  doiTuongList: DoiTuong[];
  duAnList: DuAn[];
  boPhanList: BoPhan[];
  sanPhamList: SanPham[];
  dongTienList: DongTien[];
  summaryData: Record<string, PhieuSummaryItem[]>;
  summaryLoading: Record<string, boolean>;
  summaryLoadedTypes: PhieuSummaryType[];
  printTemplate: string | null;
  templateModalOpen: boolean;
}

declare module "../../../phieu.handler" {
  interface PhieuStates extends InitStates {}
}
