import { Module } from '@nestjs/common';
import { BangKeMuaVao, BangKeBanRa } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { BaoCaoService } from './bao-cao.service';
import { BaoCaoController } from './bao-cao.controller';
import { DieuChinhThueModule } from '../dieu-chinh-thue/dieu-chinh-thue.module';

@Module({
  imports: [
    DatabaseModule.forFeature([BangKeMuaVao, BangKeBanRa]),
    DieuChinhThueModule,
  ],
  controllers: [BaoCaoController],
  providers: [BaoCaoService],
})
export class BaoCaoModule {}
