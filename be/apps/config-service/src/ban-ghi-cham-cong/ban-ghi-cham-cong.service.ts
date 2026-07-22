import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AttendanceRecord,
  WorkShift,
  AttendanceLocation,
  Employee,
} from '@app/entities';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { ThietBiChamCong_Service } from '../thiet-bi-cham-cong/thiet-bi-cham-cong.service';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import { ChamCongRules_Service, CaSnapshot } from './cham-cong-rules.service';
import { ngayVN, hhmmSangPhut, thuTrongTuanCuaNgay } from './thoi-gian.util';
import { chuanHoaIp } from './ip.util';
import { ChamCongDto, HrNhapChamCongDto } from './dto';

const NGUONG_TRUNG_LAP_MS = 60_000;

export interface BanGhiFilter {
  tuNgay?: string;
  denNgay?: string;
  employeeId?: string;
  ngoaiVung?: boolean | string;
}

@Injectable()
export class BanGhiChamCong_Service {
  private readonly logger = new Logger(BanGhiChamCong_Service.name);

  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly repo: Repository<AttendanceRecord>,
    @InjectRepository(WorkShift)
    private readonly shiftRepo: Repository<WorkShift>,
    @InjectRepository(AttendanceLocation)
    private readonly locationRepo: Repository<AttendanceLocation>,
    private readonly nhanVien_Service: NhanVien_Service,
    private readonly thietBi_Service: ThietBiChamCong_Service,
    private readonly ngayLe_Service: NgayLe_Service,
    private readonly rules: ChamCongRules_Service,
  ) {}

  async checkIn(
    user: { id: string },
    dto: ChamCongDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AttendanceRecord> {
    return this.cham(user, dto, 'vao', ipAddress, userAgent);
  }

  async checkOut(
    user: { id: string },
    dto: ChamCongDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AttendanceRecord> {
    return this.cham(user, dto, 'ra', ipAddress, userAgent);
  }

  /**
   * Thứ tự các bước ở đây có chủ đích, xem spec §6.2. Đặc biệt: kiểm tra
   * thiết bị đứng TRƯỚC khi đọc địa điểm và ca — máy lạ không được biết
   * bất cứ thông tin gì về công ty.
   */
  private async cham(
    user: { id: string },
    dto: ChamCongDto,
    loai: 'vao' | 'ra',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AttendanceRecord> {
    // 1–2. Hồ sơ NV
    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(user);
    const employeeId = String((emp as any)._id);

    // 3. Thiết bị — chặn cứng, không tạo bản ghi
    await this.thietBi_Service.kiemTraThietBi(
      emp,
      dto.deviceId,
      userAgent,
      dto.tenThietBi,
    );

    // Thời điểm LUÔN từ đồng hồ máy chủ.
    const thoiDiem = new Date();
    const homNay = ngayVN(thoiDiem);

    // 4. Thứ tự vào/ra (kèm chống bấm nhầm hai lần)
    const cuoi = await this.banGhiCuoiCung(employeeId);
    let ngay = homNay;

    if (loai === 'vao') {
      if (cuoi?.loai === 'vao' && cuoi.ngay === homNay) {
        // Kiểm tra bấm trùng phải đứng TRƯỚC lỗi sai thứ tự, nếu không cú
        // chạm thứ hai của một lần bấm nhầm sẽ trả 409 thay vì im lặng bỏ qua.
        if (this.vuaMoiBam(cuoi, thoiDiem)) return cuoi;
        throw new ConflictException(
          'Bạn đã check-in rồi. Cần check-out trước khi check-in lần nữa.',
        );
      }
    } else {
      if (cuoi?.loai === 'ra' && this.vuaMoiBam(cuoi, thoiDiem)) return cuoi;
      if (!cuoi || cuoi.loai === 'ra') {
        throw new ConflictException(
          'Chưa có lượt check-in nào đang mở để check-out.',
        );
      }
      // Ca qua đêm tự đúng nhờ dòng này: bản ghi ra thừa hưởng ngay của
      // bản ghi vao đang mở, không lấy ngày lịch hiện tại.
      ngay = cuoi.ngay;
    }

    // 5–6. Ca, ngày nghỉ, luật tính
    const ca = await this.layCa(emp);
    const laNgayNghi = await this.suyNgayNghi(emp, ngay);
    const diaDiemList = await this.locationRepo.find({
      where: { isActive: true },
    });

    // IP chỉ lấy được ở tầng request nên phải chuẩn hoá ở đây, không phải
    // trong rules: `::ffff:…` và X-Forwarded-For nhiều chặng làm phép so
    // khớp ipWifi trượt 100%.
    const ip = chuanHoaIp(ipAddress);

    const kq = this.rules.tinhKetQua({
      thoiDiem,
      loai,
      ca: ca ? this.snapshotCa(ca) : null,
      viTri:
        dto.latitude !== undefined && dto.longitude !== undefined
          ? {
              latitude: dto.latitude,
              longitude: dto.longitude,
              doChinhXacMet: dto.doChinhXacMet,
            }
          : null,
      phuongThuc: dto.phuongThuc,
      maQr: dto.maQr,
      ipAddress: ip,
      diaDiemList,
      laNgayNghi,
    });

    // 7. Ghi
    return this.repo.save(
      this.repo.create({
        employeeId,
        employeeName: emp.hoTen,
        employeeCode: emp.employeeId,
        ngay,
        loai,
        thoiDiem: thoiDiem.toISOString(),
        workShiftId: ca ? String((ca as any)._id) : undefined,
        caTen: ca?.ten,
        caGioBatDau: ca?.gioBatDau,
        caGioKetThuc: ca?.gioKetThuc,
        laCaQuaDem: ca?.laCaQuaDem ?? false,
        locationId: kq.locationId,
        locationTen: kq.locationTen,
        phuongThuc: dto.phuongThuc,
        latitude: dto.latitude,
        longitude: dto.longitude,
        doChinhXacMet: dto.doChinhXacMet,
        khoangCachMet: kq.khoangCachMet,
        ngoaiVung: kq.ngoaiVung,
        // Lưu bản đã chuẩn hoá: báo cáo đọc `::ffff:…` không ra nghĩa gì,
        // và giá trị lưu phải chính là giá trị đã dùng để đối chiếu.
        ipAddress: ip,
        deviceId: dto.deviceId,
        soPhutDiMuon: kq.soPhutDiMuon,
        soPhutVeSom: kq.soPhutVeSom,
        laNgayNghi,
        nguonTao: 'tu_cham',
        isActive: true,
      } as Partial<AttendanceRecord>),
    );
  }

  private vuaMoiBam(banGhi: AttendanceRecord, bayGio: Date): boolean {
    const truoc = new Date(banGhi.thoiDiem).getTime();
    // NaN (thoiDiem hỏng) cho false ở mọi so sánh → rơi xuống nhánh lỗi
    // thứ tự thay vì âm thầm trả về bản ghi rác.
    return bayGio.getTime() - truoc < NGUONG_TRUNG_LAP_MS;
  }

  private async banGhiCuoiCung(
    employeeId: string,
  ): Promise<AttendanceRecord | null> {
    const ds = await this.repo.find({
      where: { employeeId, isActive: true },
      order: { thoiDiem: 'DESC' },
      take: 1,
    } as any);
    return ds[0] ?? null;
  }

  private async layCa(emp: Employee): Promise<WorkShift | null> {
    if (!emp.workShiftId) return null;
    const { ObjectId } = await import('mongodb');
    // workShiftId rác (import cũ, sửa tay) làm `new ObjectId()` ném lỗi và
    // toàn bộ nhân viên đó mất đường chấm công. Thà bỏ snapshot ca và ghi
    // cảnh báo cho HR còn hơn chặn cứng.
    if (!ObjectId.isValid(emp.workShiftId)) {
      this.logger.warn(
        `Nhân viên ${String((emp as any)._id)} (${emp.employeeId ?? '—'}) có workShiftId không hợp lệ: "${emp.workShiftId}" — HR cần gán lại ca`,
      );
      return null;
    }
    return this.shiftRepo.findOne({
      where: { _id: new ObjectId(emp.workShiftId) as any },
    });
  }

  private snapshotCa(ca: WorkShift): CaSnapshot {
    return {
      gioBatDau: ca.gioBatDau,
      gioKetThuc: ca.gioKetThuc,
      laCaQuaDem: ca.laCaQuaDem ?? false,
      laLinhHoat: ca.laLinhHoat ?? false,
      soPhutLinhHoat: ca.soPhutLinhHoat,
    };
  }

  /**
   * Ngày lễ, hoặc ngày ngoài lịch làm việc của NV.
   *
   * Danh sách ngayLamViecTrongTuan rỗng/chưa đặt nghĩa là CHƯA cấu hình —
   * không suy ra "mọi ngày đều là ngày nghỉ", vì như thế sẽ âm thầm tắt
   * việc tính đi muộn cho toàn bộ nhân viên chưa được HR gán lịch.
   */
  private async suyNgayNghi(emp: Employee, ngay: string): Promise<boolean> {
    const le = await this.ngayLe_Service.timTheoNgay(ngay);
    if (le) return true;

    const lich = emp.ngayLamViecTrongTuan;
    if (!lich || lich.length === 0) return false;

    return !lich.includes(thuTrongTuanCuaNgay(ngay));
  }

  async homNay(user: { id: string }) {
    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(user);
    const employeeId = String((emp as any)._id);
    const ngay = ngayVN(new Date());
    const ca = await this.layCa(emp);

    const banGhi = await this.repo.find({
      where: { employeeId, ngay, isActive: true },
      order: { thoiDiem: 'ASC' },
    } as any);

    const cuoi = await this.banGhiCuoiCung(employeeId);

    return {
      ngay,
      nhanVien: {
        id: employeeId,
        hoTen: emp.hoTen,
        employeeCode: emp.employeeId,
      },
      ca: ca
        ? {
            id: String((ca as any)._id),
            ten: ca.ten,
            gioBatDau: ca.gioBatDau,
            gioKetThuc: ca.gioKetThuc,
            laCaQuaDem: ca.laCaQuaDem ?? false,
          }
        : null,
      // Hành động kế tiếp mà FE nên hiện trên nút lớn.
      hanhDongKeTiep: cuoi?.loai === 'vao' ? 'ra' : 'vao',
      banGhi,
    };
  }

  async findAll(filter?: BanGhiFilter): Promise<AttendanceRecord[]> {
    const where: Record<string, any> = { isActive: true };
    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.ngoaiVung !== undefined && filter.ngoaiVung !== '') {
      where.ngoaiVung =
        typeof filter.ngoaiVung === 'boolean'
          ? filter.ngoaiVung
          : filter.ngoaiVung !== 'false';
    }
    if (filter?.tuNgay || filter?.denNgay) {
      // Chuỗi "YYYY-MM-DD" so sánh từ điển trùng với so sánh thời gian.
      where.ngay = {} as Record<string, string>;
      if (filter.tuNgay) (where.ngay as any).$gte = filter.tuNgay;
      if (filter.denNgay) (where.ngay as any).$lte = filter.denNgay;
    }

    return this.repo.find({
      where,
      order: { thoiDiem: 'DESC' },
    } as any);
  }

  /**
   * HR nhập bù cho NV quên chấm. Không qua kiểm tra thiết bị và không
   * đối chiếu vị trí — nhưng luôn mang nguonTao='hr_nhap' để phân biệt
   * được với bản ghi tự chấm.
   */
  async hrNhap(
    dto: HrNhapChamCongDto,
    nguoiThucHien: string,
  ): Promise<AttendanceRecord> {
    // Dùng API công khai của NhanVien_Service (tự ném NotFoundException khi
    // không có) thay vì thò tay vào repo private của service khác.
    const emp = await this.nhanVien_Service.findOne(dto.employeeId);

    const ca = await this.layCa(emp);
    const laNgayNghi = await this.suyNgayNghi(emp, dto.ngay);

    let soPhutDiMuon = 0;
    let soPhutVeSom = 0;
    if (ca && !laNgayNghi) {
      const phut = hhmmSangPhut(dto.gio);
      if (dto.loai === 'vao') {
        soPhutDiMuon = Math.max(0, phut - hhmmSangPhut(ca.gioBatDau));
      } else {
        let p = phut;
        if (ca.laCaQuaDem && p >= hhmmSangPhut(ca.gioBatDau)) p -= 1440;
        soPhutVeSom = Math.max(0, hhmmSangPhut(ca.gioKetThuc) - p);
      }
    }

    return this.repo.save(
      this.repo.create({
        employeeId: dto.employeeId,
        employeeName: emp.hoTen,
        employeeCode: emp.employeeId,
        ngay: dto.ngay,
        loai: dto.loai,
        // Giờ VN → ISO: VN = UTC+7 quanh năm.
        thoiDiem: new Date(`${dto.ngay}T${dto.gio}:00+07:00`).toISOString(),
        workShiftId: ca ? String((ca as any)._id) : undefined,
        caTen: ca?.ten,
        caGioBatDau: ca?.gioBatDau,
        caGioKetThuc: ca?.gioKetThuc,
        laCaQuaDem: ca?.laCaQuaDem ?? false,
        ngoaiVung: false,
        soPhutDiMuon,
        soPhutVeSom,
        laNgayNghi,
        nguonTao: 'hr_nhap',
        ghiChu: dto.ghiChu
          ? `${dto.ghiChu} (nhập bởi ${nguoiThucHien})`
          : `Nhập bù bởi ${nguoiThucHien}`,
        isActive: true,
      } as Partial<AttendanceRecord>),
    );
  }
}
