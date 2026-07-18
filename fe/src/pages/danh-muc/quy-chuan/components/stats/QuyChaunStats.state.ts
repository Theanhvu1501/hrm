import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { QuyChaunStats } from "@/services/quyChaunService";

export interface QuyChaunStatsStates extends BaseStates {
  stats: QuyChaunStats | null;
}

declare module "../../quyChaunHandler" {
  interface QuyChaunStates extends QuyChaunStatsStates {}
}
