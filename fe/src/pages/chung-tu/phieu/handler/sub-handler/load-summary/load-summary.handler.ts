import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStates } from "../../../phieu.handler";
import { PhieuSummaryType } from "@/services/phieuService";
import { LoadSummaryEvent } from "./load-summary.event";
import "./load-summary.event";
import { buildPhieuQueryParams } from "../../lib/buildPhieuQueryParams";

@RegisterHandler("phieu")
export class LoadSummaryHandler extends CSubHanlder<LoadSummaryEvent, PhieuStates> {
  @HandlerDecorator("loadSummary")
  async loadSummary(params: { type: PhieuSummaryType }): Promise<void> {
    const config = this.getState("config") as PhieuConfig | undefined;
    if (!config) return;
    const loadingMap = (this.getState("summaryLoading") as Record<string, boolean>) || {};
    this.setState("summaryLoading", { ...loadingMap, [params.type]: true });
    try {
      const rows = await config.service.getSummary(params.type, buildPhieuQueryParams((k) => this.getState(k)));
      const map = (this.getState("summaryData") as Record<string, unknown>) || {};
      this.setState("summaryData", { ...map, [params.type]: rows });
      const loaded = (this.getState("summaryLoadedTypes") as PhieuSummaryType[]) || [];
      if (!loaded.includes(params.type)) {
        this.setState("summaryLoadedTypes", [...loaded, params.type]);
      }
    } catch (e) {
      console.error("Error loading summary:", e);
    } finally {
      const m = (this.getState("summaryLoading") as Record<string, boolean>) || {};
      this.setState("summaryLoading", { ...m, [params.type]: false });
    }
  }
}
