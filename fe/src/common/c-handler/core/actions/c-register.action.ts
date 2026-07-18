import { Observable } from "rxjs";
import { BaseEvents, EventName, EventPayload } from "../../types";
import { ICHanlder } from "../c-handler";

export interface CRegisterAction extends ICHanlder {}

export class CRegisterAction<TEvents extends BaseEvents = BaseEvents> {
  registerEvent<K extends EventName<TEvents>>(
    eventName: K
  ): Observable<EventPayload<TEvents, K>> {
    return this.appEvent.register(eventName as string) as Observable<
      EventPayload<TEvents, K>
    >;
  }

  register(action: string): Observable<unknown> {
    return this.appEvent.register(action);
  }
}
