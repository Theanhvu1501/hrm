import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LaborContract, ContractCounter, PhieuTemplate, TenantAppConfig, Employee } from '@app/entities';
import { TenantContextService } from '@app/core';
import { CreateHopDongDto, UpdateHopDongDto, UpdateThongTinCongTyDto } from './dto';
import {
  DEFAULT_HOP_DONG_HTML,
  renderHopDongHtml,
  sanitizeHopDongHtml,
  timTokenLaCuaMauIn,
} from './lib/hopDongRender';

const LOAI_MAU_IN_HOP_DONG = 'HOP_DONG_LAO_DONG' as const;

export interface ThongTinCongTy {
  tenCongTy: string | null;
  diaChiCongTy: string | null;
  maSoThue: string | null;
  nguoiDaiDien: string | null;
  chucVuNguoiDaiDien: string | null;
  thanhPhoKy: string | null;
  maHopDongMau: string | null;
}

/**
 * Parse chuỗi ObjectId, ném `NotFoundException` (không phải BSONError 500
 * thô) nếu sai định dạng — review Minor: `id`/`employeeId` sai định dạng
 * trước bản vá này làm `GET /:id/in` sập 500 thay vì 404 sạch sẽ.
 */
async function parseObjectIdOrNotFound(id: string, nhan: string) {
  const { ObjectId } = await import('mongodb');
  if (!ObjectId.isValid(id)) {
    throw new NotFoundException(`${nhan} không hợp lệ: ${id}`);
  }
  return new ObjectId(id);
}

export interface HopDongFilter {
  employeeId?: string;
  trangThai?: string;
  loaiHopDong?: string;
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

@Injectable()
export class HopDong_Service {
  constructor(
    @InjectRepository(LaborContract)
    private readonly repo: Repository<LaborContract>,
    @InjectRepository(ContractCounter)
    private readonly counterRepo: Repository<ContractCounter>,
    @InjectRepository(PhieuTemplate)
    private readonly mauInRepo: Repository<PhieuTemplate>,
    @InjectRepository(TenantAppConfig)
    private readonly congTyRepo: Repository<TenantAppConfig>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Maintains ONE ContractCounter doc per tenant, incrementing `seq` and
   * returning a zero-padded contractNo like HD0001, HD0002, ...
   *
   * Uses an atomic MongoDB findOneAndUpdate($inc) on the raw (non-tenant-proxied,
   * non-ORM-cached) mongo repository so concurrent create() calls for the same
   * tenant can never read-modify-write the same seq value. The tenant-aware
   * repository proxy (see @app/database DatabaseModule) does not intercept
   * findOneAndUpdate, so the explicit `{ tenantId }` filter below is exactly
   * what reaches MongoDB — no reliance on proxy-injected filtering.
   */
  async generateContractNo(tenantId?: string): Promise<string> {
    const mongoCounterRepo = this.counterRepo.manager.getMongoRepository(
      ContractCounter,
    ) as unknown as import('typeorm').MongoRepository<ContractCounter>;

    const updated = await mongoCounterRepo.findOneAndUpdate(
      { tenantId } as any,
      { $inc: { seq: 1 } } as any,
      { upsert: true, returnDocument: 'after' } as any,
    );

    const seq = (updated as any)?.seq;
    return 'HD' + String(seq).padStart(4, '0');
  }

  /**
   * VN labor-law rule: an employee may have at most 2 active
   * (`isActive: true`) `xac_dinh_thoi_han` (fixed-term) contracts. Shared by
   * both create() and update() so the check can never drift between the two
   * entry points — update() must re-run this whenever an edit turns a
   * contract INTO a fixed-term one, otherwise the rule can be bypassed via
   * PUT (create with an allowed type, then edit loaiHopDong afterwards).
   *
   * `excludeId` lets update() exclude the very record being edited from its
   * own count.
   */
  private async assertFixedTermLimitNotExceeded(
    employeeId: string | undefined,
    excludeId?: unknown,
  ): Promise<void> {
    const where: Record<string, any> = {
      employeeId,
      loaiHopDong: 'xac_dinh_thoi_han',
      isActive: true,
    };

    // NOTE: use find(), not repo.count({ where }). On a MongoRepository,
    // count() takes a raw Mongo filter, so passing a `{ where: {...} }`
    // FindManyOptions matches zero documents and the rule silently never
    // fires (caught only in live testing — unit tests mock the repo). find()
    // does honour FindManyOptions.where on Mongo (same as nhan-vien's dedup).
    const docs = await this.repo.find({ where });
    let count: number;
    if (excludeId === undefined) {
      count = docs.length;
    } else {
      // update() excludes the record being edited from its own count.
      const excludeIdStr = String(excludeId);
      count = docs.filter((d: any) => String(d._id ?? d.id) !== excludeIdStr)
        .length;
    }

    if (count >= 2) {
      throw new ConflictException(
        'Nhân viên đã ký 2 HĐ xác định thời hạn, lần này phải ký HĐ không xác định thời hạn',
      );
    }
  }

  async create(dto: CreateHopDongDto): Promise<LaborContract> {
    if (dto.loaiHopDong === 'xac_dinh_thoi_han') {
      await this.assertFixedTermLimitNotExceeded(dto.employeeId);
    }

    const tenantId = this.tenantContext.getCurrentTenantId();
    const contractNo = await this.generateContractNo(tenantId);

    const entity = this.repo.create({
      ...dto,
      contractNo,
      isActive: true,
    } as Partial<LaborContract>);

    return this.repo.save(entity);
  }

  /**
   * Coerces the `isActive` filter value, which may arrive as a real boolean
   * (programmatic callers) or as the STRING "true"/"false" (HTTP query params
   * are never parsed to booleans by Nest's default query pipe). Defaults to
   * `true` when the value is absent, mirroring nhan-vien's fixed behaviour.
   */
  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(filter?: HopDongFilter): Promise<LaborContract[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.trangThai) where.trangThai = filter.trangThai;
    if (filter?.loaiHopDong) where.loaiHopDong = filter.loaiHopDong;

    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<LaborContract> {
    const objectId = await parseObjectIdOrNotFound(id, 'ID hợp đồng');
    const item = await this.repo.findOne({
      where: { _id: objectId as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy hợp đồng với ID ${id}`);
    }

    return item;
  }

  async update(id: string, dto: UpdateHopDongDto): Promise<LaborContract> {
    const item = await this.findOne(id);

    const turningIntoFixedTerm =
      dto.loaiHopDong === 'xac_dinh_thoi_han' &&
      item.loaiHopDong !== 'xac_dinh_thoi_han';

    if (turningIntoFixedTerm) {
      const employeeId = dto.employeeId ?? item.employeeId;
      await this.assertFixedTermLimitNotExceeded(
        employeeId,
        (item as any)._id ?? (item as any).id,
      );
    }

    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }

  async updateStatus(id: string, trangThai: string): Promise<LaborContract> {
    const item = await this.findOne(id);
    item.trangThai = trangThai;
    return this.repo.save(item);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Mẫu in hợp đồng lao động — tái dùng entity/collection `PhieuTemplate`
  // (xem chú thích tại `LoaiPhieuTemplate`): 1 dòng/tenant/loại, cột html.
  // KHÔNG dùng lại `PhieuTemplate_Controller` (route đó gác bằng `AdminGuard`,
  // lệch khuôn phân quyền hiện tại) — route ở đây gác bằng
  // `/nhan-su/hop-dong-lao-dong:xem|sua` giống hệt CRUD hợp đồng.
  // ──────────────────────────────────────────────────────────────────────────

  /** Mẫu hiện dùng (riêng của tenant nếu đã cấu hình, không thì mặc định) + cờ đã tuỳ biến hay chưa. */
  async getMauIn(): Promise<{ html: string; isCustom: boolean }> {
    const tpl = await this.mauInRepo.findOne({
      where: { loai: LOAI_MAU_IN_HOP_DONG },
    });
    return tpl ? { html: tpl.html, isCustom: true } : { html: DEFAULT_HOP_DONG_HTML, isCustom: false };
  }

  /**
   * Lưu mẫu riêng của tenant.
   *
   * 2 bước bảo vệ trước khi ghi:
   *  1. `timTokenLaCuaMauIn` — từ chối lưu nếu mẫu dùng token KHÔNG tồn tại
   *     (vd lỗi gõ `{{mucLuongg}}`) — review Important #7: âm thầm in trống
   *     do lỗi gõ tệ hơn báo lỗi ngay lúc lưu.
   *  2. `sanitizeHopDongHtml` (parser HTML thật, xem lib/hopDongRender.ts) —
   *     cắt thẻ có thể mang script/URL độc trước khi lưu. Đây là lớp phòng
   *     thủ ĐẦU (lúc ghi); `renderHopDongHtml` ở lib sanitize LẦN NỮA lúc
   *     đọc/ghép — không coi lớp nào là chốt chặn duy nhất (review Critical 1).
   */
  async upsertMauIn(html: string): Promise<{ html: string }> {
    const tokenLa = timTokenLaCuaMauIn(html);
    if (tokenLa.length > 0) {
      throw new BadRequestException(
        `Mẫu dùng token không tồn tại: ${tokenLa.map((t) => `{{${t}}}`).join(', ')}`,
      );
    }

    const sanitized = sanitizeHopDongHtml(html);
    let tpl = await this.mauInRepo.findOne({
      where: { loai: LOAI_MAU_IN_HOP_DONG },
    });
    if (tpl) {
      tpl.html = sanitized;
    } else {
      tpl = this.mauInRepo.create({ loai: LOAI_MAU_IN_HOP_DONG, html: sanitized });
    }
    const saved = await this.mauInRepo.save(tpl);
    return { html: saved.html };
  }

  /** Xoá mẫu riêng — về mặc định. */
  async removeMauIn(): Promise<void> {
    const tpl = await this.mauInRepo.findOne({
      where: { loai: LOAI_MAU_IN_HOP_DONG },
    });
    if (tpl) await this.mauInRepo.remove(tpl);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Thông tin công ty (letterhead in hợp đồng) — TenantAppConfig, xem chú
  // thích tại entity vì sao KHÔNG lấy từ identity Tenant.
  //
  // `TenantAppConfig` nằm trong `TENANT_EXEMPT_ENTITIES`
  // (be/libs/database/src/tenant.subscriber.ts) — proxy tenant-aware KHÔNG
  // tự thêm `tenantId` vào where như các entity khác trong service này
  // (LaborContract, PhieuTemplate). Trước bản vá này `findOne({ where: {} })`
  // lấy ĐẠI document đầu tiên Mongo trả về — CỦA BẤT KỲ TENANT NÀO — nên
  // renderHopDong() có thể in tên/địa chỉ/MST/người đại diện của MỘT CÔNG TY
  // KHÁC, và upsertThongTinCongTy() ghi đè lên đúng document đó (review
  // Critical 3). MỌI query ở đây PHẢI tự lọc `tenantId`, giống hệt cách
  // `tenant.service.ts`/`provisioning.service.ts` đã làm cho entity này.
  // ──────────────────────────────────────────────────────────────────────────

  private toThongTinCongTy(cfg: TenantAppConfig | null): ThongTinCongTy {
    return {
      tenCongTy: cfg?.tenCongTy ?? null,
      diaChiCongTy: cfg?.diaChiCongTy ?? null,
      maSoThue: cfg?.maSoThue ?? null,
      nguoiDaiDien: cfg?.nguoiDaiDien ?? null,
      chucVuNguoiDaiDien: cfg?.chucVuNguoiDaiDien ?? null,
      thanhPhoKy: cfg?.thanhPhoKy ?? null,
      maHopDongMau: cfg?.maHopDongMau ?? null,
    };
  }

  async getThongTinCongTy(): Promise<ThongTinCongTy> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const cfg = await this.congTyRepo.findOne({ where: { tenantId } as any });
    return this.toThongTinCongTy(cfg);
  }

  async upsertThongTinCongTy(dto: UpdateThongTinCongTyDto): Promise<ThongTinCongTy> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    let cfg = await this.congTyRepo.findOne({ where: { tenantId } as any });
    if (!cfg) {
      cfg = this.congTyRepo.create({ ...dto, tenantId } as Partial<TenantAppConfig>);
    } else {
      Object.assign(cfg, dto);
    }
    const saved = await this.congTyRepo.save(cfg);
    return this.toThongTinCongTy(saved);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // renderHopDong — ghép mẫu (riêng hoặc mặc định) + hợp đồng + nhân viên +
  // thông tin công ty ra HTML sẵn sàng in. Việc thay token nằm hết trong
  // `renderHopDongHtml` (hàm thuần, có unit test riêng ở lib/hopDongRender).
  // ──────────────────────────────────────────────────────────────────────────
  async renderHopDong(id: string): Promise<{ html: string; canhBao: string[] }> {
    const contract = await this.findOne(id);

    const employeeObjectId = await parseObjectIdOrNotFound(
      contract.employeeId,
      `employeeId của hợp đồng ${id}`,
    );
    const employee = await this.employeeRepo.findOne({
      where: { _id: employeeObjectId as any },
    });
    if (!employee) {
      throw new NotFoundException(
        `Không tìm thấy nhân viên (employeeId=${contract.employeeId}) của hợp đồng này`,
      );
    }

    const [congTy, mauIn] = await Promise.all([this.getThongTinCongTy(), this.getMauIn()]);

    return renderHopDongHtml(mauIn.html, {
      contract: {
        contractNo: contract.contractNo,
        loaiHopDong: contract.loaiHopDong,
        ngayBatDau: contract.ngayBatDau,
        ngayKetThuc: contract.ngayKetThuc,
        mucLuong: contract.mucLuong,
        phuCap: contract.phuCap,
        createdAt: (contract as any).createdAt?.toISOString?.() ?? (contract as any).createdAt,
        // Snapshot lúc ký (nếu hợp đồng có) — ưu tiên hơn chức danh HIỆN TẠI
        // của nhân viên bên dưới (review Important #4).
        chucDanh: contract.chucDanh,
      },
      employee: {
        hoTen: employee.hoTen,
        ngaySinh: employee.ngaySinh,
        gioiTinh: employee.gioiTinh,
        cccd: employee.cccd,
        diaChi: employee.diaChi,
        soDienThoai: employee.soDienThoai,
        chucDanh: employee.chucDanh,
      },
      congTy,
    });
  }
}
