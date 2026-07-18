import { Module } from '@nestjs/common';
import { DonViTinh } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { DonViTinhService } from './don-vi-tinh.service';
import { DonViTinhController } from './don-vi-tinh.controller';

@Module({
  imports: [DatabaseModule.forFeature([DonViTinh])],
  controllers: [DonViTinhController],
  providers: [DonViTinhService],
  exports: [DonViTinhService],
})
export class DonViTinhModule {}
