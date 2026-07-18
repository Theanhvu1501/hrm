import * as fc from 'fast-check';
import { getServiceForPath, environment } from './environment';

describe('Gateway Routing', () => {
  /**
   * **Feature: backend-migration, Property 4: Gateway Routing Consistency**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   *
   * For any incoming request with a path prefix, the gateway SHALL route to the correct
   * target service based on the configured route mappings, and the Authorization header
   * SHALL be forwarded unchanged.
   */
  describe('Property 4: Gateway Routing Consistency', () => {
    const routePrefixes = environment.routes.map((r) => r.pathPrefix);

    it('should route to correct service for all configured path prefixes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...routePrefixes),
          fc.array(fc.stringMatching(/^[a-z0-9-]+$/), {
            minLength: 0,
            maxLength: 3,
          }),
          (prefix, pathSegments) => {
            const fullPath =
              prefix +
              (pathSegments.length > 0 ? '/' + pathSegments.join('/') : '');
            const result = getServiceForPath(fullPath);

            // Should find a service for configured prefixes
            expect(result).not.toBeNull();
            expect(result?.service).toBeDefined();
            expect(result?.service.host).toBeDefined();
            expect(result?.service.port).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should correctly strip prefix when configured', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...routePrefixes),
          fc.array(fc.stringMatching(/^[a-z0-9-]+$/), {
            minLength: 1,
            maxLength: 3,
          }),
          (prefix, pathSegments) => {
            const subPath = '/' + pathSegments.join('/');
            const fullPath = prefix + subPath;
            const result = getServiceForPath(fullPath);

            const route = environment.routes.find(
              (r) => r.pathPrefix === prefix,
            );

            if (route?.stripPrefix) {
              // Target path should have prefix stripped
              expect(result?.targetPath).toBe(subPath);
            } else {
              // Target path should keep full path
              expect(result?.targetPath).toBe(fullPath);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return null for unknown path prefixes', () => {
      fc.assert(
        fc.property(
          fc
            .stringMatching(/^\/[a-z]{5,10}$/)
            .filter((p) => !routePrefixes.some((rp) => p.startsWith(rp))),
          (unknownPath) => {
            const result = getServiceForPath(unknownPath);
            expect(result).toBeNull();
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should map each configured prefix to its declared service port', () => {
      // Post-strip reality: only /auth, /config, /tai-lieu remain (see environment.ts routes).
      // Assert against the environment's own service config rather than hardcoding ports,
      // so this stays correct regardless of which env vars are loaded at test time.
      for (const route of environment.routes) {
        const result = getServiceForPath(route.pathPrefix);
        const expectedService = environment.services[route.service];
        expect(result).not.toBeNull();
        expect(expectedService).toBeDefined();
        expect(result?.service.port).toBe(expectedService.port);
        expect(result?.service.host).toBe(expectedService.host);
      }
    });

    it('should only expose the current HRM routes (auth, config, tai-lieu)', () => {
      const prefixes = environment.routes.map((r) => r.pathPrefix).sort();
      expect(prefixes).toEqual(['/auth', '/config', '/tai-lieu']);
    });
  });
});
