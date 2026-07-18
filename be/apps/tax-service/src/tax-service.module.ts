import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { ServiceClientModule } from '@app/service-client';
import { BangKeMuaVaoModule } from './bang-ke-mua-vao/bang-ke-mua-vao.module';
import { BangKeBanRaModule } from './bang-ke-ban-ra/bang-ke-ban-ra.module';
import { DieuChinhThueModule } from './dieu-chinh-thue/dieu-chinh-thue.module';
import { BaoCaoModule } from './bao-cao/bao-cao.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
    ServiceClientModule.forRoot(),
    BangKeMuaVaoModule,
    BangKeBanRaModule,
    DieuChinhThueModule,
    BaoCaoModule,
  ],
})
export class TaxServiceModule {}
