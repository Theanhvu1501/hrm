import { Module } from '@nestjs/common';
import { LoaiGiaoDich, LoaiChungTuMaster } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { LoaiResolverService } from './loai-resolver.service';

@Module({
  imports: [
    DatabaseModule.forFeature([LoaiGiaoDich, LoaiChungTuMaster]),
    TenantModule,
  ],
  providers: [LoaiResolverService],
  exports: [LoaiResolverService],
})
export class LoaiResolverModule {}
