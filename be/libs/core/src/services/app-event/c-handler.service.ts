/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import { compact, get } from 'lodash';
import { RequestContext } from '../request-context';
import { AppEventService } from './app-event.service';

export class CHandler {
  static async execute<T extends unknown, D = unknown>(
    key: string,
    data: D,
  ): Promise<T> {
    const keys = compact([key, get(RequestContext.getRequest(), 'id')]).join(
      '_',
    );
    const res = new Promise<T>((resolve, reject) => {
      AppEventService.register(keys, 'done_c_handler').subscribe((r) => {
        resolve(r as T);
        AppEventService.unregister(keys, 'done_c_handler');
      });
      AppEventService.register(keys, 'error_c_handler').subscribe((r) => {
        reject(r as T);
        AppEventService.unregister(keys, 'error_c_handler');
      });
    });
    AppEventService.notify(key, data);
    return res;
  }
}
