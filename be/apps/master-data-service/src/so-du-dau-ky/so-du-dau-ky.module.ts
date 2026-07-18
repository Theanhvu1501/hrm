import { Module } from '@nestjs/common';
import { SoDuDauKy } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { SoDuDauKyService } from './so-du-dau-ky.service';
import { SoDuDauKyController } from './so-du-dau-ky.controller';

@Module({
  imports: [DatabaseModule.forFeature([SoDuDauKy])],
  controllers: [SoDuDauKyController],
  providers: [SoDuDauKyService],
  exports: [SoDuDauKyService],
})
export class SoDuDauKyModule {}
