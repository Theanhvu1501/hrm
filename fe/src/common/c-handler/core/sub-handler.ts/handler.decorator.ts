/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import { CHanlder } from "../c-handler";

export const HANDLER_SUBSCRIBER_KEY = Symbol("handler-subscriber");
export const handlerKeys = new Set<string>();

export function HandlerDecorator(action: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!descriptor || !descriptor.value) return descriptor;
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const _this = this as CHanlder;
      const { uniqId, data } = args[0] || {};
      if (!_this || !uniqId) return;
      const keys = [action, uniqId].join("_");

      try {
        const result = await originalMethod.apply(this, [data]);
        _this.appEvent.notify(keys, "done_handler", result);
        return result;
      } catch (error) {
        _this.appEvent.notify(keys, "error_handler", error);
        throw error;
      }
    };
    handlerKeys.add(action);
    Reflect.defineMetadata(
      HANDLER_SUBSCRIBER_KEY,
      { action },
      descriptor.value
    );
    return descriptor;
  };
}
