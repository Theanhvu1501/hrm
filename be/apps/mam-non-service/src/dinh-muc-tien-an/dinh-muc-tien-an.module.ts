import { Module } from '@nestjs/common';
import { DinhMucTienAn } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { DinhMucTienAnService } from './dinh-muc-tien-an.service';
import { DinhMucTienAnController } from './dinh-muc-tien-an.controller';

@Module({
  imports: [DatabaseModule.forFeature([DinhMucTienAn])],
  controllers: [DinhMucTienAnController],
  providers: [DinhMucTienAnService],
  exports: [DinhMucTienAnService],
})
export class DinhMucTienAnModule {}
