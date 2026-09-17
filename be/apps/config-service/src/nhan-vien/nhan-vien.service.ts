import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CauHinhLuong, Employee, EmployeeCounter } from '@app/entities';
import { TenantContextService } from '@app/core';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';
import { chuanHoaHoSo } from './lib/chuanHoaHoSo';
import { dungBangKhaiBaoBH } from './lib/khaiBaoBaoHiem';
import type { DongKhaiBaoBH } from './lib/khaiBaoBaoHiem';
import { QuyPhep_Service } from '../quy-phep/quy-phep.service';

export interface EmployeeFilter {
  /**
   * "YYYY-MM" — chỉ lấy người CÒN thuộc biên chế trong tháng đó: chưa nghỉ,
   * hoặc nghỉ từ trong tháng này trở đi. Dùng cho các màn chấm công.
   */
  conTrongThang?: string;
  hoTen?: string;
  departmentId?: string;
  trangThai?: string;
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

@Injectable()
export class NhanVien_Service {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    @InjectRepository(EmployeeCounter)
    private readonly counterRepo: Repository<EmployeeCounter>,
    @InjectRepository(CauHinhLuong)
    private readonly cauHinhLuongRepo: Repository<CauHinhLuong>,
    private readonly tenantContext: TenantContextService,
    // Vòng phụ thuộc CỐ Ý với QuyPhep_Module (xem nhan-vien.module.ts):
    // forwardRef() cần ở CẢ import module lẫn injection này — thiếu một chỗ
    // là Nest báo lỗi circular dependency lúc boot hoặc tiêm undefined.
    @Inject(forwardRef(() => QuyPhep_Service))
    private readonly quyPhep_Service: QuyPhep_Service,
  ) {}

  /**
   * Maintains ONE EmployeeCounter doc per tenant, incrementing `seq` and
   * returning a zero-padded employeeId like NV0001, NV0002, ...
   *
   * Uses an atomic MongoDB findOneAndUpdate($inc) on the raw (non-tenant-proxied,
   * non-ORM-cached) mongo repository so concurrent create() calls for the same
   * tenant can never read-modify-write the same seq value. The tenant-aware
   * repository proxy (see @app/database DatabaseModule) does not intercept
   * findOneAndUpdate, so the explicit `{ tenantId }` filter below is exactly
   * what reaches MongoDB — no reliance on proxy-injected filtering.
   */
  async generateEmployeeId(tenantId?: string): Promise<string> {
    const mongoCounterRepo = this.counterRepo.manager.getMongoRepository(
      EmployeeCounter,
    ) as unknown as import('typeorm').MongoRepository<EmployeeCounter>;

    const updated = await mongoCounterRepo.findOneAndUpdate(
      { tenantId } as any,
      { $inc: { seq: 1 } } as any,
      { upsert: true, returnDocument: 'after' } as any,
    );

    const seq = (updated as any)?.seq;
    return 'NV' + String(seq).padStart(4, '0');
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const existingCccd = await this.repo.findOne({
      where: { cccd: dto.cccd },
    });
    if (existingCccd) {
      throw new ConflictException('CCCD đã tồn tại trong hệ thống');
    }

    if (dto.mst) {
      const existingMst = await this.repo.findOne({
        where: { mst: dto.mst },
      });
      if (existingMst) {
        throw new ConflictException('MST đã tồn tại trong hệ thống');
      }
    }

    if (dto.userId) {
      const existingUserId = await this.repo.findOne({
        // `isActive: true` là bắt buộc, không phải tuỳ chọn: thiếu nó thì
        // một hồ sơ ĐÃ XOÁ MỀM vẫn giam `userId` vĩnh viễn — HR không gán
        // lại tài khoản đó cho ai được nữa và người dùng mất hẳn đường chấm
        // công, chỉ gỡ được bằng cách sửa thẳng MongoDB. Lọc trùng khớp
        // `resolveEmployeeFromUser()`, nơi cũng chỉ tra hồ sơ còn hiệu lực.
        where: { userId: dto.userId, isActive: true },
      });
      if (existingUserId) {
        throw new ConflictException(
          'Tài khoản này đã được liên kết với một nhân viên khác',
        );
      }
    }

    const tenantId = this.tenantContext.getCurrentTenantId();
    const employeeId = await this.generateEmployeeId(tenantId);

    const entity = this.repo.create({
      ...chuanHoaHoSo({ ...dto }),
      employeeId,
      isActive: true,
    } as Partial<Employee>);

    const daLuu = await this.luuHoSo(entity);

    // Hồ sơ nhập liệu (vd. chuyển từ hệ thống cũ) có thể tạo mới với
    // ngayChinhThuc đã có sẵn — NV đã chính thức từ trước, chỉ mới được đưa
    // vào hệ thống này. Không thể đợi một lần update() sau đó mới mở khoá vì
    // có thể sẽ không có lần update() nào đổi ngayChinhThuc nữa.
    await this.moKhoaQuyNeuCanThiet(daLuu, undefined);

    return daLuu;
  }

  /**
   * Cửa GHI duy nhất của hồ sơ nhân viên: dịch lỗi trùng khoá của MongoDB
   * thành 409 có câu chữ đọc được.
   *
   * Vì sao phải có: các nhánh kiểm trùng ở `create()`/`update()` CỐ Ý chỉ soi
   * hồ sơ `isActive: true` (hồ sơ xoá mềm phải nhả tài khoản ra), nhưng chỉ
   * mục unique `{tenantId, userId}` dưới Mongo thì không biết `isActive` là
   * gì. Chênh lệch đó là một đường còn sống dẫn thẳng tới E11000: service cho
   * qua, Mongo chặn.
   *
   * Lỗi thô lọt ra ngoài thì `GlobalExceptionFilter` không nhận ra
   * `HttpException` ⇒ trả 500 kèm đúng một câu "An unexpected error occurred".
   * Sự cố production 2026-09-17 mất gần một ngày mới lần ra chính vì câu đó:
   * nó không nói được trường nào, hồ sơ nào, vì sao. Không lặp lại nữa.
   */
  private async luuHoSo(entity: Employee): Promise<Employee> {
    try {
      return await this.repo.save(entity);
    } catch (e) {
      throw this.dichLoiTrungKhoa(e);
    }
  }

  /**
   * Trả về `ConflictException` nếu `e` là lỗi trùng khoá, còn lại trả nguyên
   * `e` để không nuốt mất lỗi thật.
   *
   * Nhận diện rộng tay có chủ đích: tuỳ đường ghi (`insertMany` qua bulk hay
   * `updateOne`) driver ném `MongoServerError` hoặc `MongoBulkWriteError`, và
   * `code`/`keyPattern` không phải lúc nào cũng nằm ở cùng một chỗ.
   */
  private dichLoiTrungKhoa(e: unknown): unknown {
    const err = e as any;
    const loiGhi = err?.writeErrors?.[0]?.err ?? err?.writeErrors?.[0] ?? err;
    const laTrungKhoa =
      err?.code === 11000 ||
      loiGhi?.code === 11000 ||
      /E11000/.test(String(err?.message ?? ''));
    if (!laTrungKhoa) return e;

    const khoa = Object.keys(
      err?.keyPattern ?? loiGhi?.keyPattern ?? {},
    ).filter((k) => k !== 'tenantId');
    // Tên chỉ mục trong câu lỗi là đường lần ra cuối cùng khi driver không
    // đính kèm `keyPattern` (đúng trường hợp bulk write đã gặp trên prod).
    const tenChiMuc = /index:\s*(\S+)/.exec(String(err?.message ?? ''))?.[1] ?? '';

    if (khoa.includes('userId') || tenChiMuc.includes('userId')) {
      return new ConflictException(
        'Tài khoản này đã được liên kết với một nhân viên khác. Nếu hồ sơ kia ' +
          'đã ngưng hoạt động, hãy gỡ tài khoản khỏi hồ sơ đó trước.',
      );
    }

    return new ConflictException(
      khoa.length
        ? `Đã có hồ sơ khác dùng cùng ${khoa.join(', ')} — không lưu được.`
        : 'Hồ sơ bị trùng với một hồ sơ đã có — không lưu được.',
    );
  }

  /**
   * Mở khoá quỹ phép CHỈ khi `ngayChinhThuc` vừa được đặt hoặc vừa đổi so với
   * giá trị trước khi lưu — không phải mọi lần save(). moKhoaLenChinhThuc()
   * tự nó idempotent nên gọi mọi lần cũng không sai, nhưng như vậy là N truy
   * vấn thừa mỗi lần HR chỉ sửa số điện thoại.
   *
   * Lỗi cấp quỹ KHÔNG được làm hỏng việc lưu hồ sơ: hồ sơ là bản ghi chính,
   * đã lưu xong rồi; quỹ luôn cấp lại được bằng tay từ màn Quỹ phép. Vì vậy
   * chỉ log lỗi, không rethrow (không phá create()/update()) và không nuốt
   * im lặng (console.error để còn dò được khi có sự cố).
   */
  private async moKhoaQuyNeuCanThiet(
    daLuu: Employee,
    ngayChinhThucTruocKhiSua: string | undefined,
  ): Promise<void> {
    if (
      !daLuu.ngayChinhThuc ||
      daLuu.ngayChinhThuc === ngayChinhThucTruocKhiSua
    ) {
      return;
    }

    try {
      await this.quyPhep_Service.moKhoaLenChinhThuc(
        String((daLuu as any)._id),
        'he_thong',
      );
    } catch (e) {
      // (P3.8 review round 4, IMPORTANT 10): log PHẢI kèm employeeId — đây
      // là tín hiệu DUY NHẤT cho biết quỹ của MỘT NGƯỜI CỤ THỂ đã âm thầm
      // không được cấp. Thiếu id, log chỉ nói "có lỗi xảy ra ở đâu đó" và
      // không ai lần ra được nhân viên nào cần cấp bù tay.
      console.error(
        `[quy-phep] mở khoá thất bại cho nhân viên ${String((daLuu as any)._id)}`,
        e,
      );
    }
  }

  /**
   * Coerces the `isActive` filter value, which may arrive as a real boolean
   * (programmatic callers) or as the STRING "true"/"false" (HTTP query params
   * are never parsed to booleans by Nest's default query pipe). Defaults to
   * `true` when the value is absent, mirroring the previous behaviour.
   */
  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(filter?: EmployeeFilter): Promise<Employee[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    if (filter?.hoTen) where.hoTen = filter.hoTen;
    if (filter?.departmentId) where.departmentId = filter.departmentId;
    if (filter?.trangThai) where.trangThai = filter.trangThai;

    const ds = await this.repo.find({ where });

    /**
     * Ẩn người đã nghỉ TRƯỚC tháng đang xem (yêu cầu d20).
     *
     * Lọc trong bộ nhớ chứ không đẩy xuống Mongo: điều kiện là "chưa có mốc
     * nghỉ HOẶC mốc nghỉ >= đầu tháng", mà `where` của driver Mongo ở đây
     * không dịch được `$or` lồng với các bộ lọc phía trên một cách chắc chắn.
     * Danh sách nhân sự của một công ty tính bằng trăm, không phải bằng triệu.
     */
    if (filter?.conTrongThang) {
      const dauThang = `${filter.conTrongThang}-01`;
      return ds.filter((nv) => !nv.ngayNghiViec || nv.ngayNghiViec >= dauThang);
    }

    return ds;
  }

  async findOne(id: string): Promise<Employee> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID ${id}`);
    }

    return item;
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const item = await this.findOne(id);

    if (dto.cccd && dto.cccd !== item.cccd) {
      const existing = await this.repo.findOne({ where: { cccd: dto.cccd } });
      if (existing) {
        throw new ConflictException('CCCD đã tồn tại trong hệ thống');
      }
    }

    if (dto.mst && dto.mst !== item.mst) {
      const existing = await this.repo.findOne({ where: { mst: dto.mst } });
      if (existing) {
        throw new ConflictException('MST đã tồn tại trong hệ thống');
      }
    }

    if (dto.userId && dto.userId !== item.userId) {
      const existing = await this.repo.findOne({
        // Xem chú thích cùng nhánh trong create(): thiếu `isActive: true`
        // thì hồ sơ xoá mềm giam luôn tài khoản, không có đường gỡ từ giao
        // diện. Nhánh `dto.userId &&` cố ý bỏ qua chuỗi rỗng — FE gửi ''
        // để GỠ liên kết, và gỡ liên kết thì không có gì để kiểm trùng.
        where: { userId: dto.userId, isActive: true },
      });
      if (existing) {
        throw new ConflictException(
          'Tài khoản này đã được liên kết với một nhân viên khác',
        );
      }
    }

    const truocKhiSua = item.ngayChinhThuc;
    Object.assign(item, chuanHoaHoSo({ ...dto }));
    const daLuu = await this.luuHoSo(item);

    await this.moKhoaQuyNeuCanThiet(daLuu, truocKhiSua);

    return daLuu;
  }

  /**
   * Bảng KHAI BÁO LAO ĐỘNG gửi cơ quan bảo hiểm (yêu cầu d9 cột G).
   *
   * Chỉ hồ sơ còn hiệu lực: người đã xoá mềm không còn là lao động của đơn vị,
   * khai lên là khai khống.
   */
  async khaiBaoBaoHiem(): Promise<DongKhaiBaoBH[]> {
    const nhanVien = await this.repo.find({
      where: { isActive: true } as any,
    });
    // Sắp theo mã NV cho khớp thứ tự HR vẫn đọc ở màn Hồ sơ; `find` của Mongo
    // không đảm bảo thứ tự nào cả.
    nhanVien.sort((a, b) =>
      (a.employeeId ?? '').localeCompare(b.employeeId ?? ''),
    );

    const rows = await this.cauHinhLuongRepo.find({
      where: { isActive: true } as any,
    });
    const chung = rows[0];
    if (!chung) {
      // Chưa cấu hình lương thì chưa biết căn cứ đóng — trả bảng với mức 0
      // kèm ghi chú còn hơn đoán bừa một căn cứ rồi khai sai với cơ quan BH.
      return dungBangKhaiBaoBH(nhanVien, {
        mucKhaiBaoMacDinh: 0,
        khoanLuong: [],
        bhxh: { tyLe: 0, canCu: 'MUC_KHAI_BAO' },
      } as any);
    }
    return dungBangKhaiBaoBH(nhanVien, chung);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }

  async updateStatus(id: string, trangThai: string): Promise<Employee> {
    const item = await this.findOne(id);
    item.trangThai = trangThai;
    return this.repo.save(item);
  }

  /**
   * Suy hồ sơ nhân viên từ tài khoản đang đăng nhập.
   *
   * Đây là cửa duy nhất cho mọi endpoint tự phục vụ (chấm công, đơn từ).
   * Không bao giờ nhận employeeId từ body — nếu nhận thì tồn tại đường
   * chấm công hộ người khác qua API.
   */
  async resolveEmployeeFromUser(user: { id: string }): Promise<Employee> {
    if (!user?.id) {
      throw new NotFoundException(
        'Tài khoản chưa được liên kết với hồ sơ nhân viên',
      );
    }

    const emp = await this.repo.findOne({
      where: { userId: user.id, isActive: true },
    });

    if (!emp) {
      throw new NotFoundException(
        'Tài khoản chưa được liên kết với hồ sơ nhân viên. Liên hệ HR để được gán.',
      );
    }

    return emp;
  }
}
