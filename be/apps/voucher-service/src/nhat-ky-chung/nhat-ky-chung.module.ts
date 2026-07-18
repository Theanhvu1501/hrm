import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChungTu, VoucherSequence } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { NhatKyChungService } from './nhat-ky-chung.service';
import { NhatKyChungController } from './nhat-ky-chung.controller';
import { VoucherNumberService, FieldRulesValidationService, LoaiResolverModule } from '../shared';

@Module({
  imports: [ConfigModule, DatabaseModule.forFeature([ChungTu, VoucherSequence]), TenantModule, LoaiResolverModule],
  controllers: [NhatKyChungController],
  providers: [NhatKyChungService, VoucherNumberService, FieldRulesValidationService],
  exports: [NhatKyChungService],
})
export class NhatKyChungModule {}
