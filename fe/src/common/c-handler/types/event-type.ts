export interface BaseEvents {
  [key: string]: {
    params: unknown;
    result?: unknown;
  };
}

export type EventName<T extends BaseEvents = BaseEvents> = keyof T;

export type EventPayload<
  T extends BaseEvents = BaseEvents,
  K extends EventName<T> = EventName<T>
> = T[K]["params"];

export type EventReusult<
  T extends BaseEvents = BaseEvents,
  K extends EventName<T> = EventName<T>
> = T[K]["result"];
