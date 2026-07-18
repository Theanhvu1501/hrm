import { Module } from '@nestjs/common';
import { AppUserRole } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { ServiceClientModule } from '@app/service-client';
import { NguoiDung_Controller } from './nguoi-dung.controller';
import { NguoiDung_Service } from './nguoi-dung.service';

@Module({
  imports: [
    // Functional role entity lives in digital_book (default connection)
    DatabaseModule.forFeature([AppUserRole]),
    TenantModule,
    // IdentityClient for forwarding requests to identity-service
    ServiceClientModule.forRoot(),
  ],
  controllers: [NguoiDung_Controller],
  providers: [NguoiDung_Service],
  exports: [NguoiDung_Service],
})
export class NguoiDung_Module {}
