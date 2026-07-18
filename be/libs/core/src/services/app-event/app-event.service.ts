import { Injectable } from '@nestjs/common';
import { map, Observable, Subject } from 'rxjs';

const DEFAULT_CONTEXT_EVENT = 'REQUEST';

@Injectable()
export class AppEventService {
  private static events = new Map<string, Map<string, Subject<unknown>>>();

  // Mặc định contextEvent là REQUEST
  static register(name: string): Observable<unknown>;
  static register(contextEvent: string, nameEvent: string): Observable<unknown>;
  static register(arg1: string, arg2?: string): Observable<unknown> {
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

  static unregister(name: string): void;
  static unregister(contextEvent: string, nameEvent: string): void;
  static unregister(contextEvent: string, nameEvent: string): void;
  static unregister(arg1: string, arg2?: string) {
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

  static notify(name: string, v: unknown): void;
  static notify(contextEvent: string, name: string, v: unknown): void;
  static notify(...args: [string, string, unknown] | [string, unknown]) {
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
