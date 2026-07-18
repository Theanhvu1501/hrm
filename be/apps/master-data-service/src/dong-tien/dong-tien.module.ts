import { Module } from '@nestjs/common';
import { DongTien } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { DongTienService } from './dong-tien.service';
import { DongTienController } from './dong-tien.controller';

@Module({
  imports: [DatabaseModule.forFeature([DongTien])],
  controllers: [DongTienController],
  providers: [DongTienService],
  exports: [DongTienService],
})
export class DongTienModule {}
