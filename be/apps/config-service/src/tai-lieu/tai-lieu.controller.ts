import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtGuard } from '@app/auth';
import { TaiLieu_Service } from './tai-lieu.service';
import { DocPermService } from './doc-perm.service';
import { CreateFileDto, CreateYoutubeDto } from './dto';

/**
 * Quyền phụ thuộc `category` runtime nên không thể dùng @Permissions tĩnh.
 * JWT không mang permissions → kiểm qua DocPermService (nạp từ phan_quyen).
 */
@Controller('tai-lieu')
@UseGuards(JwtGuard)
export class TaiLieu_Controller {
  constructor(
    private readonly service: TaiLieu_Service,
    private readonly perm: DocPermService,
  ) {}

  @Get()
  async list(@Query('category') category: string, @Req() req: any) {
    await this.perm.assertPerm(req.user, category, 'xem');
    return { success: true, data: await this.service.list(category) };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateFileDto,
    @Req() req: any,
  ) {
    await this.perm.assertPerm(req.user, dto.category, 'them');
    const data = await this.service.createFile(file, dto, {
      tenantId: req.user.tenantId,
      userId: req.user.id,
    });
    return { success: true, data };
  }

  @Post('youtube')
  async youtube(@Body() dto: CreateYoutubeDto, @Req() req: any) {
    await this.perm.assertPerm(req.user, dto.category, 'them');
    const data = await this.service.createYoutube(dto, { userId: req.user.id });
    return { success: true, data };
  }

  @Get(':id/file')
  async file(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { tl, stream } = await this.service.streamFile(
      id,
      req.user.tenantId,
    );
    await this.perm.assertPerm(req.user, tl.category, 'xem');
    const inline =
      tl.mimeType === 'application/pdf' || tl.mimeType?.startsWith('image/');
    res.setHeader('Content-Type', tl.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(
        tl.tenFile || 'file',
      )}"`,
    );
    (stream as any).pipe(res);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const tl = await this.service.findOne(id);
    await this.perm.assertPerm(req.user, tl.category, 'xoa');
    await this.service.remove(id);
    return { success: true };
  }
}
