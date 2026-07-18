import { compact, get } from 'lodash';
import { RequestContext } from '../request-context';
import { AppEventService } from './app-event.service';

export const C_HANDLER_SUBCRIBER_KEY = Symbol('c-handler-subcriber');
export const cHandlerKey = new Set<string>();

/**
 * @param dataParams dữ liệu đầu vào theo dạng object, với key data và index của param function
 */
export function CHandlerDeco(action: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const keys = compact([
        action,
        get(RequestContext.getRequest(), 'id'),
      ]).join('_');
      try {
        const result = await originalMethod.apply(this, args);
        AppEventService.notify(keys, 'done_c_handler', result);
        return result;
      } catch (error) {
        AppEventService.notify(keys, 'error_c_handler', error);
        throw error;
      }
    };
    cHandlerKey.add(action);
    Reflect.defineMetadata(
      C_HANDLER_SUBCRIBER_KEY,
      { action },
      descriptor.value,
    );
    return descriptor;
  };
}
