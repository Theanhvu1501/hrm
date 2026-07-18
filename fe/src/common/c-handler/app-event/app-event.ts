import { map, Observable, Subject } from "rxjs";

const DEFAULT_CONTEXT_EVENT = "REQUEST";

export class AppEvent {
  private events = new Map<string, Map<string, Subject<unknown>>>();

  register(name: string): Observable<unknown>;
  register(contextEvent: string, nameEvent: string): Observable<unknown>;
  register(arg1: string, arg2?: string): Observable<unknown> {
    let nameEvent = arg1,
      contextEvent = arg1;
    if (!arg2) {
      contextEvent = DEFAULT_CONTEXT_EVENT;
    } else {
      nameEvent = arg2;
    }
    if (!this.events.has(contextEvent))
      this.events.set(contextEvent, new Map<string, Subject<unknown>>());
    const eventsOfCtx = this.events.get(contextEvent) as Map<
      string,
      Subject<unknown>
    >;
    if (!eventsOfCtx.has(nameEvent)) eventsOfCtx.set(nameEvent, new Subject());
    return eventsOfCtx
      .get(nameEvent)
      ?.pipe(map((v) => v)) as Observable<unknown>;
  }

  unregister(name: string): void;
  unregister(contextEvent: string, nameEvent: string): void;
  unregister(contextEvent: string, nameEvent: string): void;
  unregister(arg1: string, arg2?: string) {
    let nameEvent = arg1,
      contextEvent = arg1;
    if (!arg2) {
      contextEvent = DEFAULT_CONTEXT_EVENT;
    } else {
      nameEvent = arg2;
    }
    this.events.get(contextEvent)?.get(nameEvent)?.complete();
    setTimeout(() => this.events.get(contextEvent)?.delete(nameEvent));
  }

  notify(name: string, v: unknown): void;
  notify(contextEvent: string, name: string, v: unknown): void;
  notify(...args: [string, string, unknown] | [string, unknown]) {
    let contextEvent: string;
    let nameEvent: string;
    let value: unknown;

    if (args.length === 2) {
      contextEvent = DEFAULT_CONTEXT_EVENT;
      nameEvent = args[0];
      value = args[1];
    } else {
      contextEvent = args[0];
      nameEvent = args[1];
      value = args[2];
    }

    this.events.get(contextEvent)?.get(nameEvent)?.next(value);
  }
}
