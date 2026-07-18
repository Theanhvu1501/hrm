import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from '../services/request-context/request-context.service';

/** Correlation-id header carried between the gateway and every service. */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * First middleware in the chain. Resolves the correlation id (reuses an
 * incoming `x-request-id` — e.g. forwarded by the gateway — or generates a new
 * one), exposes it on the request/response and stores it in the per-request
 * AsyncLocalStorage so logs, the exception filter and the ServiceClient can all
 * tag the same logical request.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId =
      (Array.isArray(incoming) ? incoming[0] : incoming) || uuidv4();

    // Make the id available to: downstream header forwarding (gateway proxy
    // spreads req.headers), legacy code reading req.id, and the response.
    req.headers[REQUEST_ID_HEADER] = requestId;
    (req as Request & { id?: string }).id = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    RequestContext.run({ req, requestId }, () => next());
  }
}
