import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  nhatKyChungService,
  GetEntriesParams,
} from "@/services/nhatKyChungService";
import { taiKhoanService } from "@/services/taiKhoanService";
import { khoanMucService } from "@/services/khoanMucService";
import "./init.event";
import "./init.state";
import { NhatKyChungStates } from "../../nhat-ky-chung.handler";
import { InitEvent } from "./init.event";
import { restoreFilters, saveFilters } from "../../filterPersistence";

const DEFAULT_PAGE_SIZE = 100;
const TAI_KHOAN_LIMIT = 500;
const KHOAN_MUC_LIMIT = 500;

@RegisterHandler("nhat-ky-chung")
export class InitHandler extends CSubHanlder<InitEvent, NhatKyChungStates> {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.initializeDefaultStates();
    // Restore previously-applied filters (persisted before navigating away to
    // edit a voucher) so the filter stays in place when the user comes back.
    restoreFilters(this);
    await Promise.all([
      this.loadEntries({
        ...this.buildQueryParams(),
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
      }),
      this.loadTaiKhoanList(),
      this.loadKhoanMucList(),
      this.executeEvent("loadMasterData", {}),
    ]);
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    // Keep persisted filters in sync — search/date/account/reset all funnel here.
    saveFilters(this);
    const pagination = this.getState("pagination") as
      | { page: number; limit: number }
      | undefined;
    const currentPage = pagination?.page || 1;
    const currentLimit = pagination?.limit || DEFAULT_PAGE_SIZE;
    const statsCollapsed = this.getState("statsCollapsed") as boolean;
    
    const params: GetEntriesParams = {
      ...this.buildQueryParams(),
      page: currentPage,
      limit: currentLimit,
    };

    // Only reload stats if panel is open
    if (statsCollapsed) {
      await this.loadEntries(params);
    } else {
      await Promise.all([
        this.loadEntries(params),
        this.loadStats(),
      ]);
    }
  }

  @HandlerDecorator("loadPage")
  async loadPage(params: { page: number; limit?: number }): Promise<void> {
    const { page, limit = DEFAULT_PAGE_SIZE } = params;
    const queryParams: GetEntriesParams = { 
      ...this.buildQueryParams(),
      page, 
      limit 
    };

    await this.loadEntries(queryParams);
  }

  @HandlerDecorator("loadStats")
  async loadStats(): Promise<void> {
    // Always load fresh stats when called (panel is being opened)
    try {
      const queryParams = this.buildQueryParams();
      const stats = await nhatKyChungService.getStats(queryParams);
      this.setState("stats", {
        tongButToan: stats.tongSo,
        tongThu: stats.tongPhatSinhNo,
        tongChi: stats.tongPhatSinhCo,
        soDu: stats.tongPhatSinhNo - stats.tongPhatSinhCo,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  private buildQueryParams(): GetEntriesParams {
    const searchText = (this.getState("searchText") as string) || "";
    const dateRange = this.getState("dateRange") as
      | [{ format: (f: string) => string }, { format: (f: string) => string }]
      | null;
    const filterLoaiChungTu = this.getState("filterLoaiChungTu") as string | undefined;
    const filterAccount = this.getState("filterAccount") as string | undefined;
    const filterTaiKhoanCo = this.getState("filterTaiKhoanCo") as string | undefined;
    const filterDoiTuong = this.getState("filterDoiTuong") as string | undefined;
    const filterDuAn = this.getState("filterDuAn") as string | undefined;
    const filterBoPhan = this.getState("filterBoPhan") as string | undefined;

    const params: GetEntriesParams = {};

    if (searchText) params.search = searchText;
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.startDate = dateRange[0].format("YYYY-MM-DD");
      params.endDate = dateRange[1].format("YYYY-MM-DD");
    }
    if (filterLoaiChungTu) params.loai = filterLoaiChungTu as GetEntriesParams["loai"];
    if (filterAccount) params.taiKhoanNo = filterAccount;
    if (filterTaiKhoanCo) params.taiKhoanCo = filterTaiKhoanCo;
    if (filterDoiTuong) params.doiTuong = filterDoiTuong;
    if (filterDuAn) params.duAn = filterDuAn;
    if (filterBoPhan) params.boPhan = filterBoPhan;

    return params;
  }

  private async loadEntries(params: GetEntriesParams): Promise<void> {
    this.setState("loading", true);
    try {
      const response = await nhatKyChungService.getEntries(params);
      this.setState("data", response.data);
      this.setState("pagination", response.meta);
    } catch (error) {
      console.error("Error loading entries:", error);
    } finally {
      this.setState("loading", false);
    }
  }

  private async loadTaiKhoanList(): Promise<void> {
    try {
      // Load leaf accounts (accounts without children - lowest level)
      const leafAccounts = await taiKhoanService.getLeafAccounts();
      this.setState(
        "taiKhoanList",
        leafAccounts.map((tk) => ({ 
          ma: tk.ma, 
          ten: tk.ten,
          loai: tk.loai,
          nhom: tk.nhom,
          chiTietTheo: tk.chiTietTheo,
        }))
      );
    } catch (error) {
      console.error("Error loading tai khoan list:", error);
    }
  }

  private async loadKhoanMucList(): Promise<void> {
    try {
      const response = await khoanMucService.getPaginated({ limit: KHOAN_MUC_LIMIT });
      this.setState(
        "khoanMucList",
        response.data.map((km) => ({ 
          id: km.id,
          ma: km.ma, 
          ten: km.ten,
          loai: km.loai,
          nhom: km.nhom,
        }))
      );
    } catch (error) {
      console.error("Error loading khoan muc list:", error);
    }
  }

  private initializeDefaultStates(): void {
    if (!this.hasState("searchText")) {
      this.setState("searchText", "");
    }
    if (!this.hasState("dateRange")) {
      this.setState("dateRange", null);
    }
    if (!this.hasState("filterAccount")) {
      this.setState("filterAccount", undefined);
    }
    if (!this.hasState("filterLoaiChungTu")) {
      this.setState("filterLoaiChungTu", undefined);
    }
    if (!this.hasState("filterDoiTuong")) {
      this.setState("filterDoiTuong", undefined);
    }
    if (!this.hasState("filterDuAn")) {
      this.setState("filterDuAn", undefined);
    }
    if (!this.hasState("filterBoPhan")) {
      this.setState("filterBoPhan", undefined);
    }
    if (!this.hasState("filterTaiKhoanCo")) {
      this.setState("filterTaiKhoanCo", undefined);
    }
    if (!this.hasState("taiKhoanList")) {
      this.setState("taiKhoanList", []);
    }
    if (!this.hasState("khoanMucList")) {
      this.setState("khoanMucList", []);
    }
    if (!this.hasState("activeTab")) {
      this.setState("activeTab", "list");
    }
    if (!this.hasState("statsCollapsed")) {
      this.setState("statsCollapsed", true);
    }
    if (!this.hasState("stats")) {
      this.setState("stats", {
        tongButToan: 0,
        tongThu: 0,
        tongChi: 0,
        soDu: 0,
      });
    }
    // Initialize empty summaries
    if (!this.hasState("summaryByAccount")) {
      this.setState("summaryByAccount", []);
    }
    if (!this.hasState("summaryByTeam")) {
      this.setState("summaryByTeam", []);
    }
    if (!this.hasState("summaryByEmployee")) {
      this.setState("summaryByEmployee", []);
    }
    if (!this.hasState("summaryByProject")) {
      this.setState("summaryByProject", []);
    }
    if (!this.hasState("summaryByChuDauTu")) {
      this.setState("summaryByChuDauTu", []);
    }
    if (!this.hasState("summaryBySanPham")) {
      this.setState("summaryBySanPham", []);
    }
    if (!this.hasState("summaryByDongTien")) {
      this.setState("summaryByDongTien", []);
    }
    // Initialize new summary states
    if (!this.hasState("summaryByNhomQuanLy")) {
      this.setState("summaryByNhomQuanLy", []);
    }
    if (!this.hasState("summaryByNhomKhuyenMai")) {
      this.setState("summaryByNhomKhuyenMai", []);
    }
    if (!this.hasState("summaryLoading")) {
      this.setState("summaryLoading", {});
    }
  }
}
