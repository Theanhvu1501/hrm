import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  kqkdService,
  getDateRange,
  KqkdPeriodType,
  KqkdReport,
} from "@/services/kqkdService";
import "./init.event";
import { KqkdStates } from "../../kqkdHandler";
import { InitEvent } from "./init.event";

@RegisterHandler("kqkd")
export class InitHandler extends CSubHanlder<InitEvent, KqkdStates> {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    const now = new Date();
    const defaultPeriodType: KqkdPeriodType = "thang";

    this.setState("periodType", defaultPeriodType);
    this.setState("selectedDate", now);
    this.setState("dateRange", getDateRange(defaultPeriodType, now));
    this.setState("kqkdData", null);
    this.setState("loading", true);

    try {
      const { startDate, endDate } = getDateRange(defaultPeriodType, now);
      const data = await kqkdService.getData({
        startDate,
        endDate,
        periodType: defaultPeriodType,
      });
      this.setState("kqkdData", data);
    } catch (error) {
      console.error("Error loading KQKD data:", error);
    } finally {
      this.setState("loading", false);
    }
  }
}
