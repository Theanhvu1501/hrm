import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { quyChauanService } from "@/services/quyChaunService";
import { loaiChungTuService } from "@/services/loaiChungTuService";
import { loaiGiaoDichService } from "@/services/loaiGiaoDichService";
import { hoSoChungTuService } from "@/services/hoSoChungTuService";
import { message } from "antd";
import "./init.event";

const DEFAULT_PAGE_SIZE = 50;

@RegisterHandler("quy-chuan-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    // Initialize default states
    this.setState("loading", true);
    this.setState("quyChaunList", []);
    this.setState("stats", null);
    this.setState("searchText", "");
    this.setState("activeTab", "all");
    this.setState("modalVisible", false);
    this.setState("editingRecord", null);
    this.setState("formLoading", false);
    this.setState("loaiChungTuList", []);
    this.setState("loaiGiaoDichList", []);
    this.setState("hoSoChungTuList", []);
    this.setState("pagination", {
      total: 0,
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      totalPages: 0
    });

    try {
      // Fetch initial data with pagination
      const [paginatedResult, stats, loaiChungTuList, loaiGiaoDichList, hoSoList] = await Promise.all([
        quyChauanService.getAllPaginated({ page: 1, limit: DEFAULT_PAGE_SIZE }),
        quyChauanService.getStats(),
        loaiChungTuService.getAll(),
        loaiGiaoDichService.getAll(),
        hoSoChungTuService.getAll(),
      ]);

      this.setState("quyChaunList", paginatedResult.data);
      this.setState("pagination", paginatedResult.meta);
      this.setState("stats", stats);
      this.setState("loaiChungTuList", loaiChungTuList);
      this.setState("loaiGiaoDichList", loaiGiaoDichList);
      this.setState("hoSoChungTuList", hoSoList);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi tải dữ liệu";
      message.error(errorMessage);
      this.setState("quyChaunList", []);
      this.setState("stats", null);
      this.setState("pagination", {
        total: 0,
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        totalPages: 0
      });
    } finally {
      this.setState("loading", false);
    }
  }
}
