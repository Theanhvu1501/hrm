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
    config: {
      host: process.env.SERVICE_CONFIG_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_CONFIG_PORT || '3007', 10),
    },
  } as Record<string, ServiceConfig>,

  // Route mappings
  routes: [
    { pathPrefix: '/auth', service: 'auth', stripPrefix: true },
    { pathPrefix: '/config', service: 'config', stripPrefix: true },
    { pathPrefix: '/master-data', service: 'config', stripPrefix: true },
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
