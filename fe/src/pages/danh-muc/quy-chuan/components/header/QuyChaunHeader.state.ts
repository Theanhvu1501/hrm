import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

export interface QuyChaunHeaderStates extends BaseStates {
  searchText: string;
}

declare module "../../quyChaunHandler" {
  interface QuyChaunStates extends QuyChaunHeaderStates {}
}
