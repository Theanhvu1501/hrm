import * as fc from 'fast-check';
import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { AppUserRole, TenantAppConfig, PhanQuyen } from '@app/entities';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { JwtService } from '@app/auth';
import { ProvisioningService } from './provisioning/provisioning.service';
import { IdentityClient } from '@app/service-client';

// ─── throwFromServiceError tests (via getMe) ────────────────────────────────

describe('AuthServiceService — throwFromServiceError', () => {
  let service: AuthServiceService;
  let mockIdentityClient: any;

  beforeEach(async () => {
    mockIdentityClient = {
      getMe: jest.fn(),
      getMyTenantsForApp: jest.fn(),
      switchTenant: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServiceService,
        { provide: IdentityClient, useValue: mockIdentityClient },
        {
          provide: `${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`,
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: getRepositoryToken(AppUserRole),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: getRepositoryToken(TenantAppConfig),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: ProvisioningService,
          useValue: { ensure: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<AuthServiceService>(AuthServiceService);
  });

  it('throws ForbiddenException when identity returns FORBIDDEN', async () => {
    mockIdentityClient.getMe.mockResolvedValue({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Không có quyền truy cập' },
    });

    await expect(service.getMe('token', 'uid', 'tid')).rejects.toThrow(ForbiddenException);
  });

  it('throws UnauthorizedException when identity returns UNAUTHORIZED', async () => {
    mockIdentityClient.getMe.mockResolvedValue({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Chưa xác thực' },
    });

    await expect(service.getMe('token', 'uid', 'tid')).rejects.toThrow(UnauthorizedException);
  });

  it('throws InternalServerErrorException when identity returns unknown error code', async () => {
    mockIdentityClient.getMe.mockResolvedValue({
      success: false,
      error: { code: 'INTERNAL', message: 'identity down' },
    });

    await expect(service.getMe('token', 'uid', 'tid')).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('super admin availableTenants role is SUPER_ADMIN (not KIEM_SOAT)', async () => {
    const tenantData = { tenantId: 'tenant-1', tenantName: 'Công ty A', tenantSlug: 'cong-ty-a' };

    mockIdentityClient.getMe.mockResolvedValue({
      success: true,
      data: {
        user: { id: 'super-id', email: 'super@admin.com', isSuperAdmin: true },
        tenant: tenantData,
      },
    });
    mockIdentityClient.getMyTenantsForApp.mockResolvedValue({
      success: true,
      data: [tenantData],
    });

    const result = await service.getMe('token', 'super-id', 'tenant-1');

    expect(result.availableTenants).toHaveLength(1);
    expect(result.availableTenants[0].role).toBe('SUPER_ADMIN');
    expect(result.tenant?.role).toBe('SUPER_ADMIN');
    expect(result.permissions).toEqual(['*']);
  });
});

// ─── Password hashing tests ──────────────────────────────────────────────────

describe('AuthServiceService', () => {
  /**
   * **Feature: backend-migration, Property 8: Password Hashing**
   * **Validates: Requirements 4.6**
   *
   * For any user password stored in the database, it SHALL be hashed using bcrypt,
   * and bcrypt.compare(plainPassword, hashedPassword) SHALL return true for the original password.
   */
  describe('Property 8: Password Hashing', () => {
    it('should hash passwords and verify correctly with bcrypt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 6, maxLength: 50 })
            .filter((s) => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s) && s.length >= 6),
          async (password) => {
            // Hash the password
            const hashedPassword =
              await AuthServiceService.hashPassword(password);

            // Verify it's a bcrypt hash (starts with $2b$ or $2a$)
            expect(hashedPassword).toMatch(/^\$2[ab]\$/);

            // Verify the original password matches
            const isMatch = await AuthServiceService.comparePassword(
              password,
              hashedPassword,
            );
            expect(isMatch).toBe(true);

            // Verify wrong password doesn't match
            const wrongPassword = password + 'wrong';
            const isWrongMatch = await AuthServiceService.comparePassword(
              wrongPassword,
              hashedPassword,
            );
            expect(isWrongMatch).toBe(false);

            return true;
          },
        ),
        { numRuns: 20 }, // Reduced runs due to bcrypt being slow
      );
    });

    it('should produce different hashes for same password (due to salt)', async () => {
      const password = 'testPassword123';

      const hash1 = await AuthServiceService.hashPassword(password);
      const hash2 = await AuthServiceService.hashPassword(password);

      // Hashes should be different due to random salt
      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });

    it('should use salt rounds of 10', async () => {
      const password = 'testPassword123';
      const hash = await AuthServiceService.hashPassword(password);

      // bcrypt hash format: $2b$10$... where 10 is the cost factor
      expect(hash).toMatch(/^\$2[ab]\$10\$/);
    });
  });
});
