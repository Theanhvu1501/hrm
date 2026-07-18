import 'reflect-metadata';
import { applyDecorators, AssignMetadata } from '../../decorators';

export const F_APP_EVENT_SUBCRIBER_KEY = Symbol('f-app-event-subcriber');

export function FAppEventSubcriberDeco(
  name: string,
  action: string,
  options: Record<string, number>,
) {
  return applyDecorators(
    AssignMetadata(F_APP_EVENT_SUBCRIBER_KEY, { name, options, action }),
  );
}
