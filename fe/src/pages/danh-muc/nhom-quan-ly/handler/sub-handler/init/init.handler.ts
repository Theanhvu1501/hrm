import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhomQuanLyService } from "@/services/nhomQuanLyService";
import "./init.event";

@RegisterHandler("nhom-quan-ly")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    try {
      const result = await nhomQuanLyService.getPaginated({ page: 1, limit: 50 });
      this.setState("data", result.data);
      this.setState("pagination", {
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
      const stats = await nhomQuanLyService.getStats();
      this.setState("stats", stats);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    this.setState("loading", true);
    try {
      const pagination = this.getState("pagination") || { current: 1, pageSize: 10, total: 0 };
      const searchText = this.getState("searchText") || "";
      const result = await nhomQuanLyService.getPaginated({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
      });
      this.setState("data", result.data);
      this.setState("pagination", {
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
      const stats = await nhomQuanLyService.getStats();
      this.setState("stats", stats);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      this.setState("loading", false);
    }
  }
}
