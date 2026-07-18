import { OnModuleInit } from '@nestjs/common';
import { RequestContext } from '../request-context';
import { AppEventService } from './app-event.service';
import { C_HANDLER_SUBCRIBER_KEY } from './c-handler.decorator';
import { F_APP_EVENT_SUBCRIBER_KEY } from './f-app-event-subcriber.decorator';

export abstract class IacAppEvent implements OnModuleInit {
  get request() {
    return RequestContext.getRequest();
  }

  onModuleInit() {
    this.assignFAppEvent();
    this.assignCHanlder();
  }

  protected assignCHanlder() {
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(this),
    ).filter(
      (m) => m !== 'constructor' && typeof (this as any)[m] === 'function',
    );

    methods.forEach((methodName) => {
      const meta = Reflect.getMetadata(
        C_HANDLER_SUBCRIBER_KEY,
        this[methodName],
      );
      if (!meta) return;
      const { action } = meta;

      AppEventService.register(action).subscribe((data) => {
        this[methodName](data);
      });
    });
  }

  protected assignFAppEvent() {
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(this),
    ).filter(
      (m) => m !== 'constructor' && typeof (this as any)[m] === 'function',
    );

    methods.forEach((methodName) => {
      const meta = Reflect.getMetadata(
        F_APP_EVENT_SUBCRIBER_KEY,
        this[methodName],
      );
      if (!meta) return;
      const { name: eventName, options, action } = meta;

      AppEventService.register(eventName, action).subscribe((data) => {
        const { params } = data as { params: Record<string, unknown> };
        const subParams: unknown[] = [];
        Object.entries(options).forEach(([k, v]) => {
          const param = params[k];
          subParams[v as number] = param;
        });
        this[methodName](...subParams);
      });
    });
  }
}
