import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { taiKhoanService } from "@/services/taiKhoanService";
import { PhieuQueryParams, PhieuSummaryType } from "@/services/phieuService";
import { phieuTemplateService } from "@/services/phieuTemplateService";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStates } from "../../../phieu.handler";
import { InitEvent } from "./init.event";
import "./init.event";
import "./init.state";
import { buildPhieuQueryParams } from "../../lib/buildPhieuQueryParams";

const DEFAULT_PAGE_SIZE = 50;

@RegisterHandler("phieu")
export class InitHandler extends CSubHanlder<InitEvent, PhieuStates> {
  @HandlerDecorator("init")
  async init(params: { config: PhieuConfig }): Promise<void> {
    this.setState("config", params.config);
    this.initializeDefaultStates();
    await Promise.all([
      this.loadEntries({ page: 1, limit: DEFAULT_PAGE_SIZE }),
      this.loadTaiKhoanList(),
      this.executeEvent("loadMasterData", {}),
      this.executeEvent("loadStats", {}),
      this.executeEvent("loadTemplate", {}),
    ]);
  }

  @HandlerDecorator("loadTemplate")
  async loadTemplate(): Promise<void> {
    const config = this.getState("config") as PhieuConfig | undefined;
    if (!config) return;
    try {
      const tpl = await phieuTemplateService.getByLoai(config.loai);
      this.setState("printTemplate", tpl?.html ?? null);
    } catch (e) {
      console.error("Error loading print template:", e);
    }
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    const pagination = this.getState("pagination") as
      | { page: number; limit: number }
      | undefined;
    const loadedTypes =
      (this.getState("summaryLoadedTypes") as PhieuSummaryType[]) || [];
    await Promise.all([
      this.loadEntries({
        ...this.buildQueryParams(),
        page: pagination?.page || 1,
        limit: pagination?.limit || DEFAULT_PAGE_SIZE,
      }),
      this.executeEvent("loadStats", {}),
      // Reload các tab tổng hợp đã từng mở để chúng đồng bộ sau khi
      // thêm/sửa/xoá/import phiếu (tab chưa mở vẫn lazy-load như cũ).
      ...loadedTypes.map((type) => this.executeEvent("loadSummary", { type })),
    ]);
  }

  @HandlerDecorator("loadPage")
  async loadPage(params: { page: number; limit?: number }): Promise<void> {
    await this.loadEntries({
      ...this.buildQueryParams(),
      page: params.page,
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
    });
  }

  @HandlerDecorator("loadStats")
  async loadStats(): Promise<void> {
    const config = this.getState("config") as PhieuConfig | undefined;
    if (!config) return;
    try {
      const stats = await config.service.getStats(this.buildQueryParams());
      this.setState("stats", stats);
    } catch (e) {
      console.error("Error loading stats:", e);
    }
  }

  buildQueryParams(): PhieuQueryParams {
    return buildPhieuQueryParams((k) => this.getState(k));
  }

  async loadEntries(params: PhieuQueryParams): Promise<void> {
    const config = this.getState("config") as PhieuConfig | undefined;
    if (!config) return;
    this.setState("loading", true);
    try {
      const response = await config.service.getAll(params);
      this.setState("data", response.data);
      this.setState("pagination", response.meta);
    } catch (e) {
      console.error("Error loading entries:", e);
    } finally {
      this.setState("loading", false);
    }
  }

  private async loadTaiKhoanList(): Promise<void> {
    try {
      const leaf = await taiKhoanService.getLeafAccounts();
      this.setState(
        "taiKhoanList",
        leaf.map((tk) => ({
          ma: tk.ma,
          ten: tk.ten,
          loai: tk.loai,
          nhom: tk.nhom,
          chiTietTheo: tk.chiTietTheo,
        }))
      );
    } catch (e) {
      console.error("Error loading tai khoan list:", e);
    }
  }

  private initializeDefaultStates(): void {
    const defaults: Array<[string, unknown]> = [
      ["data", []],
      ["loading", false],
      ["taiKhoanList", []],
      ["stats", { tongSo: 0, tongTien: 0 }],
      ["pagination", { total: 0, page: 1, limit: DEFAULT_PAGE_SIZE, totalPages: 0 }],
      ["searchText", ""],
      ["dateRange", null],
      ["filterDoiTuong", undefined],
      ["filterDuAn", undefined],
      ["filterBoPhan", undefined],
      ["filterTaiKhoanNo", undefined],
      ["filterTaiKhoanCo", undefined],
      ["formModalOpen", false],
      ["editingPhieu", null],
      ["viewModalPhieu", null],
      ["importModalOpen", false],
      ["activeTab", "list"],
      ["statsCollapsed", false],
      ["doiTuongList", []],
      ["duAnList", []],
      ["boPhanList", []],
      ["sanPhamList", []],
      ["dongTienList", []],
      ["summaryData", {}],
      ["summaryLoading", {}],
      ["summaryLoadedTypes", []],
      ["printTemplate", null],
      ["templateModalOpen", false],
    ];
    for (const [k, v] of defaults) {
      if (!this.hasState(k)) this.setState(k, v);
    }
  }
}
