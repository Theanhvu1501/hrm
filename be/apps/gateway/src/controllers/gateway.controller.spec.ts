import { Test, TestingModule } from '@nestjs/testing';
import { GatewayController } from './gateway.controller';
import { Request, Response } from 'express';
import * as http from 'http';

// Mock http module
jest.mock('http');

describe('GatewayController', () => {
  let controller: GatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayController],
    }).compile();

    controller = module.get<GatewayController>(GatewayController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: backend-migration, Property 5: Gateway Response Passthrough**
   * **Validates: Requirements 3.4**
   *
   * For any response from a target service, the gateway SHALL return the response
   * to the client with the original status code and headers unchanged.
   */
  describe('Property 5: Gateway Response Passthrough', () => {
    it('should return 404 for unknown routes', () => {
      const mockReq = {
        params: { path: ['unknown', 'path'] },
        method: 'GET',
        headers: {},
        pipe: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      controller.forward(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: expect.stringContaining('No service configured'),
        },
      });
    });

    it('should forward Authorization header unchanged', () => {
      const authToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

      const mockProxyReq = {
        on: jest.fn(),
      };

      const mockProxyRes = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        pipe: jest.fn(),
      };

      (http.request as jest.Mock).mockImplementation((options, callback) => {
        // Verify Authorization header is forwarded
        expect(options.headers.authorization).toBe(authToken);

        // Simulate response
        setTimeout(() => callback(mockProxyRes), 0);
        return mockProxyReq;
      });

      const mockReq = {
        params: { path: ['auth', 'login'] },
        method: 'POST',
        headers: {
          authorization: authToken,
          'content-type': 'application/json',
        },
        pipe: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        writeHead: jest.fn(),
      } as unknown as Response;

      controller.forward(mockReq, mockRes);

      expect(http.request).toHaveBeenCalled();
      const callOptions = (http.request as jest.Mock).mock.calls[0][0];
      expect(callOptions.headers.authorization).toBe(authToken);
    });

    it('should return 502 Bad Gateway when service is unavailable', () => {
      const mockProxyReq = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            // Simulate connection error
            setTimeout(() => callback(new Error('ECONNREFUSED')), 0);
          }
          return mockProxyReq;
        }),
      };

      (http.request as jest.Mock).mockReturnValue(mockProxyReq);

      const mockReq = {
        params: { path: ['auth', 'login'] },
        method: 'POST',
        headers: {},
        pipe: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      controller.forward(mockReq, mockRes);

      // Wait for async error callback
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(mockRes.status).toHaveBeenCalledWith(502);
          expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            error: {
              code: 'BAD_GATEWAY',
              message: expect.stringContaining('Service unavailable'),
            },
          });
          resolve();
        }, 10);
      });
    });

    it('should pass through response status code from target service', () => {
      const mockProxyReq = {
        on: jest.fn().mockReturnThis(),
      };

      const mockProxyRes = {
        statusCode: 201,
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
        },
        pipe: jest.fn(),
      };

      (http.request as jest.Mock).mockImplementation((options, callback) => {
        setTimeout(() => callback(mockProxyRes), 0);
        return mockProxyReq;
      });

      const mockReq = {
        params: { path: ['voucher', 'phieu-thu'] },
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        pipe: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        writeHead: jest.fn(),
      } as unknown as Response;

      controller.forward(mockReq, mockRes);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(mockRes.writeHead).toHaveBeenCalledWith(
            201,
            mockProxyRes.headers,
          );
          expect(mockProxyRes.pipe).toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });
  });
});
