import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';

export interface RequestStore {
  req: Request;
  requestId: string;
}

/**
 * Per-request context backed by AsyncLocalStorage.
 *
 * Stores the Express request together with the correlation id (requestId)
 * generated/propagated by RequestContextMiddleware. The requestId is the
 * single value used to trace one logical request across the gateway and all
 * downstream microservices (see ServiceClient + the Winston log format).
 */
export class RequestContext {
  private static als = new AsyncLocalStorage<RequestStore>();

  static run(store: RequestStore, callback: () => void) {
    RequestContext.als.run(store, callback);
  }

  static getStore(): RequestStore | undefined {
    return RequestContext.als.getStore();
  }

  static getRequest(): Request | undefined {
    return RequestContext.als.getStore()?.req;
  }

  static getRequestId(): string | undefined {
    return RequestContext.als.getStore()?.requestId;
  }
}
