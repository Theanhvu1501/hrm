import { Module } from '@nestjs/common';
import { DoiTuong } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { DoiTuongService } from './doi-tuong.service';
import { DoiTuongController } from './doi-tuong.controller';

@Module({
  imports: [DatabaseModule.forFeature([DoiTuong])],
  controllers: [DoiTuongController],
  providers: [DoiTuongService],
  exports: [DoiTuongService],
})
export class DoiTuongModule {}
