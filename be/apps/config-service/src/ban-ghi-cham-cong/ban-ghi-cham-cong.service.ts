import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
import {
  ngayVN,
  hhmmSangPhut,
  thuTrongTuanCuaNgay,
  ngayKeTiep,
  kiemTraNgay,
  soNgayGiua,
} from './thoi-gian.util';
import { chuanHoaIp } from './ip.util';
import { ChamCongDto, HrNhapChamCongDto } from './dto';

const NGUONG_TRUNG_LAP_MS = 60_000;
const MOT_NGAY_MS = 86_400_000;

/**
 * Trần khoảng tra cứu của endpoint tự phục vụ. Màn hình nhân viên chỉ vẽ
 * lịch MỘT tuần, nên 31 ngày đã rộng gấp bốn nhu cầu thật. Không có trần
 * thì một request kéo được cả năm bản ghi kèm toạ độ GPS của chính mình —
 * không cần thiết, và là món quà sẵn cho ai chiếm được token.
 */
export const SO_NGAY_TOI_DA_TRA_CUU = 31;

/**
 * Đứng ngoài bán kính địa điểm và không được HR cấp phép riêng.
 *
 * FE đọc `code` này để hiện câu riêng và GIỮ LẠI nút chấm công — người dùng
 * chỉ cần đi lại gần rồi bấm lại, không phải liên hệ ai. Đọc code chứ không
 * so khớp chuỗi tiếng Việt: đổi câu chữ một lần là FE hỏng im lặng.
 */
export const MA_LOI_NGOAI_BAN_KINH = 'NGOAI_BAN_KINH_CHO_PHEP';

/** Trạng thái hồ sơ không còn được tự chấm công. */
const TRANG_THAI_DA_NGHI = 'da_nghi';

/**
 * Ca dùng cho MỘT bản ghi cụ thể: vừa là phần snapshot ghi xuống DB, vừa là
 * đầu vào cho luật tính. Gói chung để lượt `ra` kế thừa nguyên vẹn ca của
 * lượt `vao` đang mở, không lẫn với ca hiện tại của hồ sơ.
 */
interface CaChoBanGhi {
  workShiftId?: string;
  ten?: string;
  gioBatDau: string;
  gioKetThuc: string;
  laCaQuaDem: boolean;
  snapshot: CaSnapshot;
}

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
    this.chanNeuDaNghiViec(emp);
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
    let caBanGhi: CaChoBanGhi | null = null;

    if (loai === 'vao') {
      if (cuoi?.loai === 'vao') {
        // Kiểm tra bấm trùng phải đứng TRƯỚC lỗi sai thứ tự (nếu không cú
        // chạm thứ hai của một lần bấm nhầm sẽ trả 409 thay vì im lặng bỏ
        // qua) VÀ độc lập với so sánh `ngay`: hai cú chạm cách 20 giây quanh
        // nửa đêm rơi vào hai ngày lịch khác nhau nhưng vẫn là một lần bấm.
        if (this.vuaMoiBam(cuoi, thoiDiem)) return cuoi;
        if (cuoi.ngay === homNay) {
          throw new ConflictException(
            'Bạn đã check-in rồi. Cần check-out trước khi check-in lần nữa.',
          );
        }
      }
    } else {
      if (cuoi?.loai === 'ra' && this.vuaMoiBam(cuoi, thoiDiem)) return cuoi;
      if (!cuoi || cuoi.loai === 'ra') {
        throw new ConflictException(
          'Chưa có lượt check-in nào đang mở để check-out.',
        );
      }
      if (!this.luotVaoConHieuLuc(cuoi, thoiDiem)) {
        throw new ConflictException(
          `Lượt check-in ngày ${cuoi.ngay} chưa được đóng và đã quá hạn để tự check-out. ` +
            `Nếu vẫn bấm ra, ngày ${cuoi.ngay} sẽ bị ghi sai giờ về. ` +
            `Vui lòng liên hệ HR nhập bù giờ ra cho ngày ${cuoi.ngay}, sau đó check-in lại.`,
        );
      }
      // Ca qua đêm tự đúng nhờ dòng này: bản ghi ra thừa hưởng ngay của
      // bản ghi vao đang mở, không lấy ngày lịch hiện tại.
      ngay = cuoi.ngay;
      // Lượt ra phải mang ĐÚNG ca của lượt vào đang mở. HR đổi ca giữa lúc
      // vào và lúc ra thì hai nửa một phiên sẽ mang hai ca khác nhau — ngược
      // với chính lý do snapshot tồn tại.
      caBanGhi = this.caTuLuotVao(cuoi);
    }

    // 5–6. Ca, ngày nghỉ, luật tính
    if (!caBanGhi) {
      const ca = await this.layCa(emp);
      caBanGhi = ca ? this.caChoBanGhi(ca) : null;
    }
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
      ca: caBanGhi?.snapshot ?? null,
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

    // Ngoài bán kính thì CHẶN, trừ người được HR cấp phép riêng.
    //
    // Đây là đảo ngược mặc định cũ (cho qua, gắn cờ để HR xem lại): giữ cách
    // cũ thì cờ `ngoaiVung` chỉ là một cột không ai đọc, và chấm công hộ từ
    // quán cà phê đối diện vẫn trôi.
    //
    // Chặn SAU khi đã tính để câu báo lỗi nói được khoảng cách — "bạn đang
    // cách 480m" thì hành động được, còn "ngoài khu vực cho phép" thì không.
    // Và chặn TRƯỚC khi ghi: chặn mà vẫn ghi thì bảng công có bản ghi ma
    // trong khi nhân viên tưởng mình chưa chấm.
    if (kq.ngoaiVung && emp.choPhepChamNgoaiVung !== true) {
      const khoangCach =
        kq.khoangCachMet !== undefined
          ? ` Bạn đang cách điểm chấm công gần nhất khoảng ${Math.round(kq.khoangCachMet)}m.`
          : '';
      throw new ForbiddenException({
        code: MA_LOI_NGOAI_BAN_KINH,
        message:
          `Bạn đang ở ngoài khu vực được phép chấm công.${khoangCach}` +
          ' Hãy di chuyển vào khu vực rồi bấm lại, hoặc liên hệ HR nếu công việc của bạn cần chấm công từ xa.',
      });
    }

    // 7. Ghi
    return this.repo.save(
      this.repo.create({
        employeeId,
        employeeName: emp.hoTen,
        employeeCode: emp.employeeId,
        ngay,
        loai,
        thoiDiem: thoiDiem.toISOString(),
        workShiftId: caBanGhi?.workShiftId,
        caTen: caBanGhi?.ten,
        caGioBatDau: caBanGhi?.gioBatDau,
        caGioKetThuc: caBanGhi?.gioKetThuc,
        laCaQuaDem: caBanGhi?.laCaQuaDem ?? false,
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

  /**
   * Nhân viên đã nghỉ việc thì không còn được tự chấm công.
   *
   * Chặn Ở ĐÂY chứ không trong `resolveEmployeeFromUser`: hàm đó dùng chung
   * cho cả việc xem hồ sơ / lịch sử chấm công của chính mình, mà người đã
   * nghỉ vẫn có quyền xem. Chỉ hành vi tạo dữ liệu công mới bị chặn.
   *
   * `tam_nghi` (nghỉ thai sản, nghỉ không lương…) KHÔNG chặn: nhiều nơi vẫn
   * cho quay lại làm nửa buổi, chặn cứng sẽ khoá nhầm người đang đi làm.
   */
  private chanNeuDaNghiViec(emp: Employee): void {
    if (emp?.trangThai === TRANG_THAI_DA_NGHI) {
      throw new ForbiddenException(
        'Hồ sơ nhân viên đã ở trạng thái nghỉ việc nên không thể chấm công. ' +
          'Nếu bạn vẫn đang làm việc, liên hệ HR để cập nhật lại trạng thái hồ sơ.',
      );
    }
  }

  private vuaMoiBam(banGhi: AttendanceRecord, bayGio: Date): boolean {
    const truoc = new Date(banGhi.thoiDiem).getTime();
    const hieu = bayGio.getTime() - truoc;
    // Bắt buộc KHÔNG ÂM: bản ghi ở tương lai (HR nhập trước hộ nhân viên)
    // cho hiệu âm, mà số âm cũng nhỏ hơn ngưỡng — cú chấm công thật sẽ bị
    // coi là "bấm trùng" và biến mất không dấu vết.
    // NaN (thoiDiem hỏng) cho false ở mọi so sánh → rơi xuống nhánh lỗi
    // thứ tự thay vì âm thầm trả về bản ghi rác.
    return hieu >= 0 && hieu < NGUONG_TRUNG_LAP_MS;
  }

  /**
   * Lượt `vao` đang mở này còn được phép đóng bằng một cú check-out không?
   *
   * NGUỒN SỰ THẬT DUY NHẤT cho cả `checkOut` lẫn `homNay` — nếu hai chỗ tự
   * quyết riêng thì giao diện sẽ hiện nút "Check-out" dẫn thẳng vào lỗi 409.
   *
   * Ngưỡng tính theo `ngay` (hôm nay hoặc hôm qua) chứ không theo số giờ:
   * `ngay` chính là ngày công sẽ bị ghi, và một phiên làm việc hợp lệ dài
   * nhất — ca qua đêm — chỉ tràn sang đúng một ngày lịch. Quá mốc đó thì
   * lượt vao là rác treo lại: gán bản ghi ra vào ngày cũ sẽ đẻ ra "về sớm"
   * hàng tiếng đồng hồ cho một ngày công vốn đã đủ.
   */
  private luotVaoConHieuLuc(
    cuoi: AttendanceRecord | null | undefined,
    bayGio: Date,
  ): boolean {
    if (cuoi?.loai !== 'vao') return false;
    const homNay = ngayVN(bayGio);
    // VN không có DST nên trừ đúng 24h luôn ra ngày lịch liền trước.
    const homQua = ngayVN(new Date(bayGio.getTime() - MOT_NGAY_MS));
    return cuoi.ngay === homNay || cuoi.ngay === homQua;
  }

  /** Ca ghi trên bản ghi `vao` đang mở — dùng lại cho lượt `ra` của cùng phiên. */
  private caTuLuotVao(cuoi: AttendanceRecord): CaChoBanGhi | null {
    if (!cuoi.caGioBatDau || !cuoi.caGioKetThuc) return null;
    return {
      workShiftId: cuoi.workShiftId,
      ten: cuoi.caTen,
      gioBatDau: cuoi.caGioBatDau,
      gioKetThuc: cuoi.caGioKetThuc,
      laCaQuaDem: cuoi.laCaQuaDem ?? false,
      snapshot: {
        gioBatDau: cuoi.caGioBatDau,
        gioKetThuc: cuoi.caGioKetThuc,
        laCaQuaDem: cuoi.laCaQuaDem ?? false,
        // Bản ghi không lưu cấu hình linh hoạt, nhưng nhánh linh hoạt chỉ
        // ảnh hưởng đi muộn (lượt `vao`) nên lượt `ra` không cần đến.
        laLinhHoat: false,
      },
    };
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

  private caChoBanGhi(ca: WorkShift): CaChoBanGhi {
    return {
      workShiftId: String((ca as any)._id),
      ten: ca.ten,
      gioBatDau: ca.gioBatDau,
      gioKetThuc: ca.gioKetThuc,
      laCaQuaDem: ca.laCaQuaDem ?? false,
      snapshot: {
        gioBatDau: ca.gioBatDau,
        gioKetThuc: ca.gioKetThuc,
        laCaQuaDem: ca.laCaQuaDem ?? false,
        laLinhHoat: ca.laLinhHoat ?? false,
        soPhutLinhHoat: ca.soPhutLinhHoat,
      },
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

  /**
   * Số công của MỘT ngày công, chỉ nhìn vào bản ghi đã chấm.
   *
   * Cố ý KHÔNG đọc từ module bảng công: `chiTietNgay` ở đó là lưới ký hiệu
   * do HR tự điền (xem BangCong_Service, mỗi lần chạy chỉ soGioLamThem được
   * tính lại), nên ngày hôm nay luôn rỗng và ô "Công" trên màn hình nhân
   * viên sẽ luôn hiện 0 — nói dối đúng vào lúc người ta cần tin nó nhất.
   *
   * `null` khác `0`: `null` là "đã vào, đang chờ ra" (màn hình hiện "—"),
   * `0` là "chưa có gì để tính". Gộp hai thứ này lại là làm mất đúng thông
   * tin mà người vừa chấm vào muốn thấy.
   *
   * Nửa công (0.5) không thuộc phạm vi ở đây: nó cần luật ca và đơn từ, và
   * ký hiệu '1/2' hôm nay vẫn do HR quyết ở bảng công.
   */
  private tinhSoCong(banGhi: AttendanceRecord[]): number | null {
    const coVao = banGhi.some((b) => b.loai === 'vao');
    const coRa = banGhi.some((b) => b.loai === 'ra');
    if (coVao && coRa) return 1;
    if (coVao) return null;
    return 0;
  }

  async homNay(user: { id: string }) {
    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(user);
    const employeeId = String((emp as any)._id);
    const bayGio = new Date();
    const ngay = ngayVN(bayGio);
    const ca = await this.layCa(emp);

    const cuoi = await this.banGhiCuoiCung(employeeId);
    const dangMoLuotVao = this.luotVaoConHieuLuc(cuoi, bayGio);

    /**
     * NGÀY CÔNG mà màn hình đang nói tới — không nhất thiết là ngày lịch.
     *
     * Ca qua đêm 22:00–06:00: lượt vào lúc 22:00 mang `ngay` của hôm trước
     * (xem checkOut, dòng `ngay = cuoi.ngay`). Nhân viên mở app lúc 00:30 mà
     * danh sách vẫn lọc theo ngày lịch hôm nay thì trả về rỗng, trong khi
     * `hanhDongKeTiep` lại là 'ra' — màn hình hiện "Chưa có lượt chấm công
     * nào" ngay dưới nút "Chấm công RA", đọc như hệ thống vừa mất dữ liệu.
     *
     * Lấy đúng ngày công của lượt vào đang mở để hai phần nói cùng một câu
     * chuyện. Điều kiện dùng CHUNG `luotVaoConHieuLuc()` với
     * `hanhDongKeTiep` ngay bên dưới, nên hai thứ không thể lệch nhau: hễ
     * nút hiện 'ra' thì danh sách là của đúng ngày công đó, hễ nút hiện
     * 'vao' (kể cả khi có lượt vao treo đã quá hạn) thì danh sách là của
     * hôm nay.
     *
     * `ngay` vẫn giữ nguyên nghĩa "ngày lịch hôm nay" để FE phân biệt được
     * hai trường hợp và xưng hô cho đúng.
     */
    const ngayCong = dangMoLuotVao && cuoi ? cuoi.ngay : ngay;

    const banGhi = await this.repo.find({
      where: { employeeId, ngay: ngayCong, isActive: true },
      order: { thoiDiem: 'ASC' },
    } as any);

    // Địa điểm KHÔNG gắn với nhân viên: `checkIn` khớp GPS/wifi/QR với toàn
    // bộ địa điểm đang bật (xem lời gọi locationRepo.find trong checkIn và
    // ChamCongRules_Service.doiChieuViTri). Trả cả danh sách để màn hình
    // nhân viên nói đúng sự thật — hiện tên khi công ty chỉ có một điểm, và
    // hiện số lượng khi có nhiều — thay vì bịa ra "địa điểm của bạn".
    const diaDiem = await this.locationRepo.find({
      where: { isActive: true },
    });

    return {
      ngay,
      ngayCong,
      nhanVien: {
        id: employeeId,
        hoTen: emp.hoTen,
        employeeCode: emp.employeeId,
      },
      phongBan: emp.phongBan,
      ca: ca
        ? {
            id: String((ca as any)._id),
            ten: ca.ten,
            gioBatDau: ca.gioBatDau,
            gioKetThuc: ca.gioKetThuc,
            laCaQuaDem: ca.laCaQuaDem ?? false,
          }
        : null,
      diaDiem: diaDiem.map((d) => ({
        id: String((d as any)._id),
        ten: d.ten,
        loai: d.loai,
        banKinh: d.banKinh,
      })),
      soCong: this.tinhSoCong(banGhi),
      // Hành động kế tiếp mà FE nên hiện trên nút lớn. Dùng CHUNG hàm với
      // checkOut: một lượt vao treo từ tuần trước không được phép làm nút
      // hiện "Check-out", vì cú bấm đó sẽ bị chặn ngay bằng 409.
      hanhDongKeTiep: dangMoLuotVao ? 'ra' : 'vao',
      banGhi,
    };
  }

  /**
   * Bản ghi chấm công của CHÍNH người đang đăng nhập trong một khoảng ngày.
   *
   * `employeeId` suy từ token, KHÔNG nhận từ tham số — đó là toàn bộ ranh
   * giới ngăn một nhân viên đọc lịch đi lại của đồng nghiệp. `findAll()`
   * bên dưới vẫn giữ nguyên nghĩa "toàn tenant, chỉ quản trị"; đừng gộp hai
   * đường này lại.
   */
  async cuaToi(
    user: { id: string },
    tuNgay?: string,
    denNgay?: string,
  ): Promise<AttendanceRecord[]> {
    if (!tuNgay || !denNgay) {
      throw new BadRequestException('Thiếu khoảng ngày tra cứu (tuNgay, denNgay)');
    }
    // kiemTraNgay ném BadRequest cho cả sai định dạng lẫn ngày không có thật.
    kiemTraNgay(tuNgay);
    kiemTraNgay(denNgay);
    if (denNgay < tuNgay) {
      throw new BadRequestException('denNgay phải không nhỏ hơn tuNgay');
    }
    if (soNgayGiua(tuNgay, denNgay) > SO_NGAY_TOI_DA_TRA_CUU) {
      throw new BadRequestException(
        `Khoảng tra cứu tối đa ${SO_NGAY_TOI_DA_TRA_CUU} ngày`,
      );
    }

    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(user);
    const employeeId = String((emp as any)._id);

    return this.repo.find({
      where: {
        employeeId,
        isActive: true,
        // Chuỗi "YYYY-MM-DD" so sánh từ điển trùng với so sánh thời gian.
        ngay: { $gte: tuNgay, $lte: denNgay },
      },
      order: { thoiDiem: 'ASC' },
    } as any);
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
      if (filter.tuNgay) where.ngay.$gte = filter.tuNgay;
      if (filter.denNgay) where.ngay.$lte = filter.denNgay;
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
    // DTO chỉ regex được ĐỊNH DẠNG; "2026-02-30" lọt qua rồi bị Date cuộn
    // sang 02/03 khiến `ngay` và `thoiDiem` lệch hai ngày mà không báo lỗi.
    kiemTraNgay(dto.ngay);
    const phutGio = hhmmSangPhut(dto.gio);

    // Dùng API công khai của NhanVien_Service (tự ném NotFoundException khi
    // không có) thay vì thò tay vào repo private của service khác.
    const emp = await this.nhanVien_Service.findOne(dto.employeeId);

    const ca = await this.layCa(emp);
    const caBanGhi = ca ? this.caChoBanGhi(ca) : null;
    const laNgayNghi = await this.suyNgayNghi(emp, dto.ngay);

    // KHÔNG chép lại phép tính muộn/sớm: gọi đúng hàm mà đường tự chấm dùng.
    // Bản chép trước đây thiếu hai nhánh qua nửa đêm nên HR nhập bù cho ca
    // đêm sẽ xoá sạch số phút đi muộn.
    const { soPhutDiMuon, soPhutVeSom } = this.rules.tinhMuonSom({
      phutTrongNgay: phutGio,
      loai: dto.loai,
      ca: caBanGhi?.snapshot ?? null,
      laNgayNghi,
    });

    // Lượt `ra` của ca qua đêm xảy ra ở ngày lịch KẾ TIẾP. `ngay` (ngày công)
    // vẫn là dto.ngay, chỉ `thoiDiem` phải cộng một ngày — nếu không, bản ghi
    // ra sẽ sớm hơn bản ghi vao 16 tiếng, không bao giờ là bản ghi cuối cùng
    // và phiên vĩnh viễn bị coi là đang mở.
    const ngayThoiDiem =
      dto.loai === 'ra' &&
      caBanGhi?.laCaQuaDem &&
      phutGio < hhmmSangPhut(caBanGhi.gioBatDau)
        ? ngayKeTiep(dto.ngay)
        : dto.ngay;

    // Giờ VN → ISO: VN = UTC+7 quanh năm.
    const thoiDiem = new Date(`${ngayThoiDiem}T${dto.gio}:00+07:00`);

    // Nhập bù là việc của QUÁ KHỨ. Một bản ghi ở tương lai luôn đứng đầu danh
    // sách theo thoiDiem DESC nên sẽ chặn mọi cú chấm công thật sau đó.
    if (thoiDiem.getTime() > Date.now()) {
      throw new BadRequestException(
        `Không thể nhập bù chấm công cho thời điểm ở tương lai (${dto.ngay} ${dto.gio}).`,
      );
    }

    return this.repo.save(
      this.repo.create({
        // Lấy _id của hồ sơ, không lấy chuỗi client gửi: hex viết hoa vẫn hợp
        // lệ với ObjectId nhưng lưu xuống là chuỗi khác, mọi phép gom nhóm
        // sau này sẽ tách đôi cùng một người.
        employeeId: String((emp as any)._id),
        employeeName: emp.hoTen,
        employeeCode: emp.employeeId,
        ngay: dto.ngay,
        loai: dto.loai,
        thoiDiem: thoiDiem.toISOString(),
        workShiftId: caBanGhi?.workShiftId,
        caTen: caBanGhi?.ten,
        caGioBatDau: caBanGhi?.gioBatDau,
        caGioKetThuc: caBanGhi?.gioKetThuc,
        laCaQuaDem: caBanGhi?.laCaQuaDem ?? false,
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
