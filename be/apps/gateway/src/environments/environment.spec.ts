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

    it('should map each prefix to correct service port', () => {
      const expectedMappings: Record<string, number> = {
        '/auth': 3001,
        '/master-data': 3002,
        '/voucher': 3003,
        '/cash-book': 3004,
        '/payable': 3005,
        '/reporting': 3006,
        '/config': 3007,
      };

      for (const [prefix, expectedPort] of Object.entries(expectedMappings)) {
        const result = getServiceForPath(prefix);
        expect(result).not.toBeNull();
        expect(result?.service.port).toBe(expectedPort);
      }
    });
  });
});
