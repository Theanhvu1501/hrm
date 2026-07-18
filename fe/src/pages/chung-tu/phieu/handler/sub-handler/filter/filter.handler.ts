import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { PhieuStates } from "../../../phieu.handler";
import { FilterEvent } from "./filter.event";
import "./filter.event";

@RegisterHandler("phieu")
export class FilterHandler extends CSubHanlder<FilterEvent, PhieuStates> {
  @HandlerDecorator("setFilter")
  async setFilter(params: { key: string; value: unknown }): Promise<void> {
    this.setState(params.key as keyof PhieuStates & string, params.value);
  }

  @HandlerDecorator("applyFilters")
  async applyFilters(): Promise<void> {
    await this.executeEvent("loadPage", { page: 1 });
  }

  @HandlerDecorator("resetFilters")
  async resetFilters(): Promise<void> {
    this.setState("searchText", "");
    this.setState("dateRange", null);
    this.setState("filterDoiTuong", undefined);
    this.setState("filterDuAn", undefined);
    this.setState("filterBoPhan", undefined);
    this.setState("filterTaiKhoanNo", undefined);
    this.setState("filterTaiKhoanCo", undefined);
    await this.executeEvent("loadPage", { page: 1 });
  }
}
