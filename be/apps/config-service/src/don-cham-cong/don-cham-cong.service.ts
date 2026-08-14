import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRequest, Employee, PhanBoQuy, PhanBoQuyGio } from '@app/entities';
import { CreateDonChamCongDto, UpdateDonChamCongDto } from './dto';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { QuyPhep_Service } from '../quy-phep/quy-phep.service';
import { QuyGio_Service } from '../quy-gio/quy-gio.service';
import { CauHinhChamCong_Service } from '../cau-hinh-cham-cong/cau-hinh-cham-cong.service';
import { lichTuanApDung } from '../cau-hinh-cham-cong/lich-tuan';
import {
  chiaGioOtTheoLoai,
  gopPhanBoOt,
  suyLoaiNgay,
  tinhSoGioOt,
  tinhSoNgayNghi,
  traHeSo,
  HE_SO_OT_MAC_DINH,
} from './luat-don';
import { lamTronGio } from '../quy-gio/luat-quy-gio';

// Khoảng nghỉ vượt quá ngần này thì từ chối luôn thay vì âm thầm quét hàng
// nghìn ngày lễ — một đơn nghỉ nhiều ngày là chuyện thường, nhưng vài chục
// ngày đến vài năm là bất thường, gần chắc là lỗi nhập liệu.
const GIOI_HAN_NGAY_NGHI = 60;

/**
 * Mã lỗi Task 4 — vá lỗ hổng phân quyền đơn từ. FE đọc `code` để hiện đúng
 * thông báo, không so khớp chuỗi tiếng Việt (đổi câu chữ một lần là FE hỏng
 * im lặng) — cùng quy ước với `MA_LOI_THIET_BI` ở thiet-bi-cham-cong.service.ts.
 */
export const MA_LOI_DON_CHAM_CONG = {
  /**
   * Người bấm duyệt/từ chối trùng với chủ đơn (so theo `userId` của hồ sơ
   * nhân viên, KHÔNG theo permission/vaiTro) — một mình vừa nộp vừa duyệt
   * khiến bước phê duyệt trở thành hình thức.
   */
  KHONG_TU_DUYET_DON: 'KHONG_TU_DUYET_DON',
  /** Tự huỷ đơn KHÔNG đứng tên mình. */
  KHONG_PHAI_DON_CUA_MINH: 'KHONG_PHAI_DON_CUA_MINH',
  /** Tự huỷ đơn đã da_duyet/tu_choi — quyết định đã có hiệu lực, không cho xoá dấu vết. */
  DON_DA_XU_LY_KHONG_THE_HUY: 'DON_DA_XU_LY_KHONG_THE_HUY',
  /**
   * P3.8: nộp đơn `phep_nam` khi hồ sơ chưa có `ngayChinhThuc` (còn thử
   * việc). Cùng mã với `MA_LOI_QUY_PHEP.CHUA_LEN_CHINH_THUC` bên
   * quy-phep.service.ts — đây là bản sao có chủ đích: don-cham-cong ném lỗi
   * này TRƯỚC khi gọi sang QuyPhep_Service, nên nó cần mã lỗi của riêng
   * mình thay vì import chéo một hằng số dùng cho mục đích khác.
   */
  CHUA_LEN_CHINH_THUC: 'CHUA_LEN_CHINH_THUC',
  /**
   * P3.8 (review round 1, CRITICAL fix): đơn trừ quỹ cố chuyển thẳng giữa
   * hai trạng thái không có lối quỹ hợp lệ — `da_duyet → cho_duyet` hoặc
   * `tu_choi → da_duyet`. Bắt đi qua trạng thái trung gian (`tu_choi`) thay
   * vì dựng thêm đường hoàn-rồi-giữ-lại phức tạp — xem bảng chuyển trong
   * `updateStatus()`.
   */
  CHUYEN_TRANG_THAI_KHONG_HOP_LE: 'CHUYEN_TRANG_THAI_KHONG_HOP_LE',
  /**
   * P3.8 (review round 4, CRITICAL 1): PUT :id sửa `loaiDon`/`loaiNghi`/
   * `ngay`/`denNgay`/`buoi` của một đơn TRỪ QUỸ (trước hoặc sau khi sửa) —
   * `soNgayNghi`/`phanBoQuy` chỉ được backend tính MỘT LẦN lúc `create()` và
   * không bao giờ tính lại ở `update()`, nên các trường này đổi mà số đã
   * giữ/trừ đứng yên là mở khoá quỹ. Xem doc-comment `update()`.
   */
  KHONG_THE_SUA_DON_TRU_QUY: 'KHONG_THE_SUA_DON_TRU_QUY',
  /**
   * P3.8 (review round 5 — hệ quả của round 4 IMPORTANT 2/4): NV đã lên
   * chính thức (qua được cửa `CHUA_LEN_CHINH_THUC`) nhưng KHÔNG có quỹ
   * `phep_nam` nào `dang_hieu_luc` — vd `ngayChinhThuc` tương lai đã tới hạn
   * nhưng chưa ai bấm "Cấp phép đầu năm" sau đó (round 4 CHỈ chặn cấp SỚM,
   * không có cron/backfill lúc đọc để tự cấp ĐÚNG lúc). Khác hẳn
   * `KHONG_DU_SO_DU` (CÓ quỹ nhưng không đủ ngày hoặc sai kỳ) — gộp chung
   * hai ca này khiến HR đọc "không đủ số dư" rồi đi tìm nhầm chỗ (tưởng NV
   * đã dùng hết phép) thay vì tìm đúng chỗ (chưa từng được cấp).
   */
  CHUA_DUOC_CAP_QUY: 'CHUA_DUOC_CAP_QUY',
} as const;

export interface DonChamCongFilter {
  employeeId?: string;
  loaiDon?: string;
  trangThai?: string;
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

@Injectable()
export class DonChamCong_Service {
  constructor(
    @InjectRepository(AttendanceRequest)
    private readonly repo: Repository<AttendanceRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly ngayLeService: NgayLe_Service,
    private readonly nhanVienService: NhanVien_Service,
    private readonly quyPhep_Service: QuyPhep_Service,
    // Task 7 (P4.2a): song song với quyPhep_Service — giữ/nhả/chuyển/hoàn quỹ
    // giờ cho đơn nghỉ bù, và tích/thu hồi quỹ giờ cho đơn OT đã duyệt.
    private readonly quyGio_Service: QuyGio_Service,
    // (P4.5) lịch tuần mức công ty — dùng làm đáy khi NV không khai riêng.
    private readonly cauHinhChamCong_Service: CauHinhChamCong_Service,
  ) {}

  /** Đơn này có trừ quỹ phép năm không. Chỉ `phep_nam` mới đụng quỹ — các
   * loaiNghi khác (khong_luong/om_dau/thai_san/cuoi_hoi/tang) không hề chạm
   * tới QuyPhep_Service, kể cả khi NV còn thử việc. */
  private laDonTruQuy(don: { loaiDon: string; loaiNghi?: string }): boolean {
    return don.loaiDon === 'nghi_phep' && don.loaiNghi === 'phep_nam';
  }

  /**
   * Task 7b: đơn này có đang thực sự ĐỤNG quỹ giờ không — vai trò song song
   * với `laDonTruQuy()` ở trên (cùng dùng để chặn PUT sửa trường ảnh hưởng
   * quỹ ở `update()`), nhưng hai ĐIỀU KIỆN khác hẳn nhau vì hai loại đơn
   * đụng quỹ ở hai THỜI ĐIỂM khác nhau:
   *
   *  - `nghi_bu` giữ chỗ NGAY LÚC NỘP (giống `phep_nam`) — còn đụng quỹ
   *    chừng nào `phanBoQuyGio` còn snapshot trên đơn (kể cả sau khi đã
   *    duyệt: `phanBoQuyGio` không bị xoá khi `chuyenSangDaDung()`, chỉ
   *    huyDonCuaToi()/remove() mới xoá — xem `canXuLyQuyGio` ở `remove()`).
   *  - `lam_them_gio` (OT) KHÔNG giữ chỗ gì lúc nộp — quỹ chỉ thực sự bị
   *    đụng (tích giờ) từ lúc `trangThai` chuyển sang `da_duyet`. Một đơn OT
   *    còn `cho_duyet`/`tu_choi` không có gì trên quỹ để mà desync.
   */
  private laDonTruQuyGio(don: {
    loaiDon: string;
    trangThai?: string;
    phanBoQuyGio?: unknown[];
  }): boolean {
    if (don.loaiDon === 'nghi_bu') return !!don.phanBoQuyGio?.length;
    if (don.loaiDon === 'lam_them_gio') return don.trangThai === 'da_duyet';
    return false;
  }

  /**
   * Các ngày THỰC SỰ trừ phép trong khoảng — PHẢI dùng cùng bộ lọc với
   * `tinhSoNgayNghi` (bỏ ngày lễ, rồi bỏ ngày ngoài lịch làm việc nếu đã cấu
   * hình). Hai hàm lệch nhau dù chỉ một ngày thì `soNgayNghi` snapshot trên
   * đơn và độ dài danh sách gửi cho `phanBoChoNgayNghi` sẽ khác nhau, và
   * guard đối chiếu hai tham số đó trong QuyPhep_Service (Task 5) sẽ ném
   * BadRequestException cho MỌI đơn phép_nam — xem
   * don-cham-cong.service.spec.ts, test đối chiếu khoảng vắt cuối tuần + lễ.
   */
  private async cacNgayTruPhep(
    tuNgay: string,
    denNgay: string,
    emp: Employee,
  ): Promise<string[]> {
    const ngayLe = new Set(await this.layNgayLeTrongKhoang(tuNgay, denNgay));
    const lich = lichTuanApDung(emp, await this.cauHinhChamCong_Service.lichTuanChung());
    const daCauHinh = !!lich && lich.length > 0;

    return this.cacNgayTrongKhoang(tuNgay, denNgay).filter((ngay) => {
      if (ngayLe.has(ngay)) return false;
      if (!daCauHinh) return true;
      const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
      const thu = new Date(
        Date.UTC(nam, thang - 1, ngayTrongThang),
      ).getUTCDay();
      return lich!.includes(thu);
    });
  }

  private async findEmployee(employeeId: string): Promise<Employee> {
    const { ObjectId } = await import('mongodb');
    const emp = await this.employeeRepo.findOne({
      where: { _id: new ObjectId(employeeId) as any },
    });

    if (!emp) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    return emp;
  }

  /** 0=CN…6=T7, đọc trên trục UTC thuần — cùng quy ước với luat-don.ts. */
  private ngayThanhMocUTC(ngay: string): number {
    const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
    return Date.UTC(nam, thang - 1, ngayTrongThang);
  }

  /** Danh sách "YYYY-MM-DD" từ tuNgay đến denNgay (tính cả hai đầu). */
  private cacNgayTrongKhoang(tuNgay: string, denNgay: string): string[] {
    const moc = this.ngayThanhMocUTC(tuNgay);
    const mocDen = this.ngayThanhMocUTC(denNgay);
    const hai = (n: number) => String(n).padStart(2, '0');

    const ds: string[] = [];
    for (let t = moc; t <= mocDen; t += 24 * 60 * 60 * 1000) {
      const d = new Date(t);
      ds.push(`${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}-${hai(d.getUTCDate())}`);
    }
    return ds;
  }

  /**
   * Hỏi NgayLe_Service từng ngày trong khoảng nghỉ để lấy danh sách ngày lễ
   * cần loại khỏi soNgayNghi. N truy vấn (một cho mỗi ngày) chấp nhận được vì
   * đã chặn khoảng ở GIOI_HAN_NGAY_NGHI trước khi gọi hàm này.
   */
  private async layNgayLeTrongKhoang(
    tuNgay: string,
    denNgay: string,
  ): Promise<string[]> {
    const cacNgay = this.cacNgayTrongKhoang(tuNgay, denNgay);
    const ketQua = await Promise.all(
      cacNgay.map((ngay) => this.ngayLeService.timTheoNgay(ngay)),
    );
    return cacNgay.filter((_, i) => ketQua[i] !== null);
  }

  /**
   * Tính các trường BACKEND TỰ TÍNH (soGioOt/heSoOt/loaiNgayOt cho OT,
   * soNgayNghi cho nghỉ phép) — snapshot NGAY LÚC TẠO đơn, không tính lại khi
   * đọc. Nếu tính lại lúc đọc, HR sửa lịch lễ tháng sau sẽ âm thầm đổi hệ số
   * của đơn đã nộp từ tháng trước, và không ai biết số nào mới là số đã trả
   * lương. Trả về object rời — gọi nơi tạo entity SAU khi spread `...dto`, để
   * giá trị backend tính luôn đè giá trị client gửi kèm (nếu có).
   */
  private async tinhCacTruongSnapshot(
    dto: CreateDonChamCongDto,
    emp: Employee,
  ): Promise<
    Partial<
      Pick<
        AttendanceRequest,
        | 'soGioOt'
        | 'heSoOt'
        | 'loaiNgayOt'
        | 'phanBoOt'
        | 'soNgayNghi'
        | 'soGioNghiBu'
      >
    >
  > {
    // (P4.5) Nạp MỘT LẦN cho cả hàm — dùng chung cho cả ba nhánh dưới đây,
    // không hỏi lại DB mỗi nhánh.
    const lichLamViec = lichTuanApDung(
      emp,
      await this.cauHinhChamCong_Service.lichTuanChung(),
    );

    if (dto.loaiDon === 'lam_them_gio') {
      const ngayLe = await this.ngayLeService.timTheoNgay(dto.ngay);
      const loaiNgay = suyLoaiNgay({
        ngay: dto.ngay,
        laNgayLe: ngayLe !== null,
        ngayLamViecTrongTuan: lichLamViec,
      });

      const chia = await this.quyGio_Service.cauHinhChiaGio();
      if (!chia) {
        // Công ty chưa khai `lamThem`: giữ nguyên hành vi trước P4.2b — một
        // loại, hệ số mặc định, KHÔNG có `phanBoOt`. Không chẻ theo một mặc
        // định ngầm, vì chẻ hay không là quyết định của công ty chứ không
        // phải hệ quả phụ của một lần deploy.
        return {
          soGioOt: tinhSoGioOt(dto.gioTu!, dto.gioDen!),
          heSoOt: traHeSo(HE_SO_OT_MAC_DINH, loaiNgay),
          loaiNgayOt: loaiNgay,
        };
      }

      const phanBoOt = chiaGioOtTheoLoai({
        gioTu: dto.gioTu!,
        gioDen: dto.gioDen!,
        loaiNgay,
        khungGioDem: chia.khungGioDem,
        uuTienLoai: chia.uuTienLoai,
        heSoTra: chia.heSoTra,
        heSoTichQuy: chia.heSoTichQuy,
      });

      return { ...gopPhanBoOt(phanBoOt), phanBoOt };
    }

    // Đơn làm online KHÔNG snapshot gì (không trừ quỹ, không sinh tiền) nên
    // rơi thẳng ra `{}` ở cuối hàm. Nhưng vẫn phải chặn khoảng ngày bất
    // thường: bảng công trải cờ online ra từng ngày trong khoảng, nên một đơn
    // chọn nhầm năm sẽ quét vài nghìn vòng lặp mỗi lần Tổng hợp. Dùng CHUNG
    // trần với đơn nghỉ — cùng một lớp lỗi nhập liệu, không cần con số thứ hai.
    if (dto.loaiDon === 'lam_online') {
      const soNgay = this.cacNgayTrongKhoang(
        dto.ngay,
        dto.denNgay ?? dto.ngay,
      ).length;
      if (soNgay > GIOI_HAN_NGAY_NGHI) {
        throw new BadRequestException(
          `Khoảng làm online không được vượt quá ${GIOI_HAN_NGAY_NGHI} ngày`,
        );
      }
      return {};
    }

    if (dto.loaiDon === 'nghi_phep' || dto.loaiDon === 'nghi_bu') {
      const tuNgay = dto.ngay;
      const denNgay = dto.denNgay ?? dto.ngay;
      const soNgayTrongKhoang = this.cacNgayTrongKhoang(tuNgay, denNgay).length;
      if (soNgayTrongKhoang > GIOI_HAN_NGAY_NGHI) {
        throw new BadRequestException(
          `Khoảng nghỉ không được vượt quá ${GIOI_HAN_NGAY_NGHI} ngày`,
        );
      }

      const ngayLeTrongKhoang = await this.layNgayLeTrongKhoang(tuNgay, denNgay);

      // Task 7 (P4.2a): nghi_bu quy đổi sang GIỜ để trừ quỹ giờ, thay vì
      // trừ NGÀY như phep_nam — hai kiểu, kieuNghi định trước bởi người nộp:
      if (dto.loaiDon === 'nghi_bu') {
        // theo_gio: dùng lại tinhSoGioOt() — nó đã xử lý đúng ca qua đêm
        // (cộng 24h thay vì ra số âm). Không chép luật thứ hai. Trả sớm
        // TRƯỚC khi hỏi soGioMoiNgay() — nhánh này không cần tới nó, hỏi
        // trước rồi mới rẽ nhánh là một lượt đọc cấu hình lãng phí trên MỌI
        // đơn theo_gio (review: Minor, đã sửa).
        //
        // `lamTronGio()` (review nhánh, IMPORTANT 2): `tinhSoGioOt()` trả
        // `(phutDen - phutTu)/60` nên mọi khoảng không rơi đúng mốc nửa giờ
        // đều là phân số nhị phân vô hạn (2h20' = 2.3333…). `soGioNghiBu` là
        // con số đi thẳng vào `phanBoChoNghiBu()` để TRỪ QUỸ và được lưu lại
        // trên đơn — làm tròn ở ĐÂY, tại biên sinh ra nó, là cách duy nhất
        // để phía quỹ không phải đoán xem con số mình nhận đã sạch chưa.
        if (dto.kieuNghi === 'theo_gio') {
          const soGioNghiBu = lamTronGio(
            dto.gioTu && dto.gioDen ? tinhSoGioOt(dto.gioTu, dto.gioDen) : 0,
          );
          return { soGioNghiBu };
        }

        // theo_ngay: dùng lại tinhSoNgayNghi() — bỏ ngày lễ, bỏ ngày ngoài
        // lịch làm việc trong tuần, nửa buổi chỉ có nghĩa khi đơn đúng một
        // ngày. CÙNG bộ lọc với nhánh phep_nam ở dưới — không chép luật lần
        // hai, chỉ khác ở việc quy thêm ra giờ nhân soGioMoiNgay.
        const soGioMoiNgay = await this.quyGio_Service.soGioMoiNgay();
        const soNgay = tinhSoNgayNghi({
          tuNgay,
          denNgay,
          buoi: dto.buoi,
          ngayLeTrongKhoang,
          ngayLamViecTrongTuan: lichLamViec,
        });
        return {
          soNgayNghi: soNgay,
          // Nửa buổi × soGioMoiNgay lẻ (vd 7.5) cũng sinh số lẻ — cùng biên
          // làm tròn với nhánh theo_gio ở trên.
          soGioNghiBu: lamTronGio(soNgay * soGioMoiNgay),
        };
      }

      const soNgayNghi = tinhSoNgayNghi({
        tuNgay,
        denNgay,
        buoi: dto.buoi,
        ngayLeTrongKhoang,
        ngayLamViecTrongTuan: lichLamViec,
      });
      return { soNgayNghi };
    }

    // giai_trinh: không tính gì.
    return {};
  }

  async create(dto: CreateDonChamCongDto): Promise<AttendanceRequest> {
    const emp = await this.findEmployee(dto.employeeId);
    const truongTinhToan = await this.tinhCacTruongSnapshot(dto, emp);

    // P3.8: đơn phep_nam giữ chỗ quỹ TRƯỚC khi đơn được lưu — tính toán và
    // ném lỗi (nếu có) đều xảy ra ở đây, lúc chưa có gì trong DB để mà dọn.
    let phanBoQuy: PhanBoQuy[] | undefined;
    if (this.laDonTruQuy(dto)) {
      // Cửa 1: còn thử việc thì không có quỹ để mà trừ. Chặn ở đây chứ
      // không để phanBoChoNgayNghi báo "không đủ số dư" — thông báo đó sai
      // bản chất (họ không có quỹ nào cả, không phải quỹ không đủ) và sẽ
      // khiến HR đi tìm cách cấp quỹ cho một người chưa đủ điều kiện.
      if (!emp.ngayChinhThuc) {
        // 409 (không phải 403): người gọi CÓ quyền nộp đơn — permission
        // '/cham-cong/don-tu:them' không sai — chỉ là TRẠNG THÁI hồ sơ
        // (chưa lên chính thức) chưa cho phép hành động này ngay bây giờ.
        // Cùng họ lỗi với KHONG_DU_SO_DU, cả hai đều là 409 "trạng thái dữ
        // liệu hiện tại không cho phép", không phải lỗi phân quyền.
        throw new ConflictException({
          code: MA_LOI_DON_CHAM_CONG.CHUA_LEN_CHINH_THUC,
          message:
            'Nhân viên chưa lên chính thức nên chưa có quỹ phép năm. Có thể nộp đơn nghỉ không lương.',
        });
      }

      // `cacNgayTruPhep` PHẢI khớp `tinhSoNgayNghi` (dùng chung để tính
      // truongTinhToan.soNgayNghi ở trên) — xem doc-comment của
      // cacNgayTruPhep(). Tính MỘT LẦN ở đây rồi dùng lại cho cả cửa 1b lẫn
      // cửa 2 bên dưới — trước đây `phanBoChoNgayNghi` tự tính lại danh sách
      // này nên cửa 1b (chặn ngày nghỉ trước ngayChinhThuc) không có sẵn để
      // mà kiểm.
      const cacNgay = await this.cacNgayTruPhep(
        dto.ngay,
        dto.denNgay ?? dto.ngay,
        emp,
      );

      // Cửa 1b (P3.8 review round 4, IMPORTANT 3): spec §6.1 quy tắc 1 chặn
      // CẢ HAI vế — "chưa có ngayChinhThuc" (cửa 1 ở trên) VÀ "ngayChinhThuc
      // > ngày nghỉ". Thiếu vế sau thì một NV vừa lên chính thức hôm nay vẫn
      // xin nghỉ phép năm cho một ngày TRONG QUÁ KHỨ, lúc còn thử việc — kết
      // hợp với round trước (ngayChinhThuc là ngày tương lai không tự cấp
      // quỹ ngay), giờ NV này ĐÃ có quỹ (đã tới ngayChinhThuc) nên xuyên
      // luôn được cửa 1, chỉ còn cửa 1b giữ đúng ranh giới "ngày nghỉ phải
      // từ lúc chính thức trở đi". So bằng NGÀY THỰC SỰ TRỪ PHÉP đầu tiên
      // (`cacNgay[0]`), không phải `dto.ngay`: đơn có thể bắt đầu bằng một
      // ngày lễ/cuối tuần không bị trừ phép, lúc đó phải xét ngày trừ phép
      // ĐẦU TIÊN mới đúng ranh giới.
      const ngayDauTienTruPhep = cacNgay[0] ?? dto.ngay;
      if (emp.ngayChinhThuc > ngayDauTienTruPhep) {
        throw new ConflictException({
          code: MA_LOI_DON_CHAM_CONG.CHUA_LEN_CHINH_THUC,
          message: `Nhân viên lên chính thức từ ${emp.ngayChinhThuc}, chưa có quỹ phép năm cho ngày ${ngayDauTienTruPhep}. Có thể nộp đơn nghỉ không lương.`,
        });
      }

      // Cửa 1c (P3.8 review round 5): chẩn đoán ĐÚNG "chưa từng được cấp
      // quỹ" khác với "có quỹ nhưng không đủ" — hệ quả trực tiếp của round 4
      // (IMPORTANT 2/4): NV có `ngayChinhThuc` tương lai đã tới hạn KHÔNG tự
      // động được cấp quỹ (không có cron/backfill lúc đọc trong repo này) —
      // phải chờ ai đó bấm "Cấp phép đầu năm" sau khi ngày đó đã qua. Nếu
      // không có bước chẩn đoán riêng ở đây, NV này rơi thẳng vào cửa 2 với
      // `quyKhaDung` rỗng, và `phanBoChoNgayNghi` ném `KHONG_DU_SO_DU` —
      // đúng chữ nhưng SAI Ý: HR đọc "không đủ số dư" sẽ nghĩ NV đã dùng hết
      // phép, đi tìm nhầm chỗ, thay vì bấm đúng nút "Cấp phép đầu năm".
      const quyHienCo = await this.quyPhep_Service.layQuyCuaNhanVien(
        dto.employeeId,
      );
      const coQuyDangHieuLuc = quyHienCo.some(
        (q) => q.trangThai === 'dang_hieu_luc',
      );
      if (!coQuyDangHieuLuc) {
        throw new ConflictException({
          code: MA_LOI_DON_CHAM_CONG.CHUA_DUOC_CAP_QUY,
          message:
            'Nhân viên đã lên chính thức nhưng chưa được cấp quỹ phép năm. HR vào màn Quỹ phép bấm "Cấp phép đầu năm".',
        });
      }

      // Cửa 2: đủ số dư chưa.
      phanBoQuy = await this.quyPhep_Service.phanBoChoNgayNghi(
        dto.employeeId,
        cacNgay,
        truongTinhToan.soNgayNghi ?? 0,
      );
    }

    // Task 7 (P4.2a): đơn nghi_bu giữ chỗ quỹ GIỜ TRƯỚC khi đơn được lưu —
    // song song hoàn toàn với phanBoQuy ở trên, chỉ khác quỹ (giờ thay vì
    // ngày) và không có các cửa "chưa lên chính thức" (quỹ giờ không đụng gì
    // tới thời gian thử việc). `phanBoChoNghiBu` tự ném ConflictException nếu
    // không đủ số dư — không cần chặn tay ở đây.
    //
    // (rollout blocker, chốt ngay trước khi deploy): quỹ giờ là tính năng
    // OPT-IN theo công ty (runbook `ops/README.md` bước 4) — công ty CHƯA
    // khai `lamThem` thì `nghi_bu` phải xử sự Y HỆT trước P4.2a: không giữ
    // chỗ, không gọi quỹ, không 409. Cửa chặn ở đây phải hỏi
    // `dangKichHoat()` (cùng nguồn `layCauHinh()` với `tichTuDonOt()`)
    // TRƯỚC khi gọi `phanBoChoNghiBu()` — thiếu cửa này, `phanBoChoNghiBu()`
    // luôn thấy quỹ trống (chưa ai từng tích) và ném KHONG_DU_SO_DU cho MỌI
    // đơn nghỉ bù ở MỌI công ty ngay khi deploy code, sớm hơn một nhịp so
    // với đúng lúc HR bật tính năng mà runbook đã cảnh báo.
    let phanBoQuyGio: PhanBoQuyGio[] | undefined;
    if (
      dto.loaiDon === 'nghi_bu' &&
      (truongTinhToan.soGioNghiBu ?? 0) > 0 &&
      (await this.quyGio_Service.dangKichHoat())
    ) {
      phanBoQuyGio = await this.quyGio_Service.phanBoChoNghiBu(
        dto.employeeId,
        truongTinhToan.soGioNghiBu!,
        dto.ngay,
      );
    }

    const entity = this.repo.create({
      ...dto,
      employeeName: emp.hoTen,
      employeeCode: emp.employeeId,
      // Task 4 (cửa thứ hai): LUÔN 'cho_duyet', bất kể dto.trangThai là gì.
      // Design spec §3 câu hỏi 7 chốt: HR được phép nộp hộ đơn cho người
      // khác, nhưng đơn vẫn phải qua một bước duyệt riêng để lại vết
      // (nguoiDuyetId/thoiDiemDuyet trong updateStatus()) — không ai được
      // "tạo thẳng ra đơn đã duyệt". Trước đây `dto.trangThai ?? 'cho_duyet'`
      // để lọt giá trị client gửi kèm, cho phép né PATCH :id/trang-thai (và
      // luật KHONG_TU_DUYET_DON trong đó) ngay từ lúc tạo.
      trangThai: 'cho_duyet',
      isActive: true,
      // Đặt SAU `...dto` — dù DTO đã cố tình không có các trường này (xem
      // CreateDonChamCongDto), việc gán tường minh ở đây đảm bảo backend luôn
      // thắng ngay cả khi pipe forbidNonWhitelisted có bị nới lỏng sau này.
      ...truongTinhToan,
      // phanBoQuy (P3.8): chỉ gán khi đơn thực sự đụng quỹ — đơn OT/giải
      // trình/nghỉ khác không nên có key này trên entity dù là undefined.
      ...(phanBoQuy ? { phanBoQuy } : {}),
      // phanBoQuyGio (Task 7): cùng lý do — chỉ đơn nghi_bu thực sự trừ quỹ
      // giờ mới có key này.
      ...(phanBoQuyGio ? { phanBoQuyGio } : {}),
    } as Partial<AttendanceRequest>);

    const daLuu = await this.repo.save(entity);

    if (phanBoQuy?.length) {
      try {
        await this.quyPhep_Service.giuCho(
          dto.employeeId,
          phanBoQuy,
          String((daLuu as any)._id),
          dto.employeeId,
        );
      } catch (e) {
        // Giữ chỗ hỏng SAU khi đơn đã lưu thì đơn vừa lưu phải bị vô hiệu
        // hoá ngay — nếu không, sẽ có một đơn "chờ duyệt" tồn tại mà quỹ
        // không hề bị giữ; duyệt đơn ma đó về sau sẽ cấp phép miễn phí vì
        // chuyenSangDaDung() sẽ chạy trên `phanBoQuy` đã lưu như bình
        // thường, trong khi giuCho() — bước lẽ ra phải giữ số dư — chưa hề
        // thành công.
        //
        // (review round 1, IMPORTANT 3): giuCho() lặp và lưu TỪNG quỹ một,
        // không nguyên tử — nếu đơn phân bổ vào ≥2 quỹ và hỏng ở quỹ thứ
        // hai, quỹ thứ nhất đã giữ chỗ THẬT. Gọi nhaCho() best-effort trên
        // TOÀN BỘ phanBoQuy TRƯỚC khi vô hiệu hoá đơn, để phần đã giữ (nếu
        // có) không bị kẹt vĩnh viễn. Bọc try/catch RIÊNG và nuốt lỗi phụ:
        // mục tiêu chính của khối catch này là dọn đơn vừa lưu — một lỗi
        // phụ ở bước dọn quỹ không được che mất lỗi gốc (`e`) sắp ném lại.
        //
        // GIỚI HẠN CÒN LẠI (cùng họ với giới hạn giuCho()/nhaCho() đã tự
        // nhận trong quy-phep.service.ts — "không transaction"): nếu
        // giuCho() hỏng ngay ở quỹ ĐẦU TIÊN (chưa giữ được quỹ nào),
        // nhaCho() ở đây vẫn chạm vào đúng quỹ đó và trừ `p.soNgay` khỏi
        // `soNgayDangChoDuyet` của nó — tự clamp về 0 nên không kéo âm,
        // nhưng về lý thuyết vẫn có thể trừ nhầm phần giữ chỗ của MỘT đơn
        // KHÁC đang giữ đúng quỹ đó cùng lúc (cửa sổ đua hiếm). Không có
        // cách biết "quỹ nào trong phanBoQuy đã thực sự giữ được" từ bên
        // ngoài mà không đổi hợp đồng public của QuyPhep_Service — chấp
        // nhận rủi ro còn sót lại này, không mở rộng phạm vi Task 8.
        try {
          await this.quyPhep_Service.nhaCho(
            dto.employeeId,
            phanBoQuy,
            String((daLuu as any)._id),
            dto.employeeId,
          );
        } catch {
          // nuốt lỗi phụ — xem giải thích ở trên.
        }
        daLuu.isActive = false;
        // Xoá luôn snapshot: dù nhaCho() ở trên thành công hay không, đơn
        // này không còn quyền giữ/dùng bất kỳ phần nào của phanBoQuy nữa —
        // xoá để remove()/huyDonCuaToi() (nếu lỡ được gọi trên đơn ma này)
        // không có gì để mà nhả/hoàn lần thứ hai.
        daLuu.phanBoQuy = undefined;
        await this.repo.save(daLuu);
        throw e;
      }
    }

    // Task 7 (P4.2a): giữ chỗ quỹ giờ — song song hệt khối phanBoQuy ở trên,
    // cùng khuôn xử lý lỗi. Không bao giờ CÙNG chạy với khối phanBoQuy (một
    // đơn chỉ là nghi_phep/phep_nam HOẶC nghi_bu, không bao giờ cả hai).
    if (phanBoQuyGio?.length) {
      try {
        await this.quyGio_Service.giuCho(
          dto.employeeId,
          phanBoQuyGio,
          String((daLuu as any)._id),
          dto.employeeId,
        );
      } catch (e) {
        // Không để đơn sống sót với phanBoQuyGio đã lưu mà quỹ chưa hề giữ:
        // chuyenSangDaDung() lúc duyệt sẽ chạy trên phân bổ đó như bình
        // thường và trừ mất giờ chưa từng được giữ — cùng lý do đã ghi ở
        // khối phanBoQuy phía trên.
        await this.quyGio_Service
          .nhaCho(
            dto.employeeId,
            phanBoQuyGio,
            String((daLuu as any)._id),
            dto.employeeId,
          )
          .catch(() => undefined);
        daLuu.isActive = false;
        daLuu.phanBoQuyGio = undefined;
        await this.repo.save(daLuu);
        throw e;
      }
    }

    return daLuu;
  }

  /**
   * Đường so "người gọi có phải chủ đơn không" KHÔNG đi qua `userId` của hồ
   * sơ chủ đơn — dùng khi `chuDon.userId` rỗng.
   *
   * Vì sao cần đường thứ hai: `nhan-vien.service.ts` CỐ Ý cho phép ghi
   * `userId: ''` để HR gỡ liên kết tài khoản khỏi hồ sơ. Kết hợp với việc
   * `/nhan-su/ho-so-nhan-vien:sua` và `/cham-cong/don-tu:sua` nằm cùng một
   * vai trò trên production ("Quản trị hệ thống", "Quản lý"), ba bước sau đủ
   * để tự duyệt đơn của chính mình: gỡ `userId` của mình khỏi hồ sơ → duyệt
   * đơn (luật không bắt vì `chuDon.userId` rỗng) → gắn lại `userId`. Trước
   * 67979dd đường này đòi `vaiTro === 'ADMIN'`, thứ không ai có trên
   * production; sau đó nó nằm trong tay HR bình thường.
   *
   * Trả `false` khi người gọi KHÔNG có hồ sơ nhân viên nào: lúc đó không tồn
   * tại "đơn của chính mình" để mà chặn (vd tài khoản HR thuê ngoài chưa
   * được gán hồ sơ). Chỉ NotFoundException mới được hiểu là "không có hồ sơ";
   * lỗi khác (mất kết nối DB) phải ném tiếp, nếu nuốt hết thì một sự cố hạ
   * tầng lại mở đúng cánh cửa vừa khoá.
   */
  private async laChuDonTheoHoSo(
    employeeIdCuaDon: string,
    nguoiThucHien: { id: string; [k: string]: unknown },
  ): Promise<boolean> {
    let hoSoNguoiGoi: Employee;
    try {
      hoSoNguoiGoi = await this.nhanVienService.resolveEmployeeFromUser(
        nguoiThucHien as { id: string },
      );
    } catch (e) {
      if (e instanceof NotFoundException) return false;
      throw e;
    }

    return String((hoSoNguoiGoi as any)._id) === String(employeeIdCuaDon);
  }

  /**
   * Đổi trạng thái đơn — luồng DUYỆT/TỪ CHỐI (`PATCH :id/trang-thai`).
   *
   * `nguoiThucHien` LUÔN phải là `req.user` thật của người gọi (controller
   * gắn `PermissionGuard`, không phải body/query) — đây là chỗ duy nhất chặn
   * được tự duyệt: `PermissionGuard` chỉ kiểm mảng `permissions` của vai trò,
   * hoàn toàn không biết đơn đang xử lý có phải của chính người gọi hay không.
   * Người có `/cham-cong/don-tu:sua` vẫn duyệt được MỌI đơn, kể cả đơn mình
   * tự nộp — nên luật "không tự duyệt" phải nằm ở đây.
   */
  async updateStatus(
    id: string,
    trangThai: string,
    nguoiDuyet: string | undefined,
    nguoiThucHien: { id: string; [k: string]: unknown },
  ): Promise<AttendanceRequest> {
    const item = await this.findOne(id);
    // Chụp NGUYÊN VẸN trạng thái/vết duyệt CŨ trước khi ghi đè bất cứ gì.
    //
    // (review round 1, CRITICAL): bản trước rẽ nhánh quỹ theo `trangThai`
    // ĐÍCH trong khi `item.trangThai` đã bị ghi đè ở dòng dưới, nên "duyệt
    // hai lần" không phân biệt được với "duyệt lần đầu" (trừ quỹ hai lần),
    // "duyệt rồi từ chối" gọi nhaCho() thay vì hoanTraDaDung() (nhaCho chỉ
    // đụng soNgayDangChoDuyet, không đụng soNgayDaDung — phép mất vĩnh
    // viễn), và "trả về cho_duyet" không gọi gì cả (phép vẫn bị trừ nhưng
    // đơn quay lại hàng chờ, duyệt lần nữa trừ lần hai). Toàn bộ nhánh quỹ
    // dưới đây so theo CẶP (cũ → mới), không so theo đích một mình.
    const trangThaiCu = item.trangThai;
    const nguoiDuyetCu = item.nguoiDuyet;
    const nguoiDuyetIdCu = item.nguoiDuyetId;
    const thoiDiemDuyetCu = item.thoiDiemDuyet;
    const laHanhDongDuyet = trangThai === 'da_duyet' || trangThai === 'tu_choi';

    if (laHanhDongDuyet) {
      // So theo userId của HỒ SƠ NHÂN VIÊN đứng tên đơn, không so theo
      // `nguoiDuyet` (chuỗi tên hiển thị, client tự gõ, không tin cậy được).
      const chuDon = await this.findEmployee(item.employeeId);
      const idNguoiGoi = String(nguoiThucHien?.id ?? '').trim();

      // Điều kiện cũ `chuDon.userId && idNguoiGoi && ...` fail-OPEN đúng vào
      // trường hợp dễ dựng nhất: hồ sơ chủ đơn không (còn) gắn tài khoản thì
      // toàn bộ vế trái là false và luật im lặng cho qua. Khi thiếu `userId`
      // để so, đổi sang so bằng hồ sơ nhân viên của người gọi thay vì bỏ
      // kiểm — xem `laChuDonTheoHoSo()`.
      const nguoiGoiLaChuDon = chuDon.userId
        ? Boolean(idNguoiGoi) && chuDon.userId === idNguoiGoi
        : await this.laChuDonTheoHoSo(item.employeeId, nguoiThucHien);

      if (nguoiGoiLaChuDon) {
        // Fail-closed kể cả khi người gọi có vaiTro ADMIN/quyền duyệt: quyền
        // duyệt KHÔNG đồng nghĩa được duyệt đơn của chính mình.
        throw new ForbiddenException({
          code: MA_LOI_DON_CHAM_CONG.KHONG_TU_DUYET_DON,
          message: 'Không được tự duyệt đơn của chính mình',
        });
      }
    }

    // (review round 1, CRITICAL) một số CẶP (cũ → mới) không có lối quỹ hợp
    // lệ trực tiếp — chặn TRƯỚC khi ghi `item.trangThai`, đừng để đơn đổi
    // trạng thái rồi mới báo lỗi (nếu không, phản hồi lỗi vẫn kèm một đơn đã
    // bị đổi trạng thái oan). Bảng đầy đủ (áp dụng cho đơn trừ quỹ — `donTruQuy`
    // (phep_nam) HOẶC `donTruQuyGio` (nghi_bu đã giữ chỗ quỹ giờ, Task 7);
    // giai_trinh/lam_them_gio/loaiNghi khác không bị ràng buộc gì):
    //
    //   cùng nhau            → không làm gì (idempotent, bấm đúp/retry)
    //   cho_duyet → da_duyet → chuyenSangDaDung
    //   cho_duyet → tu_choi  → nhaCho
    //   da_duyet  → tu_choi  → hoanTraDaDung
    //   tu_choi   → cho_duyet→ giuCho lại (thiếu số dư thì ném 409 — đúng)
    //   da_duyet  → cho_duyet→ CHẶN, 409 (đi qua tu_choi trước)
    //   tu_choi   → da_duyet → CHẶN, 409 (đi qua cho_duyet trước)
    const donTruQuy = this.laDonTruQuy(item) && !!item.phanBoQuy?.length;
    // Task 7 (P4.2a): đơn nghi_bu đã giữ chỗ quỹ giờ lúc nộp cùng chung hai
    // lối cấm này — da_duyet→cho_duyet và tu_choi→da_duyet không có hàm nào
    // trong QuyGio_Service khớp trực tiếp (giống hệt lý do đã chặn donTruQuy).
    const donTruQuyGio =
      item.loaiDon === 'nghi_bu' && !!item.phanBoQuyGio?.length;
    if (
      (donTruQuy || donTruQuyGio) &&
      ((trangThaiCu === 'da_duyet' && trangThai === 'cho_duyet') ||
        (trangThaiCu === 'tu_choi' && trangThai === 'da_duyet'))
    ) {
      throw new ConflictException({
        code: MA_LOI_DON_CHAM_CONG.CHUYEN_TRANG_THAI_KHONG_HOP_LE,
        message: `Không thể chuyển đơn từ "${trangThaiCu}" thẳng sang "${trangThai}". Hãy chuyển qua trạng thái trung gian trước (ví dụ từ chối rồi mới đưa lại chờ duyệt).`,
      });
    }

    item.trangThai = trangThai;
    if (nguoiDuyet !== undefined) {
      item.nguoiDuyet = nguoiDuyet;
    }
    if (laHanhDongDuyet) {
      // Vết duyệt: ai bấm và lúc nào — chỉ ghi khi đây thực sự là hành động
      // duyệt/từ chối, không ghi đè khi trạng thái bị trả lại cho_duyet.
      item.nguoiDuyetId = String(nguoiThucHien?.id ?? '').trim() || undefined;
      item.thoiDiemDuyet = new Date().toISOString();
    }

    const daLuu = await this.repo.save(item);

    // P3.8: đơn phep_nam đã giữ chỗ NGAY LÚC NỘP (create()) — ở đây chỉ
    // CHUYỂN trạng thái phần đã giữ đó theo CẶP (cũ → mới), luôn thao tác
    // trên `item.phanBoQuy` (snapshot lúc nộp), KHÔNG BAO GIỜ tính lại phân
    // bổ mới. Giữa lúc nộp và lúc duyệt quỹ có thể đã đóng (31/3) hoặc được
    // cấp thêm — tính lại ở đây sẽ trừ nhầm quỹ khác với quỹ đã hứa lúc nộp.
    //
    // `trangThaiCu !== trangThai` (bấm đúp/retry) là NO-OP có chủ đích —
    // xem bảng ở trên.
    if (donTruQuy && trangThaiCu !== trangThai) {
      const requestId = String((daLuu as any)._id);
      const nguoiThucHienId = String(nguoiThucHien?.id ?? '');

      try {
        if (trangThaiCu === 'cho_duyet' && trangThai === 'da_duyet') {
          await this.quyPhep_Service.chuyenSangDaDung(
            item.employeeId,
            item.phanBoQuy!,
            requestId,
            nguoiThucHienId,
          );
        } else if (trangThaiCu === 'cho_duyet' && trangThai === 'tu_choi') {
          await this.quyPhep_Service.nhaCho(
            item.employeeId,
            item.phanBoQuy!,
            requestId,
            nguoiThucHienId,
          );
        } else if (trangThaiCu === 'da_duyet' && trangThai === 'tu_choi') {
          await this.quyPhep_Service.hoanTraDaDung(
            item.employeeId,
            item.phanBoQuy!,
            requestId,
            nguoiThucHienId,
          );
        } else if (trangThaiCu === 'tu_choi' && trangThai === 'cho_duyet') {
          await this.quyPhep_Service.giuCho(
            item.employeeId,
            item.phanBoQuy!,
            requestId,
            nguoiThucHienId,
          );
        }
      } catch (e) {
        // (review round 1, IMPORTANT 2 — vẫn giữ nguyên ở fix round 2): quỹ
        // hỏng SAU KHI trạng thái đã lưu thì phải khôi phục NGUYÊN VẸN trạng
        // thái/vết duyệt cũ rồi lưu lại. Không chỉ để tránh "nghỉ phép miễn
        // phí" — đây còn là điều kiện để RETRY hoạt động: nếu không khôi
        // phục, `trangThaiCu` đọc lại ở lần gọi sau sẽ trùng `trangThai` đích
        // (đơn đã "tới nơi" theo DB dù quỹ chưa xong), nhánh no-op phía trên
        // (`trangThaiCu !== trangThai`) sẽ ÂM THẦM bỏ qua toàn bộ dispatch
        // quỹ ở lần bấm lại — không còn đường nào kích lại được nữa.
        //
        // (P3.8 fix round 2, Part B): `chuyenSangDaDung`/`hoanTraDaDung`
        // (hai nhánh có ghi sổ) giờ đã tự chống trùng qua sổ
        // (`soRongDaDung` trong quy-phep.service.ts) — khôi phục trạng thái
        // rồi ĐỂ HR BẤM LẠI là đủ, KHÔNG cần bù gì thêm ở đây: lần bấm lại
        // sẽ bỏ qua đúng phần quỹ đã áp dụng thành công và chỉ áp dụng nốt
        // phần còn thiếu.
        //
        // `giuCho`/`nhaCho` (hai nhánh KHÔNG ghi sổ) thì KHÔNG có dấu vết gì
        // để mà chống trùng khi retry — nếu một trong hai hỏng giữa chừng
        // trên phanBoQuy ≥2 phần tử (giữ/nhả xong quỹ 1 rồi mới hỏng ở quỹ
        // 2), phần đã giữ/nhả đó sẽ kẹt vĩnh viễn nếu không bù ngay. Bù
        // best-effort bằng cách gọi hàm NGƯỢC LẠI trên TOÀN BỘ phanBoQuy —
        // đây là bù GẦN ĐÚNG (giống create()/huyDonCuaToi()), KHÔNG PHẢI
        // transaction: nếu chính lời gọi bù cũng hỏng, phần dở dang vẫn có
        // thể sót lại (cùng họ giới hạn "không transaction" mà giuCho()/
        // nhaCho() đã tự nhận). Bọc try/catch RIÊNG, nuốt lỗi phụ — lỗi gốc
        // `e` mới là thứ được ném ra dưới.
        if (trangThaiCu === 'tu_choi' && trangThai === 'cho_duyet') {
          try {
            await this.quyPhep_Service.nhaCho(
              item.employeeId,
              item.phanBoQuy!,
              requestId,
              nguoiThucHienId,
            );
          } catch {
            // nuốt lỗi phụ — xem giải thích ở trên.
          }
        } else if (trangThaiCu === 'cho_duyet' && trangThai === 'tu_choi') {
          try {
            await this.quyPhep_Service.giuCho(
              item.employeeId,
              item.phanBoQuy!,
              requestId,
              nguoiThucHienId,
            );
          } catch {
            // nuốt lỗi phụ — xem giải thích ở trên.
          }
        }

        item.trangThai = trangThaiCu;
        item.nguoiDuyet = nguoiDuyetCu;
        item.nguoiDuyetId = nguoiDuyetIdCu;
        item.thoiDiemDuyet = thoiDiemDuyetCu;
        await this.repo.save(item);
        throw e;
      }
    }

    // ── Quỹ giờ làm thêm (Task 7, P4.2a) ───────────────────────────────────
    // Đơn OT (lam_them_gio): tích quỹ lúc duyệt, thu hồi khi rời khỏi
    // da_duyet. Đơn nghỉ bù (nghi_bu): cùng bảng chuyển trạng thái đã dùng
    // cho quỹ phép ở trên — donTruQuyGio (khai ở guard phía trên) đã xác
    // nhận đơn này thực sự có phanBoQuyGio để mà chuyển. Một đơn chỉ có thể
    // là MỘT trong hai loại này, nên gộp chung một try/catch bên dưới không
    // bao giờ khiến cả hai khối cùng chạy trên một đơn.
    //
    // (review round 1, CRITICAL — tái phát defect y hệt khối quỹ phép ở
    // trên đã tự vá, xem comment ở đó): bản trước KHÔNG bọc try/catch cho
    // hai khối này — nếu quỹ giờ hỏng SAU KHI `trangThai` đã lưu, đơn kẹt ở
    // trạng thái MỚI trong khi quỹ chưa hề đổi:
    //   - `tu_choi → cho_duyet` trên đơn nghi_bu: `giuCho()` ném
    //     KHONG_DU_SO_DU (giờ đã bị tiêu chỗ khác trong lúc đơn chờ) → đơn
    //     sống ở `cho_duyet` mang `phanBoQuyGio` mà quỹ CHƯA HỀ giữ lại;
    //     duyệt đơn đó sau này chạy `chuyenSangDaDung()` như bình thường
    //     (guard `demRongTheoLyDo` đọc 0, không skip) và cộng thẳng
    //     `soGioDaDung += g` — tiêu giờ chưa từng được giữ.
    //   - `da_duyet → tu_choi` trên đơn OT mà giờ tích đã bị tiêu một phần:
    //     `thuHoiTichTuDonOt()` ném DA_TIEU_KHONG_THU_HOI_DUOC (message tự
    //     nói "xử lý tay TRƯỚC KHI hủy đơn") nhưng đơn đã bị từ chối rồi —
    //     và một lần bấm lại sau đó không còn kích lại được nữa, vì
    //     `trangThaiCu` đọc lại lúc đó đã là `tu_choi`, không còn khớp
    //     nhánh `da_duyet → khác` ở trên.
    //
    // (review nhánh, IMPORTANT 5 — SỬA lập luận cũ ở đây). Bản trước viết
    // "KHÔNG cần bù best-effort, vì cả sáu hàm quỹ giờ đều tự chống trùng
    // qua sổ ròng". Lập luận đó đúng cho RETRY nhưng KHÔNG đúng cho ÁP DỤNG
    // MỘT PHẦN — và chính cơ chế tự chống trùng lại là thứ khoá chặt trạng
    // thái hỏng lại:
    //   `tu_choi → cho_duyet` trên đơn nghi_bu có `phanBoQuyGio` trải 2 kỳ;
    //   `giuCho()` giữ xong kỳ 1 rồi ném ở kỳ 2. Trạng thái được khôi phục
    //   về `tu_choi`, nhưng chỗ giữ ở kỳ 1 VẪN CÒN. HR bấm lại:
    //   `demRongTheoLyDo()` thấy kỳ 1 ròng > 0 nên BỎ QUA kỳ 1, kỳ 2 lại
    //   hỏng — y nguyên trạng thái cũ. `remove()` trên đơn `tu_choi` không
    //   đi vào nhánh nhả nào, `huyDonCuaToi()` chỉ nhận đơn `cho_duyet`, và
    //   `doiSoat()` KHÔNG thấy gì bất thường (một chỗ giữ bị rò vẫn nhất
    //   quán giữa sổ và số dư). Chỉ sửa thẳng DB mới gỡ được.
    //
    // Nên bù y hệt khối quỹ phép ở trên: gọi hàm NGƯỢC LẠI trên TOÀN BỘ
    // phân bổ trước khi khôi phục trạng thái. An toàn trên kỳ CHƯA bị đụng:
    // `nhaCho()` kẹp `Math.max(0, …)` và `apDung(boQuaKhiKhongDoi = true)`
    // bỏ qua cả `save()` lẫn `ghiSo()` khi không có gì thật để nhả; `giuCho()`
    // thì tự bỏ qua kỳ đang còn ròng > 0. Bù xong, dòng sổ `huy_nghi_bu` đưa
    // ròng của kỳ 1 về 0 nên lần HR bấm lại giữ chỗ được ĐẦY ĐỦ cả hai kỳ.
    //
    // Hai nhánh `chuyenSangDaDung`/`hoanTraDaDung` CỐ Ý không bù — giữ đúng
    // hình dạng mà `quy-phep.service.ts` đã chọn và ghi lý do cho cặp tương
    // ứng của nó: chúng dùng chung lý do sổ `huy_nghi_bu` với cặp giữ/nhả,
    // nên một lời gọi bù ở đây sẽ làm sai bộ đếm chống trùng của `giuCho()`.
    // Chúng cũng không rò chỗ giữ: lần bấm lại bỏ qua đúng phần đã áp dụng
    // và làm nốt phần còn thiếu.
    //
    // Bọc try/catch RIÊNG, nuốt lỗi phụ — lỗi gốc `e` mới là thứ ném ra
    // dưới. Đây là bù GẦN ĐÚNG, KHÔNG PHẢI transaction (cùng họ giới hạn
    // "không transaction" mà `giuCho()` đã tự nhận trong doc-comment).
    try {
      if (item.loaiDon === 'lam_them_gio') {
        if (trangThaiCu !== 'da_duyet' && trangThai === 'da_duyet') {
          await this.quyGio_Service.tichTuDonOt({
            employeeId: item.employeeId,
            employeeName: item.employeeName,
            employeeCode: item.employeeCode,
            ngay: item.ngay,
            soGioOt: item.soGioOt ?? 0,
            loaiNgayOt: item.loaiNgayOt ?? 'ngay_thuong',
            phanBoOt: item.phanBoOt,
            requestId: String((daLuu as any)._id),
            nguoiThucHien: String(nguoiThucHien?.id ?? ''),
          });
        } else if (trangThaiCu === 'da_duyet' && trangThai !== 'da_duyet') {
          await this.quyGio_Service.thuHoiTichTuDonOt(
            String((daLuu as any)._id),
            item.employeeId,
            String(nguoiThucHien?.id ?? ''),
          );
        }
      }

      if (donTruQuyGio) {
        const requestId = String((daLuu as any)._id);
        const nguoiThucHienId = String(nguoiThucHien?.id ?? '');
        const p = item.phanBoQuyGio!;

        if (trangThaiCu === 'cho_duyet' && trangThai === 'da_duyet') {
          await this.quyGio_Service.chuyenSangDaDung(
            item.employeeId,
            p,
            requestId,
            nguoiThucHienId,
          );
        } else if (trangThaiCu === 'cho_duyet' && trangThai === 'tu_choi') {
          await this.quyGio_Service.nhaCho(
            item.employeeId,
            p,
            requestId,
            nguoiThucHienId,
          );
        } else if (trangThaiCu === 'da_duyet' && trangThai === 'tu_choi') {
          await this.quyGio_Service.hoanTraDaDung(
            item.employeeId,
            p,
            requestId,
            nguoiThucHienId,
          );
        } else if (trangThaiCu === 'tu_choi' && trangThai === 'cho_duyet') {
          await this.quyGio_Service.giuCho(
            item.employeeId,
            p,
            requestId,
            nguoiThucHienId,
          );
        }
      }
    } catch (e) {
      // Bù best-effort cho hai nhánh giữ/nhả — xem lý do đầy đủ ở khối
      // comment ngay trên `try`.
      if (donTruQuyGio) {
        const requestId = String((daLuu as any)._id);
        const nguoiThucHienId = String(nguoiThucHien?.id ?? '');
        const p = item.phanBoQuyGio!;

        if (trangThaiCu === 'tu_choi' && trangThai === 'cho_duyet') {
          try {
            // `chiPhanDaGiuCuaDon = true`: nhả TRÊN TOÀN BỘ phân bổ nhưng
            // chỉ ở những kỳ mà SỔ xác nhận đơn NÀY đang giữ chỗ. Nhả mù sẽ
            // ăn mất chỗ giữ của đơn KHÁC ở kỳ chưa bị đụng
            // (`soGioDangChoDuyet` là bộ đếm dùng chung theo quỹ) — mà kỳ đó
            // gần như chắc chắn đang có đơn khác giữ, vì đó chính là lý do
            // `giuCho()` vừa ném ở đấy. Xem doc-comment `nhaCho()`.
            await this.quyGio_Service.nhaCho(
              item.employeeId,
              p,
              requestId,
              nguoiThucHienId,
              true,
            );
          } catch {
            // nuốt lỗi phụ — xem giải thích ở trên.
          }
        } else if (trangThaiCu === 'cho_duyet' && trangThai === 'tu_choi') {
          try {
            await this.quyGio_Service.giuCho(
              item.employeeId,
              p,
              requestId,
              nguoiThucHienId,
            );
          } catch {
            // nuốt lỗi phụ — xem giải thích ở trên.
          }
        }
      }

      // Khôi phục NGUYÊN VẸN trạng thái/vết duyệt cũ — cùng lý do đã ghi ở
      // khối quỹ phép phía trên: không chỉ tránh "nghỉ bù/OT miễn phí", mà
      // còn là điều kiện để HR BẤM LẠI kích được đúng lời gọi quỹ vừa hỏng.
      item.trangThai = trangThaiCu;
      item.nguoiDuyet = nguoiDuyetCu;
      item.nguoiDuyetId = nguoiDuyetIdCu;
      item.thoiDiemDuyet = thoiDiemDuyetCu;
      await this.repo.save(item);
      throw e;
    }

    return daLuu;
  }

  /**
   * Tự huỷ đơn CỦA CHÍNH MÌNH — route `DELETE /don-cham-cong/cua-toi/:id`.
   * `employeeId` truyền vào PHẢI suy từ token ở controller (qua
   * `NhanVien_Service.resolveEmployeeFromUser`), không phải tham số client
   * tự khai — nếu không thì test "chặn huỷ đơn người khác" bên dưới vô nghĩa.
   *
   * Hai điều kiện, thiếu một là chặn:
   *  - đơn phải đứng tên `employeeId` của người gọi;
   *  - đơn còn `cho_duyet` — đã `da_duyet`/`tu_choi` thì không cho tự huỷ,
   *    tránh xoá dấu vết một quyết định đã có hiệu lực (vd đã tính lương).
   */
  async huyDonCuaToi(id: string, employeeId: string): Promise<void> {
    const item = await this.findOne(id);

    if (item.employeeId !== employeeId) {
      throw new ForbiddenException({
        code: MA_LOI_DON_CHAM_CONG.KHONG_PHAI_DON_CUA_MINH,
        message: 'Không thể huỷ đơn của người khác',
      });
    }

    if (item.trangThai !== 'cho_duyet') {
      throw new ForbiddenException({
        code: MA_LOI_DON_CHAM_CONG.DON_DA_XU_LY_KHONG_THE_HUY,
        message: 'Chỉ có thể tự huỷ đơn đang ở trạng thái chờ duyệt',
      });
    }

    // P3.8: đơn tới đây chắc chắn còn cho_duyet (đã kiểm ở trên) — nghĩa là
    // chưa từng chuyenSangDaDung, chỉ có phần "giữ chỗ" cần nhả lại.
    //
    // (review round 1, IMPORTANT 4): PHẢI kiểm `item.isActive` TRƯỚC khi ghi
    // đè — `findOne()` không lọc isActive, nên đơn này có thể đã bị vô hiệu
    // hoá từ trước (vd `remove()` gọi trước đó, hoặc `huyDonCuaToi()` bị gọi
    // lặp/đua) mà `trangThai` vẫn còn `cho_duyet`. `nhaCho()` chạy lần thứ
    // hai trên cùng phanBoQuy sẽ ăn nhầm chỗ giữ của một đơn KHÁC đang giữ
    // đúng quỹ đó — `soNgayDangChoDuyet` là bộ đếm DÙNG CHUNG theo quỹ,
    // không tách riêng theo đơn.
    const canNhaCho =
      item.isActive && this.laDonTruQuy(item) && !!item.phanBoQuy?.length;
    const phanBoQuyGoc = item.phanBoQuy;

    // Task 7 (P4.2a review, CRITICAL 2): cùng lý do hệt canNhaCho ở trên,
    // cho quỹ giờ — đơn nghi_bu tự huỷ lúc còn cho_duyet chỉ mới GIỮ CHỖ
    // (giuCho() lúc create()), chưa từng chuyenSangDaDung, nên chỉ cần nhả.
    // Thiếu khối này thì soGioDangChoDuyet của quỹ đó bị KẸT VĨNH VIỄN —
    // doiSoat() (Task 12) so ledger với balance, và một hold bị kẹt vẫn
    // NHẤT QUÁN giữa hai bên (không lệch số) nên không bị phát hiện.
    const canNhaChoQuyGio =
      item.isActive && item.loaiDon === 'nghi_bu' && !!item.phanBoQuyGio?.length;
    const phanBoQuyGioGoc = item.phanBoQuyGio;

    item.isActive = false;
    if (canNhaCho) {
      // Xoá snapshot NGAY khi đánh dấu đã xử lý — lớp phòng thủ cấu trúc thứ
      // hai: dù có chỗ nào đó quên kiểm `isActive` trước khi gọi lại, sau
      // dòng này `item.phanBoQuy` rỗng nên không còn gì để mà nhả lần hai.
      item.phanBoQuy = undefined;
    }
    if (canNhaChoQuyGio) {
      item.phanBoQuyGio = undefined;
    }
    await this.repo.save(item);

    if (canNhaCho) {
      await this.quyPhep_Service.nhaCho(
        employeeId,
        phanBoQuyGoc!,
        id,
        employeeId,
      );
    }
    if (canNhaChoQuyGio) {
      await this.quyGio_Service.nhaCho(
        employeeId,
        phanBoQuyGioGoc!,
        id,
        employeeId,
      );
    }
  }

  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(filter?: DonChamCongFilter): Promise<AttendanceRequest[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.loaiDon) where.loaiDon = filter.loaiDon;
    if (filter?.trangThai) where.trangThai = filter.trangThai;

    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<AttendanceRequest> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy đơn chấm công với ID ${id}`);
    }

    return item;
  }

  /**
   * Task 4 (đóng "cửa thứ hai"): PUT :id KHÔNG ĐƯỢC PHÉP đổi trangThai dưới
   * bất kỳ hình thức nào — trạng thái đơn CHỈ được di chuyển qua
   * `updateStatus()` (route `PATCH :id/trang-thai`), nơi duy nhất kiểm luật
   * KHONG_TU_DUYET_DON và ghi vết nguoiDuyetId/thoiDiemDuyet. Trước đây
   * `Object.assign(item, dto)` ghi thẳng mọi trường của dto — kể cả
   * `trangThai` — xuống entity rồi lưu, nên một ADMIN đồng thời là chủ đơn
   * gọi PUT với `{ trangThai: 'da_duyet' }` tự duyệt được đơn của chính
   * mình, né hoàn toàn luật vừa vá ở updateStatus(). Một cánh cửa khoá kỹ mà
   * còn cửa thứ hai không khoá thì coi như không khoá.
   *
   * Cách vá phải mang tính CẤU TRÚC, không phải "nếu có thì xoá": tách hẳn
   * `trangThai` ra khỏi dto bằng destructuring trước khi merge vào entity —
   * biến `_trangThaiBiBoQua` không được dùng ở đâu khác, nên trường này về
   * mặt code không có đường nào chạm tới `repo.save` từ nhánh update(). Nếu
   * sau này ai thêm trường tự tính khác cần cùng cách xử lý, làm y hệt ở
   * đây thay vì thêm điều kiện rẽ nhánh dễ quên.
   *
   * vòng sửa 2 (task-4-fix2): cửa thứ hai chưa đóng hết — `employeeId` cũng
   * phải bóc ra cùng chỗ. Luật KHONG_TU_DUYET_DON đọc chủ đơn TẠI THỜI ĐIỂM
   * DUYỆT (`findEmployee(item.employeeId)` trong `updateStatus()`), nên nếu
   * PUT còn sửa được `employeeId`, chủ đơn trở thành một đầu vào có thể thao
   * túng của chính luật đó: đổi đơn sang tên đồng nghiệp → nhờ duyệt (hoặc tự
   * duyệt vì đã không còn là "chính mình") → đổi employeeId về lại tên mình —
   * ba bước này đi vòng hoàn toàn qua luật chặn tự duyệt mà không route nào
   * phát hiện, vì luật chỉ kiểm tra đúng một lần lúc PATCH :id/trang-thai.
   * Chủ đơn được chốt lúc tạo (`create()`); muốn đổi người đứng tên thì huỷ
   * đơn và tạo đơn mới, không sửa qua PUT.
   *
   * `nguoiDuyet` (tên hiển thị) bóc ra cùng lý do: nửa đáng tin của vết duyệt
   * là `nguoiDuyetId`, chỉ `updateStatus()` được ghi. Nếu PUT ghi được nửa
   * còn lại (`nguoiDuyet`) một cách độc lập, tên hiển thị FE đọc và id soát
   * vết có thể lệch nhau mà không có dấu hiệu gì.
   *
   * `phanBoQuy` (P3.8) bóc ra cùng lý do một lần nữa: đây là snapshot BACKEND
   * TỰ TÍNH lúc `create()`, approve/reject/cancel đều đọc lại nguyên snapshot
   * đó — PUT không được phép sửa nó dưới bất kỳ hình thức nào. Trên thực tế
   * `UpdateDonChamCongDto` còn không khai field này (forbidNonWhitelisted ở
   * main.ts đã chặn ngay tại pipe), nên bóc ở đây là phòng thủ theo chiều
   * sâu — lỡ sau này DTO/whitelist bị nới lỏng thì service vẫn không mở
   * đường cho việc đó.
   *
   * (P3.8 review round 4, CRITICAL 1): bóc-và-bỏ như trên KHÔNG đủ cho năm
   * trường còn lại `loaiDon`/`loaiNghi`/`ngay`/`denNgay`/`buoi` — khác với
   * `trangThai`/`employeeId`/`nguoiDuyet`/`phanBoQuy` (những trường PUT
   * không BAO GIỜ được phép đụng), năm trường này là dữ liệu NGHIỆP VỤ hợp
   * lệ để sửa — CHỈ SAI khi đơn đang trừ quỹ, vì `soNgayNghi`/`phanBoQuy`
   * (backend tính lúc `create()`) sẽ đứng yên trong khi ngày/loại đổi. Ba lối
   * khai thác thật, đều là "sửa sau khi đã qua cửa kiểm tra lúc nộp":
   *
   *   (a) đơn phép năm 1 ngày (giữ 1 ngày quỹ) → PUT kéo dài `denNgay` thêm
   *       14 ngày. `soNgayNghi`/`phanBoQuy` vẫn là 1 → nghỉ 15 ngày, trừ 1.
   *   (b) đơn `khong_luong` (không giữ chỗ gì, `phanBoQuy` rỗng) → PUT đổi
   *       `loaiNghi` sang `phep_nam`. Lúc duyệt, `laDonTruQuy(item)` đúng
   *       nhưng `phanBoQuy` rỗng từ đầu → duyệt "phép năm" mà quỹ chưa từng
   *       bị đụng tới.
   *   (c) đơn `phep_nam` ĐÃ giữ N ngày (`phanBoQuy` có dữ liệu) → PUT đổi
   *       `loaiNghi` sang `khong_luong`. Từ đây `laDonTruQuy(item)` luôn
   *       false trên MỌI đường sau đó (`updateStatus`, `huyDonCuaToi`,
   *       `remove`) → N ngày đã giữ không bao giờ được nhả. Giữ chỗ KHÔNG
   *       ghi sổ (xem doc-comment `giuCho()` bên quy-phep.service.ts) nên
   *       `doiSoat()` CẤU TRÚC không thấy được số ngày kẹt này để mà báo.
   *
   * Chặn bằng 409 CẤU TRÚC (kiểm CẢ hai đầu — trạng thái trừ quỹ TRƯỚC và
   * SAU khi áp dụng dto, vì ca (b) chỉ trừ quỹ ở đầu SAU) thay vì cố "tính
   * lại cho khớp": tính lại đòi nhả-rồi-giữ-lại không nguyên tử, rủi ro y hệt
   * giới hạn "không transaction" mà `giuCho()`/`nhaCho()` đã tự nhận. Người
   * dùng phải huỷ đơn rồi nộp lại — `create()` tính lại từ đầu, sạch.
   *
   * (P3.8 review round 5 — vá hồi quy round 4): guard bản đầu so SỰ CÓ MẶT
   * của khoá (`truong in phanConLaiDuocPhepSua`), không so GIÁ TRỊ có đổi
   * hay không. Đường PUT duy nhất của sản phẩm — `dungDtoQuanTri()` ở
   * `fe/.../donChamCongForm.convert.ts` — LUÔN gửi kèm `loaiDon`/`ngay`,
   * cộng `denNgay`/`loaiNghi`/`buoi` khi là `nghi_phep`, bất kể HR có sửa
   * chúng hay không (form gửi lại NGUYÊN state hiện tại, không phải diff).
   * Nên `doiTruongAnhHuongQuy` kiểu "có mặt" luôn đúng với MỌI PUT thật trên
   * một đơn `phep_nam` — kể cả khi HR chỉ sửa `lyDo` — khoá hẳn nút Sửa cho
   * loại đơn này. Đổi sang so GIÁ TRỊ: một khoá chỉ tính là "đổi" khi nó vừa
   * CÓ MẶT trong dto vừa khác giá trị đang có trên `item`. Ba kịch bản khai
   * thác (a)(b)(c) ở trên đều đổi GIÁ TRỊ THẬT nên vẫn bị chặn nguyên; đơn
   * chỉ đổi `lyDo` (giá trị 5 trường này giữ nguyên) thì đi qua bình thường.
   */
  private static readonly TRUONG_ANH_HUONG_QUY = [
    'loaiDon',
    'loaiNghi',
    'ngay',
    'denNgay',
    'buoi',
  ] as const;

  /**
   * Task 7b (gap 2a): tập trường tương đương `TRUONG_ANH_HUONG_QUY` ở trên,
   * cho quỹ giờ — `soNgayNghi`/`phanBoQuy` (quỹ phép) đứng yên khi ngày/loại
   * đổi qua PUT thì `soGioNghiBu`/`phanBoQuyGio` (nghi_bu) và `soGioOt`/
   * `heSoOt`/`loaiNgayOt` (OT đã tích) cũng đứng yên y hệt — cùng một lớp
   * lỗi, khác trường vì khác luật tính (`tinhSoGioOt`/`tinhSoNgayNghi` dùng
   * `gioTu`/`gioDen`/`kieuNghi` bên cạnh `ngay`/`denNgay`/`buoi` đã có).
   * `loaiDon` có mặt vì cùng lý do round 4 CRITICAL 1 (c) của quỹ phép: nếu
   * thiếu, PUT đổi `loaiDon` ra khỏi `nghi_bu`/`lam_them_gio` là đủ để
   * `laDonTruQuyGio(item)` sau đó luôn `false` trên MỌI đường xử lý sau này
   * (`updateStatus`, `huyDonCuaToi`, `remove`) — giữ chỗ/đã tích không bao
   * giờ được nhả/thu hồi nữa.
   */
  private static readonly TRUONG_ANH_HUONG_QUY_GIO = [
    'loaiDon',
    'kieuNghi',
    'ngay',
    'denNgay',
    'buoi',
    'gioTu',
    'gioDen',
  ] as const;

  async update(
    id: string,
    dto: UpdateDonChamCongDto,
  ): Promise<AttendanceRequest> {
    const item = await this.findOne(id);
    const {
      trangThai: _trangThaiBiBoQua,
      employeeId: _employeeIdBiBoQua,
      nguoiDuyet: _nguoiDuyetBiBoQua,
      phanBoQuy: _phanBoQuyBiBoQua,
      // Task 7b (gap 2b): phanBoQuy đã bị bóc ra ở trên (P3.8) — phanBoQuyGio
      // (Task 6) phải bị bóc CÙNG LÝ DO, không phải vì client thật sự gửi
      // được nó (forbidNonWhitelisted ở main.ts đã chặn tại pipe, xem comment
      // cùng chủ đề ở CreateDonChamCongDto/UpdateDonChamCongDto), mà để
      // phòng thủ theo chiều sâu đúng như phanBoQuy — lỡ whitelist bị nới
      // lỏng sau này thì service vẫn không mở đường.
      phanBoQuyGio: _phanBoQuyGioBiBoQua,
      ...phanConLaiDuocPhepSua
    } = dto as UpdateDonChamCongDto & {
      phanBoQuy?: unknown;
      phanBoQuyGio?: unknown;
    };

    const phanConLaiDuocPhepSuaAny = phanConLaiDuocPhepSua as Record<
      string,
      unknown
    >;
    const itemAny = item as unknown as Record<string, unknown>;
    const doiTruongAnhHuongQuy = DonChamCong_Service.TRUONG_ANH_HUONG_QUY.some(
      (truong) =>
        truong in phanConLaiDuocPhepSuaAny &&
        itemAny[truong] !== phanConLaiDuocPhepSuaAny[truong],
    );
    const truQuyTruocKhiSua = this.laDonTruQuy(item);
    const truQuySauKhiSua = this.laDonTruQuy({ ...item, ...phanConLaiDuocPhepSua });

    if (doiTruongAnhHuongQuy && (truQuyTruocKhiSua || truQuySauKhiSua)) {
      throw new ConflictException({
        code: MA_LOI_DON_CHAM_CONG.KHONG_THE_SUA_DON_TRU_QUY,
        message:
          'Đơn này ảnh hưởng tới quỹ phép năm nên không sửa trực tiếp ngày/loại nghỉ được. Hãy huỷ đơn rồi nộp lại đơn mới.',
      });
    }

    // Task 7b (gap 2a): cùng cấu trúc chặn hệt khối trên, cho quỹ giờ — kiểm
    // CẢ hai đầu (trạng thái đụng quỹ giờ TRƯỚC và SAU khi áp dụng dto),
    // đúng lý do đã ghi ở doc-comment TRUONG_ANH_HUONG_QUY_GIO.
    const doiTruongAnhHuongQuyGio =
      DonChamCong_Service.TRUONG_ANH_HUONG_QUY_GIO.some(
        (truong) =>
          truong in phanConLaiDuocPhepSuaAny &&
          itemAny[truong] !== phanConLaiDuocPhepSuaAny[truong],
      );
    const truQuyGioTruocKhiSua = this.laDonTruQuyGio(item);
    const truQuyGioSauKhiSua = this.laDonTruQuyGio({
      ...item,
      ...phanConLaiDuocPhepSua,
    });

    if (doiTruongAnhHuongQuyGio && (truQuyGioTruocKhiSua || truQuyGioSauKhiSua)) {
      throw new ConflictException({
        code: MA_LOI_DON_CHAM_CONG.KHONG_THE_SUA_DON_TRU_QUY,
        message:
          'Đơn này ảnh hưởng tới quỹ giờ làm thêm nên không sửa trực tiếp ngày/giờ/loại nghỉ được. Hãy huỷ đơn rồi nộp lại đơn mới.',
      });
    }

    // Task 7b (review round 2, IMPORTANT): một đơn lam_them_gio CÒN cho_duyet
    // được PHÉP sửa gioTu/gioDen/ngay qua PUT (guard ở trên chỉ chặn khi ĐÃ
    // duyệt — laDonTruQuyGio() coi OT chưa duyệt là chưa đụng quỹ). Nhưng
    // soGioOt/heSoOt/loaiNgayOt chỉ được tinhCacTruongSnapshot() tính MỘT LẦN
    // ở create() — PUT trước đây ghi thẳng gioTu/gioDen/ngay mới xuống mà để
    // snapshot cũ đứng yên. Duyệt sau đó tichTuDonOt() theo snapshot CŨ, lệch
    // với số giờ HR vừa nhìn thấy trên màn hình lúc bấm duyệt — tranh chấp
    // lương xuất hiện vài tháng sau mới lộ ra.
    //
    // Vá bằng TÍNH LẠI qua ĐÚNG một nguồn luật (tinhCacTruongSnapshot(), hàm
    // create() cũng dùng) — không chép công thức tinhSoGioOt()/suyHeSoOt()
    // lần hai ở đây. Chỉ tính lại khi THỰC SỰ cần (đơn (sẽ) là lam_them_gio
    // VÀ một trong ba trường nuôi công thức đó đổi giá trị) — PUT chỉ sửa
    // lyDo không nên trả thêm một lượt hỏi NgayLe_Service/EmployeeRepo vô ích.
    const loaiDonSauKhiSua =
      (phanConLaiDuocPhepSuaAny.loaiDon as string | undefined) ?? item.loaiDon;
    const doiTruongNuoiCongThucOt = (
      ['gioTu', 'gioDen', 'ngay'] as const
    ).some(
      (truong) =>
        truong in phanConLaiDuocPhepSuaAny &&
        itemAny[truong] !== phanConLaiDuocPhepSuaAny[truong],
    );

    let snapshotOtTinhLai: Partial<
      Pick<AttendanceRequest, 'soGioOt' | 'heSoOt' | 'loaiNgayOt'>
    > = {};
    if (loaiDonSauKhiSua === 'lam_them_gio' && doiTruongNuoiCongThucOt) {
      const emp = await this.findEmployee(item.employeeId);
      const dtoChoTinhLai = {
        ...item,
        ...phanConLaiDuocPhepSua,
      } as unknown as CreateDonChamCongDto;
      const ketQua = await this.tinhCacTruongSnapshot(dtoChoTinhLai, emp);
      snapshotOtTinhLai = {
        soGioOt: ketQua.soGioOt,
        heSoOt: ketQua.heSoOt,
        loaiNgayOt: ketQua.loaiNgayOt,
      };
    }

    // `snapshotOtTinhLai` ĐẶT SAU `phanConLaiDuocPhepSua` — dù DTO không có
    // ba trường này (backend tự tính, không nhận từ client, xem doc-comment
    // CreateDonChamCongDto), thứ tự này đảm bảo bản tính lại LUÔN thắng, kể
    // cả nếu whitelist bị nới lỏng sau này.
    Object.assign(item, phanConLaiDuocPhepSua, snapshotOtTinhLai);
    return this.repo.save(item);
  }

  /**
   * `nguoiThucHien` (P3.8, review round 1 — MINOR 5): tuỳ chọn, controller
   * truyền `req.user` xuống để ghi đúng tên người xoá vào sổ quỹ khi đơn bị
   * xoá là `phep_nam` đã `da_duyet` — `hoanTraDaDung()` là thao tác DUY NHẤT
   * trả ngày lại mà lại ghi `'he_thong'` nếu không có ai truyền vào. Không
   * bắt buộc: các call site khác (nếu có, ví dụ script dọn dữ liệu nội bộ)
   * vẫn gọi được `remove(id)` mà không phải sửa theo.
   */
  async remove(
    id: string,
    nguoiThucHien?: { id?: string; [k: string]: unknown },
  ): Promise<void> {
    const item = await this.findOne(id);
    // Chụp lại trạng thái/isActive TRƯỚC KHI xoá mềm.
    const trangThaiTruocKhiXoa = item.trangThai;
    const nguoiThucHienId =
      String(nguoiThucHien?.id ?? '').trim() || 'he_thong';
    // (review round 1, IMPORTANT 4): `findOne()` không lọc isActive, nên
    // `remove(id)` có thể chạy trên một đơn ĐÃ bị `huyDonCuaToi()` vô hiệu
    // hoá từ trước (vẫn `cho_duyet`, vẫn còn `phanBoQuy`) — nhánh quỹ dưới
    // đây phải bị bỏ qua trong trường hợp đó, nếu không `nhaCho()` chạy lần
    // hai sẽ ăn nhầm chỗ giữ của một đơn KHÁC đang giữ đúng quỹ đó
    // (`soNgayDangChoDuyet` dùng chung theo quỹ, không tách theo đơn).
    const canXuLyQuy =
      item.isActive && this.laDonTruQuy(item) && !!item.phanBoQuy?.length;
    const phanBoQuyGoc = item.phanBoQuy;

    // Task 7 (P4.2a review, CRITICAL 2): cùng lý do hệt canXuLyQuy ở trên,
    // cho quỹ giờ — HR xoá mềm một đơn nghi_bu phải trả quỹ giờ về đúng như
    // trước khi có đơn. Thiếu khối này, xoá một đơn nghi_bu ĐÃ DUYỆT để lại
    // soGioDaDung bị trừ oan vĩnh viễn — không đơn nào đứng tên số giờ đó
    // nữa, và doiSoat() (Task 12) không phát hiện được vì ledger vẫn khớp
    // balance (cả hai bên đều "quên" cùng một khoản như nhau).
    const canXuLyQuyGio =
      item.isActive && item.loaiDon === 'nghi_bu' && !!item.phanBoQuyGio?.length;
    const phanBoQuyGioGoc = item.phanBoQuyGio;

    // Task 7b (gap 1): đơn OT ĐÃ DUYỆT xoá mềm phải THU HỒI giờ đã tích —
    // mirror `canXuLyQuy`/`canXuLyQuyGio`, nhưng gọi TRƯỚC khi đánh dấu
    // isActive=false, khác hẳn hai khối kia. Lý do: `nhaCho()`/`hoanTraDaDung()`
    // (quỹ phép và quỹ giờ nghỉ bù) chỉ Math.max(0, …) kẹp — KHÔNG BAO GIỜ
    // business-fail — nên gọi chúng SAU khi soft-delete đã persist là an
    // toàn. `thuHoiTichTuDonOt()` thì KHÁC: nó CỐ Ý ném
    // DA_TIEU_KHONG_THU_HOI_DUOC khi giờ đã bị TIÊU một phần qua nghỉ bù
    // (message tự nói "xử lý tay TRƯỚC KHI hủy đơn"). Gọi nó SAU khi đã lưu
    // isActive=false (như hai khối kia) thì một lần ném lỗi ở đây để lại
    // đúng CÁI LEAK task này đang vá: đơn đã "biến mất" khỏi danh sách
    // (isActive=false) trong khi quỹ vẫn đứng nguyên giờ đã tích — mất luôn
    // cả đầu mối lẫn cách sửa tay. Gọi TRƯỚC: nếu ném lỗi, KHÔNG có gì được
    // ghi xuống DB (chưa `repo.save()` nào chạy) — đơn giữ nguyên
    // isActive=true, HR xử lý tay theo đúng hướng dẫn trong message rồi xoá
    // lại; không cần rollback vì chưa có gì để mà rollback.
    const canThuHoiOt =
      item.isActive &&
      item.loaiDon === 'lam_them_gio' &&
      trangThaiTruocKhiXoa === 'da_duyet';
    if (canThuHoiOt) {
      await this.quyGio_Service.thuHoiTichTuDonOt(
        id,
        item.employeeId,
        nguoiThucHienId,
      );
    }

    item.isActive = false;
    if (canXuLyQuy) {
      // Xoá snapshot NGAY — lớp phòng thủ cấu trúc thứ hai, xem giải thích
      // tương tự ở huyDonCuaToi().
      item.phanBoQuy = undefined;
    }
    if (canXuLyQuyGio) {
      item.phanBoQuyGio = undefined;
    }
    await this.repo.save(item);

    if (!canXuLyQuy && !canXuLyQuyGio) return;

    // P3.8: xoá mềm một đơn phep_nam phải trả quỹ về đúng như trước khi có
    // đơn — nhánh theo ĐÚNG trạng thái tại thời điểm xoá:
    //  - cho_duyet: đơn mới chỉ giữ chỗ, chưa từng trừ thật → nhả chỗ (nhaCho).
    //  - da_duyet: đơn đã trừ thật vào soNgayDaDung → phải hoàn (hoanTraDaDung),
    //    gọi nhaCho ở nhánh này sẽ không làm gì (phần giữ chỗ đã hết từ lúc
    //    duyệt) và để lại soNgayDaDung bị trừ oan vĩnh viễn.
    //  - tu_choi: đã nhaCho/hoanTraDaDung từ updateStatus() rồi, không đụng gì nữa.
    if (canXuLyQuy) {
      if (trangThaiTruocKhiXoa === 'cho_duyet') {
        await this.quyPhep_Service.nhaCho(
          item.employeeId,
          phanBoQuyGoc!,
          id,
          nguoiThucHienId,
        );
      } else if (trangThaiTruocKhiXoa === 'da_duyet') {
        await this.quyPhep_Service.hoanTraDaDung(
          item.employeeId,
          phanBoQuyGoc!,
          id,
          nguoiThucHienId,
        );
      }
    }

    // Task 7 (P4.2a): cùng bảng theo trạng thái như trên, cho quỹ giờ.
    if (canXuLyQuyGio) {
      if (trangThaiTruocKhiXoa === 'cho_duyet') {
        await this.quyGio_Service.nhaCho(
          item.employeeId,
          phanBoQuyGioGoc!,
          id,
          nguoiThucHienId,
        );
      } else if (trangThaiTruocKhiXoa === 'da_duyet') {
        await this.quyGio_Service.hoanTraDaDung(
          item.employeeId,
          phanBoQuyGioGoc!,
          id,
          nguoiThucHienId,
        );
      }
    }
  }
}
