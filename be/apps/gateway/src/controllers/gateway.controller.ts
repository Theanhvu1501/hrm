import { All, Controller, Logger, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as http from 'http';
import { RequestContext } from '@app/core';
import { getServiceForPath } from '../environments/environment';

@Controller('/')
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  @All('*path')
  forward(@Req() req: Request, @Res() res: Response) {
    const paths = req.params.path as unknown as string[];
    const fullPath = '/' + (paths?.join('/') ?? '');

    // Get service configuration for this path
    const routeInfo = getServiceForPath(fullPath);

    if (!routeInfo) {
      this.logger.warn(`No route found for path: ${fullPath}`);
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Không tìm thấy dịch vụ cho đường dẫn: ${fullPath}`,
        },
        ...(RequestContext.getRequestId() && {
          requestId: RequestContext.getRequestId(),
        }),
      });
      return;
    }

    const { service, targetPath } = routeInfo;

    // Extract headers for forwarding
    const authHeader = req.headers.authorization;
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.headers['x-user-id'];

    // Include query string in the target path
    const queryString = req.url?.includes('?')
      ? req.url.substring(req.url.indexOf('?'))
      : '';
    // Re-encode path segments to avoid ERR_UNESCAPED_CHARACTERS with non-ASCII chars
    const encodedTargetPath = targetPath
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    const fullTargetPath = encodedTargetPath + queryString;

    const options: http.RequestOptions = {
      hostname: service.host,
      port: service.port,
      path: fullTargetPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${service.host}:${service.port}`,
        // Forward Authorization header unchanged
        ...(authHeader ? { authorization: authHeader } : {}),
        // Forward tenant context headers
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        ...(userId ? { 'x-user-id': userId } : {}),
      },
    };

    this.logger.debug(
      `Forwarding ${req.method} ${fullPath}${queryString} -> ${service.host}:${service.port}${fullTargetPath}`,
    );

    const proxyReq = http.request(options, (proxyRes) => {
      // Copy status and headers from target service response
      res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
      // Pipe stream response
      proxyRes.pipe(res, { end: true });
    });

    // Pipe body from client to service
    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (err) => {
      this.logger.error(
        `[Proxy error] ${service.host}:${service.port}${targetPath}`,
        err.message,
      );
      res.status(502).json({
        success: false,
        error: {
          code: 'BAD_GATEWAY',
          message: `Dịch vụ không khả dụng: ${err.message}`,
        },
        ...(RequestContext.getRequestId() && {
          requestId: RequestContext.getRequestId(),
        }),
      });
    });
  }
}
