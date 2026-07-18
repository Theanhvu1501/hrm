import { Module } from '@nestjs/common';
import { BangKeMuaVao } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { BangKeMuaVaoService } from './bang-ke-mua-vao.service';
import { BangKeMuaVaoController } from './bang-ke-mua-vao.controller';

@Module({
  imports: [DatabaseModule.forFeature([BangKeMuaVao])],
  controllers: [BangKeMuaVaoController],
  providers: [BangKeMuaVaoService],
  exports: [BangKeMuaVaoService],
})
export class BangKeMuaVaoModule {}
