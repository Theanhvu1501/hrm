import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard, AuthToken } from '@app/auth';
import { PhongBanService } from './phong-ban.service';

@Controller('phong-ban')
export class PhongBanController {
  constructor(private readonly phongBanService: PhongBanService) {}

  @Get()
  @UseGuards(JwtGuard)
  async findAll(@AuthToken() token: string) {
    const data = await this.phongBanService.list(token);
    return { success: true, data };
  }
}
