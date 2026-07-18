import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import dayjs from "dayjs";
import "./filter-date.event";

@RegisterHandler("nhat-ky-chung")
export class FilterDateHandler extends CSubHanlder {
  @HandlerDecorator("filterByDate")
  async filterByDate(params: { dates: [dayjs.Dayjs, dayjs.Dayjs] | null }): Promise<void> {
    const { dates } = params;
    this.setState("dateRange", dates);
    // Reset to page 1 when date filter changes
    const pagination = this.getState("pagination") as { page: number; limit: number; total: number; totalPages: number } | undefined;
    if (pagination) {
      this.setState("pagination", { ...pagination, page: 1 });
    }
    this.executeEvent("refresh", {});
  }
}
