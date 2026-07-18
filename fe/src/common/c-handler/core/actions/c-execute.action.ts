import { v4 } from "uuid";
import { BaseEvents, EventName, EventPayload, EventReusult } from "../../types";
import { ICHanlder } from "../c-handler";

export interface CExecuteAction extends ICHanlder {}

export class CExecuteAction<TEvents extends BaseEvents = BaseEvents> {
  executeEvent<K extends EventName<TEvents>, T = EventPayload<TEvents, K>>(
    eventName: K,
    payload: EventPayload<TEvents, K>
  ): Promise<EventReusult<TEvents, K>> {
    return this.execute<EventReusult<TEvents, K>>(eventName as string, payload);
  }

  execute<T>(eventName: string, payload?: unknown): Promise<T> {
    const uniqId = v4();
    const keys = [eventName as string, uniqId].join("_");
    const res = new Promise<T>((resolve, reject) => {
      this.appEvent.register(keys, "done_handler").subscribe((data) => {
        resolve(data as T);
      });

      this.appEvent.register(keys, "error_handler").subscribe((error) => {
        reject(error);
      });
    });

    this.appEvent.notify(eventName as string, { data: payload, uniqId });
    return res;
  }
}
