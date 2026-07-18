import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

export interface HeaderStates extends BaseStates {
  loading: boolean;
}

declare module "../../vaiTroHandler" {
  interface VaiTroStates extends HeaderStates {}
}
