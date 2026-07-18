import { BaseEvents, EventName, EventPayload } from "../../types";
import { ICHanlder } from "../c-handler";

export interface CNotifyAction extends ICHanlder {}

export class CNotifyAction<TEvents extends BaseEvents = BaseEvents> {
  notify(action: string, data?: unknown): void {
    this.appEvent.notify(action, data);
  }

  notifyEvent<K extends EventName<TEvents>>(
    eventName: K,
    payload: EventPayload<TEvents, K>
  ): void {
    this.appEvent.notify(eventName as string, payload);
  }
}
