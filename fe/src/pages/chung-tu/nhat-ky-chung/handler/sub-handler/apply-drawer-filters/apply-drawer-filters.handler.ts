import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService, GetEntriesParams } from "@/services/nhatKyChungService";
import "./apply-drawer-filters.event";
import { ApplyDrawerFiltersParams } from "./apply-drawer-filters.event";
import { saveFilters } from "../../filterPersistence";

const DEFAULT_PAGE_SIZE = 100;

@RegisterHandler("nhat-ky-chung")
export class ApplyDrawerFiltersHandler extends CSubHanlder {
  @HandlerDecorator("applyDrawerFilters")
  async applyDrawerFilters(params: ApplyDrawerFiltersParams): Promise<void> {
    const {
      searchText,
      dateRange,
      filterAccount,
      filterLoaiChungTu,
      filterDoiTuong,
      filterDuAn,
      filterBoPhan,
      filterTaiKhoanCo,
    } = params;

    // Update all filter states
    this.setState("searchText", searchText || "");
    this.setState("dateRange", dateRange);
    this.setState("filterAccount", filterAccount);
    this.setState("filterLoaiChungTu", filterLoaiChungTu);
    this.setState("filterDoiTuong", filterDoiTuong);
    this.setState("filterDuAn", filterDuAn);
    this.setState("filterBoPhan", filterBoPhan);
    this.setState("filterTaiKhoanCo", filterTaiKhoanCo);

    // Persist so the filter survives navigating away to edit a voucher.
    saveFilters(this);

    const currentLimit =
      (this.getState("pagination") as { limit: number } | undefined)?.limit ||
      DEFAULT_PAGE_SIZE;
    const statsCollapsed = this.getState("statsCollapsed") as boolean;

    // Build query params from all filters
    const queryParams: GetEntriesParams = {
      page: 1,
      limit: currentLimit,
    };

    if (searchText?.trim()) queryParams.search = searchText;
    if (dateRange && dateRange[0] && dateRange[1]) {
      queryParams.startDate = dateRange[0].format("YYYY-MM-DD");
      queryParams.endDate = dateRange[1].format("YYYY-MM-DD");
    }
    if (filterLoaiChungTu) queryParams.loai = filterLoaiChungTu as GetEntriesParams["loai"];
    if (filterAccount) queryParams.taiKhoanNo = filterAccount;
    if (filterTaiKhoanCo) queryParams.taiKhoanCo = filterTaiKhoanCo;
    if (filterDoiTuong) queryParams.doiTuong = filterDoiTuong;
    if (filterDuAn) queryParams.duAn = filterDuAn;
    if (filterBoPhan) queryParams.boPhan = filterBoPhan;

    this.setState("loading", true);
    try {
      if (statsCollapsed) {
        const entriesResponse = await nhatKyChungService.getEntries(queryParams);
        this.setState("data", entriesResponse.data);
        this.setState("pagination", entriesResponse.meta);
      } else {
        const [entriesResponse, statsResponse] = await Promise.all([
          nhatKyChungService.getEntries(queryParams),
          nhatKyChungService.getStats(queryParams),
        ]);
        this.setState("data", entriesResponse.data);
        this.setState("pagination", entriesResponse.meta);
        this.setState("stats", {
          tongButToan: statsResponse.tongSo,
          tongThu: statsResponse.tongPhatSinhNo,
          tongChi: statsResponse.tongPhatSinhCo,
          soDu: statsResponse.tongPhatSinhNo - statsResponse.tongPhatSinhCo,
        });
      }
    } catch (error) {
      console.error("Apply drawer filters error:", error);
    } finally {
      this.setState("loading", false);
    }
  }
}
