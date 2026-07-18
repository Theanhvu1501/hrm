import "reflect-metadata";
import { AppEvent } from "../../app-event";
import { CSubHanlder } from "./sub-handler";

export const HANDLER_CONTEXT_KEY = Symbol("handler-context");

export interface HandlerConstructor {
  new (
    appEvent: AppEvent,
    storage: Map<string, unknown>,
    states: Map<string, unknown>
  ): CSubHanlder;
}

class HandlerRegistry {
  private handlers = new Map<string, HandlerConstructor[]>();

  register(context: string, HandlerClass: HandlerConstructor): void {
    if (!this.handlers.has(context)) {
      this.handlers.set(context, []);
    }
    this.handlers.get(context)!.push(HandlerClass);
  }

  getHandlers(context: string): HandlerConstructor[] {
    return this.handlers.get(context) || [];
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const handlerRegistry = new HandlerRegistry();

export function RegisterHandler(context: string) {
  return function <T extends HandlerConstructor>(HandlerClass: T) {
    handlerRegistry.register(context, HandlerClass);

    Reflect.defineMetadata(HANDLER_CONTEXT_KEY, context, HandlerClass);

    return HandlerClass;
  };
}

export function getHandlerContext(
  HandlerClass: HandlerConstructor
): string | undefined {
  return Reflect.getMetadata(HANDLER_CONTEXT_KEY, HandlerClass);
}
