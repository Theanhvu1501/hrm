import { Module } from '@nestjs/common';
import { ChuDauTu } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { ChuDauTuService } from './chu-dau-tu.service';
import { ChuDauTuController } from './chu-dau-tu.controller';

@Module({
  imports: [DatabaseModule.forFeature([ChuDauTu])],
  controllers: [ChuDauTuController],
  providers: [ChuDauTuService],
  exports: [ChuDauTuService],
})
export class ChuDauTuModule {}
