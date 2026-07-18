import {
  Controller,
  Get,
  Query,
  Headers,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BaoCaoService } from './bao-cao.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

const KE_TOAN_ROLES = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_TONG_HOP',
  'KE_TOAN_QUY',
  'KE_TOAN_CONG_NO',
  'MANAGER',
  'KIEM_SOAT',
];

@Controller()
@UseGuards(JwtGuard, RoleGuard)
export class BaoCaoController {
  constructor(private readonly service: BaoCaoService) {}

  @Get('tong-hop')
  @Roles(...KE_TOAN_ROLES)
  async tongHop(
    @Query('nam', ParseIntPipe) nam: number,
    @Headers('authorization') authToken: string,
    @Query('quy') quy?: string,
  ) {
    const data = await this.service.tongHop(
      nam,
      quy ? parseInt(quy, 10) : undefined,
      authToken,
    );
    return { success: true, data };
  }

  @Get('bao-cao-tndn')
  @Roles(...KE_TOAN_ROLES)
  async baoCaoTNDN(
    @Query('nam', ParseIntPipe) nam: number,
    @Headers('authorization') authToken: string,
  ) {
    const data = await this.service.baoCaoTNDN(nam, authToken);
    return { success: true, data };
  }

  @Get('nghia-vu-chinh-sach')
  @Roles(...KE_TOAN_ROLES)
  async nghiaVuChinhSach(
    @Query('nam', ParseIntPipe) nam: number,
    @Headers('authorization') authToken: string,
  ) {
    const data = await this.service.nghiaVuChinhSach(nam, authToken);
    return { success: true, data };
  }
}
