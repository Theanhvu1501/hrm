import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { PhieuKhoModule } from './phieu-kho/phieu-kho.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
    PhieuKhoModule,
  ],
})
export class KhoServiceModule {}
