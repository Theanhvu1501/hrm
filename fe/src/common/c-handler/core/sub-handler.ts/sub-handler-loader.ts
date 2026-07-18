import { ICHanlder } from "../c-handler";
import { handlerRegistry } from "./handler-registry";

export interface SubHanlderLoader extends ICHanlder {}

export class SubHanlderLoader {
  protected initializeRegisteredHandlers() {
    if (!this.context) return;
    const handlers = handlerRegistry.getHandlers(this.context);
    handlers.forEach((HandlerClass) => {
      const instance = new HandlerClass(this.appEvent, this.storage, this.states);
      this.registeredHandlers.push(instance);
    });
  }
}
