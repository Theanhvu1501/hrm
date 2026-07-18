import { BaseEvents } from "@/common";

export interface Sub1Event extends BaseEvents {
  helloworld: { params: string; result: boolean };
}

declare module "../../main.handler" {
  interface MainEvents extends Sub1Event {}
}
