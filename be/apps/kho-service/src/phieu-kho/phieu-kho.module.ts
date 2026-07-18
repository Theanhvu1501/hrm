import { Module } from '@nestjs/common';
import { PhieuKho, PhieuKhoSequence } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { PhieuKhoController } from './phieu-kho.controller';
import { PhieuKhoService } from './phieu-kho.service';
import { PhieuKhoSequenceService } from './phieu-kho-sequence.service';

@Module({
  imports: [DatabaseModule.forFeature([PhieuKho, PhieuKhoSequence])],
  controllers: [PhieuKhoController],
  providers: [PhieuKhoService, PhieuKhoSequenceService],
})
export class PhieuKhoModule {}
