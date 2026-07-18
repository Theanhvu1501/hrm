import { Module } from '@nestjs/common';
import { LoaiChungTuMaster } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { LoaiChungTuService } from './loai-chung-tu.service';
import { LoaiChungTuController } from './loai-chung-tu.controller';

@Module({
  imports: [DatabaseModule.forFeature([LoaiChungTuMaster])],
  controllers: [LoaiChungTuController],
  providers: [LoaiChungTuService],
  exports: [LoaiChungTuService],
})
export class LoaiChungTuModule {}
