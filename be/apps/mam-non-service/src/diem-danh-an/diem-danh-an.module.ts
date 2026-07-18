import { Module } from '@nestjs/common';
import { DiemDanhAn } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { DiemDanhAnService } from './diem-danh-an.service';
import { DiemDanhAnController } from './diem-danh-an.controller';

@Module({
  imports: [DatabaseModule.forFeature([DiemDanhAn])],
  controllers: [DiemDanhAnController],
  providers: [DiemDanhAnService],
  exports: [DiemDanhAnService],
})
export class DiemDanhAnModule {}
