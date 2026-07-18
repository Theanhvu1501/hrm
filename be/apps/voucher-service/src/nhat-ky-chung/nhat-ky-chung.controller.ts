import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  Headers,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { NhatKyChungService } from './nhat-ky-chung.service';
import { FieldRulesValidationService } from '../shared';
import {
  NhatKyChungQueryDto,
  CreateNhatKyChungDto,
  UpdateNhatKyChungDto,
  BatchItemDto,
  DeleteBatchNhatKyChungDto,
  SummaryType,
  SUMMARY_TYPES,
} from './dto';
import {
  JwtGuard,
  RoleGuard,
  Roles,
  CurrentUser,
  type UserPayload,
} from '@app/auth';
import { BadRequestException } from '@nestjs/common';

@Controller('nhat-ky-chung')
@UseGuards(JwtGuard, RoleGuard)
export class NhatKyChungController {
  constructor(
    private readonly nhatKyChungService: NhatKyChungService,
    private readonly fieldRulesValidation: FieldRulesValidationService,
  ) {}

  @Get()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getEntries(@Query() query: NhatKyChungQueryDto) {
    return this.nhatKyChungService.getEntries(query);
  }

  @Get('stats')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getStats(@Query() query: NhatKyChungQueryDto) {
    return this.nhatKyChungService.getStats(query);
  }

  @Get('aggregate-balance')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async aggregateBalance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Headers('authorization') authToken?: string,
  ) {
    let tenantId: string | undefined;
    if (authToken?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.decode(authToken.substring(7)) as { tenantId?: string } | null;
        tenantId = decoded?.tenantId;
      } catch {}
    }
    return this.nhatKyChungService.aggregateBalance(
      new Date(startDate),
      new Date(endDate),
      tenantId,
    );
  }

  @Get('aggregate-balance-by-doi-tuong')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async aggregateBalanceByDoiTuong(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Headers('authorization') authToken?: string,
  ) {
    let tenantId: string | undefined;
    if (authToken?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.decode(authToken.substring(7)) as { tenantId?: string } | null;
        tenantId = decoded?.tenantId;
      } catch {}
    }
    return this.nhatKyChungService.aggregateBalanceByDoiTuong(
      new Date(startDate),
      new Date(endDate),
      tenantId,
    );
  }

  @Get('summary/:type')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getSummary(
    @Param('type') type: string,
    @Query() query: NhatKyChungQueryDto,
  ) {
    if (!SUMMARY_TYPES.includes(type as SummaryType)) {
      throw new BadRequestException(
        `Invalid summary type. Valid types: ${SUMMARY_TYPES.join(', ')}`,
      );
    }
    return this.nhatKyChungService.getSummary(type as SummaryType, query);
  }

  @Get('chi-phi-khong-duoc-tru')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KIEM_SOAT', 'MANAGER')
  async chiPhiKhongDuocTru(
    @Query('nam', ParseIntPipe) nam: number,
    @Headers('authorization') authToken?: string,
  ) {
    let tenantId: string | undefined;
    if (authToken?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.decode(authToken.substring(7)) as { tenantId?: string } | null;
        tenantId = decoded?.tenantId;
      } catch {}
    }
    return this.nhatKyChungService.aggregateNonDeductible(nam, tenantId);
  }

  @Get(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getById(@Param('id') id: string) {
    return this.nhatKyChungService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async create(
    @Body() createDto: CreateNhatKyChungDto,
    @CurrentUser() user: UserPayload,
    @Headers('authorization') authToken?: string,
  ) {
    await this.fieldRulesValidation.validateItems([createDto], authToken);
    return this.nhatKyChungService.create(createDto, user.id);
  }

  @Post('batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async createBatch(
    @Body() items: CreateNhatKyChungDto[],
    @CurrentUser() user: UserPayload,
    @Headers('authorization') authToken?: string,
  ) {
    await this.fieldRulesValidation.validateItems(items, authToken);
    return this.nhatKyChungService.createBatch(items, user.id);
  }

  @Post('import')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async importEntries(
    @Body() items: CreateNhatKyChungDto[],
    @CurrentUser() user: UserPayload,
  ) {
    return this.nhatKyChungService.importEntries(items, user.id);
  }

  @Post('delete-batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async deleteBatch(@Body() dto: DeleteBatchNhatKyChungDto) {
    return this.nhatKyChungService.removeBatch(dto.ids);
  }

  @Patch('batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async updateBatch(
    @Body() body: { soPhieu: string; items: BatchItemDto[] },
    @CurrentUser() user: UserPayload,
    @Headers('authorization') authToken?: string,
  ) {
    await this.fieldRulesValidation.validateItems(body.items, authToken);
    return this.nhatKyChungService.updateBatch(body.soPhieu, body.items, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNhatKyChungDto,
    @Headers('authorization') authToken?: string,
  ) {
    await this.fieldRulesValidation.validateItems([updateDto], authToken);
    return this.nhatKyChungService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async delete(@Param('id') id: string) {
    return this.nhatKyChungService.remove(id);
  }
}
