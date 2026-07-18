export interface ServiceConfig {
  host: string;
  port: number;
}

export interface RouteConfig {
  pathPrefix: string;
  service: ServiceConfig;
  stripPrefix?: boolean;
}

export const environment = {
  port: parseInt(process.env.PORT || '3000', 10),
  tokenHeaderKey: process.env.TOKEN_HEADER_KEY || 'authorization',
  jwtSecret: process.env.JWT_SECRET,

  // Service configurations
  services: {
    auth: {
      host: process.env.SERVICE_AUTH_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_AUTH_PORT || '3001', 10),
    },
    masterData: {
      host: process.env.SERVICE_MASTER_DATA_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_MASTER_DATA_PORT || '3002', 10),
    },
    voucher: {
      host: process.env.SERVICE_VOUCHER_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_VOUCHER_PORT || '3003', 10),
    },
    cashBook: {
      host: process.env.SERVICE_CASH_BOOK_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_CASH_BOOK_PORT || '3004', 10),
    },
    payable: {
      host: process.env.SERVICE_PAYABLE_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_PAYABLE_PORT || '3005', 10),
    },
    reporting: {
      host: process.env.SERVICE_REPORTING_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_REPORTING_PORT || '3006', 10),
    },
    config: {
      host: process.env.SERVICE_CONFIG_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_CONFIG_PORT || '3007', 10),
    },
    kho: {
      host: process.env.SERVICE_KHO_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_KHO_PORT || '3008', 10),
    },
    tax: {
      host: process.env.SERVICE_TAX_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_TAX_PORT || '3009', 10),
    },
    mamNon: {
      host: process.env.SERVICE_MAM_NON_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_MAM_NON_PORT || '3010', 10),
    },
  } as Record<string, ServiceConfig>,

  // Route mappings
  routes: [
    { pathPrefix: '/auth', service: 'auth', stripPrefix: true },
    { pathPrefix: '/master-data', service: 'masterData', stripPrefix: true },
    { pathPrefix: '/voucher', service: 'voucher', stripPrefix: true },
    { pathPrefix: '/cash-book', service: 'cashBook', stripPrefix: true },
    { pathPrefix: '/payable', service: 'payable', stripPrefix: true },
    { pathPrefix: '/reporting', service: 'reporting', stripPrefix: true },
    { pathPrefix: '/config', service: 'config', stripPrefix: true },
    { pathPrefix: '/kho', service: 'kho', stripPrefix: true },
    { pathPrefix: '/mam-non', service: 'mamNon', stripPrefix: true },
    { pathPrefix: '/tax', service: 'tax', stripPrefix: true },
    { pathPrefix: '/tai-lieu', service: 'config', stripPrefix: false },
  ] as Array<{ pathPrefix: string; service: string; stripPrefix?: boolean }>,
};

/**
 * Get service config for a given path
 */
export function getServiceForPath(
  path: string,
): { service: ServiceConfig; targetPath: string } | null {
  for (const route of environment.routes) {
    if (path.startsWith(route.pathPrefix)) {
      const service = environment.services[route.service];
      if (!service) continue;

      const targetPath = route.stripPrefix
        ? path.substring(route.pathPrefix.length) || '/'
        : path;

      return { service, targetPath };
    }
  }
  return null;
}
