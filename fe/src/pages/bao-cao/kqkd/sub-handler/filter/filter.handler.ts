import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  kqkdService,
  getDateRange,
  KqkdPeriodType,
} from "@/services/kqkdService";
import "./filter.event";
import { KqkdStates } from "../../kqkdHandler";
import { FilterEvent } from "./filter.event";

@RegisterHandler("kqkd")
export class FilterHandler extends CSubHanlder<FilterEvent, KqkdStates> {
  @HandlerDecorator("onFilterChange")
  async onFilterChange(params: {
    periodType?: KqkdPeriodType;
    selectedDate?: Date;
    dateRange?: { startDate: string; endDate: string };
  }): Promise<void> {
    const periodType =
      params.periodType ??
      (this.getState("periodType") as KqkdPeriodType);
    const selectedDate =
      params.selectedDate ??
      (this.getState("selectedDate") as Date);

    this.setState("periodType", periodType);
    this.setState("selectedDate", selectedDate);

    let range: { startDate: string; endDate: string };

    if (periodType === "tuyChon" && params.dateRange) {
      range = params.dateRange;
    } else {
      range = getDateRange(periodType, selectedDate);
    }

    this.setState("dateRange", range);
    this.setState("loading", true);

    try {
      const data = await kqkdService.getData({
        startDate: range.startDate,
        endDate: range.endDate,
        periodType,
      });
      this.setState("kqkdData", data);
    } catch (error) {
      console.error("Error loading KQKD data:", error);
    } finally {
      this.setState("loading", false);
    }
  }
}
