import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { hopDongService } from "@/services/hopDongService";
import { doiTuongService } from "@/services/doiTuongService";
import "./init.event";

@RegisterHandler("hop-dong")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    try {
      // Fetch hop-dong list and doi-tuong list concurrently
      const [hopDongResult, doiTuongList, stats] = await Promise.all([
        hopDongService.getPaginated({ page: 1, limit: 50 }),
        doiTuongService.getByLoai("KHACH_HANG"),
        hopDongService.getStats(),
      ]);

      this.setState("data", hopDongResult.data);
      this.setState("pagination", {
        current: hopDongResult.meta.page,
        pageSize: hopDongResult.meta.limit,
        total: hopDongResult.meta.total,
      });
      this.setState("doiTuongList", doiTuongList);
      this.setState("stats", stats);
      this.setState("searchKeyword", "");
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
      const pagination = this.getState("pagination") || { current: 1, pageSize: 50, total: 0 };
      const searchKeyword = this.getState("searchKeyword") || "";

      const [result, stats] = await Promise.all([
        hopDongService.getPaginated({
          page: pagination.current,
          limit: pagination.pageSize,
          search: searchKeyword || undefined,
        }),
        hopDongService.getStats(),
      ]);

      this.setState("data", result.data);
      this.setState("pagination", {
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
      this.setState("stats", stats);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      this.setState("loading", false);
    }
  }
}
