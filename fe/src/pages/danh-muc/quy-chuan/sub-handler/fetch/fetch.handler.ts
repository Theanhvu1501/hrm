import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { quyChauanService, QuyChaunStats, QuyChaunPaginatedResponse } from "@/services/quyChaunService";
import { QuyChuan } from "@/types";
import { message } from "antd";
import "./fetch.event";
import type { FetchPaginatedParams } from "./fetch.event";

const DEFAULT_PAGE_SIZE = 50;

@RegisterHandler("quy-chuan-context")
export class FetchHandler extends CSubHanlder {
  @HandlerDecorator("fetchAll")
  async fetchAll(): Promise<QuyChuan[]> {
    this.setState("loading", true);
    try {
      const data = await quyChauanService.getAll();
      this.setState("quyChaunList", data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi tải dữ liệu";
      message.error(errorMessage);
      this.setState("quyChaunList", []);
      return [];
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("fetchPaginated")
  async fetchPaginated(params: FetchPaginatedParams): Promise<QuyChaunPaginatedResponse> {
    this.setState("loading", true);
    try {
      const result = await quyChauanService.getAllPaginated({
        page: params.page || 1,
        limit: params.limit || DEFAULT_PAGE_SIZE,
        keyword: params.keyword,
        loaiGiaoDich: params.loaiGiaoDich,
      });
      
      this.setState("quyChaunList", result.data);
      this.setState("pagination", result.meta);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi tải dữ liệu";
      message.error(errorMessage);
      this.setState("quyChaunList", []);
      this.setState("pagination", { total: 0, page: 1, limit: DEFAULT_PAGE_SIZE, totalPages: 0 });
      return { data: [], meta: { total: 0, page: 1, limit: DEFAULT_PAGE_SIZE, totalPages: 0 } };
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("fetchStats")
  async fetchStats(params: { keyword?: string }): Promise<QuyChaunStats> {
    try {
      const stats = await quyChauanService.getStats(params.keyword);
      this.setState("stats", stats);
      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi tải thống kê";
      message.error(errorMessage);
      const emptyStats: QuyChaunStats = {
        tongQuyChuan: 0,
        phieuThu: 0,
        phieuChi: 0,
        baoCo: 0,
        baoNo: 0,
      };
      this.setState("stats", emptyStats);
      return emptyStats;
    }
  }

  @HandlerDecorator("search")
  async search(params: { keyword: string }): Promise<QuyChuan[]> {
    this.setState("loading", true);
    this.setState("searchText", params.keyword);
    
    try {
      let data: QuyChuan[];
      if (!params.keyword.trim()) {
        data = await quyChauanService.getAll();
      } else {
        data = await quyChauanService.search(params.keyword);
      }
      this.setState("quyChaunList", data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi tìm kiếm";
      message.error(errorMessage);
      return [];
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("searchPaginated")
  async searchPaginated(params: FetchPaginatedParams): Promise<QuyChaunPaginatedResponse> {
    this.setState("loading", true);
    this.setState("searchText", params.keyword || "");
    
    try {
      const [result, stats] = await Promise.all([
        quyChauanService.getAllPaginated({
          page: params.page || 1,
          limit: params.limit || DEFAULT_PAGE_SIZE,
          keyword: params.keyword,
          loaiGiaoDich: params.loaiGiaoDich,
        }),
        quyChauanService.getStats(params.keyword),
      ]);
      
      this.setState("quyChaunList", result.data);
      this.setState("pagination", result.meta);
      this.setState("stats", stats);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi tìm kiếm";
      message.error(errorMessage);
      this.setState("quyChaunList", []);
      this.setState("pagination", { total: 0, page: 1, limit: DEFAULT_PAGE_SIZE, totalPages: 0 });
      return { data: [], meta: { total: 0, page: 1, limit: DEFAULT_PAGE_SIZE, totalPages: 0 } };
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("changePage")
  async changePage(params: { page: number; pageSize: number }): Promise<void> {
    const searchText = this.getState("searchText") || "";
    const activeTab = this.getState("activeTab") || "all";
    
    await this.executeEvent("searchPaginated", {
      page: params.page,
      limit: params.pageSize,
      keyword: searchText,
      loaiGiaoDich: activeTab === "all" ? undefined : activeTab,
    });
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    this.setState("searchText", "");
    this.setState("activeTab", "all");
    
    await Promise.all([
      this.executeEvent("fetchPaginated", { page: 1, limit: DEFAULT_PAGE_SIZE }),
      this.executeEvent("fetchStats", {}),
    ]);
  }
}
