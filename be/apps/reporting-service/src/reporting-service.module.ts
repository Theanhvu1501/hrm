import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { ServiceClientModule } from '@app/service-client';
import { SoCaiModule } from './so-cai/so-cai.module';
import { SoChiTietModule } from './so-chi-tiet/so-chi-tiet.module';
import { BaoCaoModule } from './bao-cao/bao-cao.module';
import { CongNoTongHopModule } from './cong-no-tong-hop/cong-no-tong-hop.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
    ServiceClientModule.forRoot(),
    SoCaiModule,
    SoChiTietModule,
    BaoCaoModule,
    CongNoTongHopModule,
  ],
})
export class ReportingServiceModule {}
