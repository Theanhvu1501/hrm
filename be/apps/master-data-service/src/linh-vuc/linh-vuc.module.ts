import { Module } from '@nestjs/common';
import { LinhVuc, MenuCatalog, TenantAppConfig } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { LinhVucService } from './linh-vuc.service';
import { LinhVucController } from './linh-vuc.controller';

@Module({
  imports: [DatabaseModule.forFeatureRaw([LinhVuc, MenuCatalog]), DatabaseModule.forFeature([TenantAppConfig])],
  controllers: [LinhVucController],
  providers: [LinhVucService],
  exports: [LinhVucService],
})
export class LinhVucModule {}
