import { Module } from '@nestjs/common';
import { DieuChinhThue } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { DieuChinhThueService } from './dieu-chinh-thue.service';
import { DieuChinhThueController } from './dieu-chinh-thue.controller';

@Module({
  imports: [DatabaseModule.forFeature([DieuChinhThue])],
  controllers: [DieuChinhThueController],
  providers: [DieuChinhThueService],
  exports: [DieuChinhThueService],
})
export class DieuChinhThueModule {}
