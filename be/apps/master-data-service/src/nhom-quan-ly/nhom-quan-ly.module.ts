import { Module } from '@nestjs/common';
import { NhomQuanLy } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhomQuanLyService } from './nhom-quan-ly.service';
import { NhomQuanLyController } from './nhom-quan-ly.controller';

@Module({
  imports: [DatabaseModule.forFeature([NhomQuanLy])],
  controllers: [NhomQuanLyController],
  providers: [NhomQuanLyService],
  exports: [NhomQuanLyService],
})
export class NhomQuanLyModule {}
