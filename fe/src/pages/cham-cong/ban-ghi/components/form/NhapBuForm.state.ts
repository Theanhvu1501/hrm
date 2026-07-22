import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

export interface FormStates extends BaseStates {
  formVisible: boolean;
  saving: boolean;
}

declare module "../../banGhiHandler" {
  interface BanGhiStates extends FormStates {}
}
