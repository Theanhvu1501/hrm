import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

export interface ExampleComponentStates extends BaseStates {
  count: number;
}

declare module "./handler/main.handler" {
  interface MainStates extends ExampleComponentStates {}
}
