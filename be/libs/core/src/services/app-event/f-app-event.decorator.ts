import { AppEventService } from '.';

/**
 * @param dataParams dữ liệu đầu vào theo dạng object, với key data và index của param function
 */
export function FAppEventDeco(
  action: string,
  dataParams: Record<string, number>,
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const data: Record<string, unknown> = {};
      Object.entries(dataParams).forEach(([k, v]) => {
        data[k] = args[v];
      });

      AppEventService.notify(action, 'start_function', { params: data });
      try {
        const result = await originalMethod.apply(this, args);
        AppEventService.notify(action, 'done_function', {
          params: data,
          result,
        });
        return result;
      } catch (error) {
        AppEventService.notify(action, 'error_function', {
          params: data,
          error,
        });
        throw error;
      }
    };
    return descriptor;
  };
}
