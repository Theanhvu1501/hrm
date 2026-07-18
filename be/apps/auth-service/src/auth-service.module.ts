import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { AppUserRole, TenantAppConfig, PhanQuyen, VaiTro } from '@app/entities';
import { ServiceClientModule } from '@app/service-client';
import { ProvisioningService } from './provisioning/provisioning.service';
import { ProvisioningController } from './provisioning/provisioning.controller';

@Module({
  imports: [
    TenantModule,
    AuthModule,
    DatabaseModule.forRoot(),
    // No forRootIdentity / forFeatureIdentity — auth-service no longer reads identity DB directly.
    DatabaseModule.forFeature([AppUserRole, TenantAppConfig]),
    DatabaseModule.forFeatureRaw([PhanQuyen, VaiTro]),
    ServiceClientModule.forRoot(),
  ],
  controllers: [AuthServiceController, ProvisioningController],
  providers: [AuthServiceService, ProvisioningService],
})
export class AuthServiceModule {}
