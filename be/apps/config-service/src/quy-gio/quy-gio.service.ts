import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CauHinhLuong,
  OvertimeBalance,
  OvertimeBalanceEntry,
  PhanBoOt,
} from '@app/entities';
import {
  EPSILON_GIO,
  HeSoTichQuy,
  PhanBoQuyGio,
  QuyKhaDung,
  gioTichTuDonOt,
  hanDungCuaKy,
  lamTronGio,
  phanBoFifo,
} from './luat-quy-gio';
import {
  HE_SO_OT_MAC_DINH,
  KHUNG_GIO_DEM_MAC_DINH,
  UU_TIEN_LOAI_MAC_DINH,
} from '../don-cham-cong/luat-don';

/** Mã lỗi ổn định cho FE so khớp — KHÔNG so khớp câu chữ tiếng Việt. */
export const MA_LOI_QUY_GIO = {
  KHONG_DU_SO_DU: 'QUY_GIO_KHONG_DU_SO_DU',
  DA_TIEU_KHONG_THU_HOI_DUOC: 'QUY_GIO_DA_TIEU',
  /** CAS trượt liên tiếp — quỹ đang bị nhiều request sửa cùng lúc. */
  DANG_SUA_DONG_THOI: 'QUY_GIO_DANG_SUA_DONG_THOI',
} as const;

/** Số lần đọc-lại-tính-lại trước khi bỏ cuộc. 5 là quá đủ cho tranh chấp thật
 *  (hai người bấm nộp cùng giây); vượt 5 nghĩa là có gì đó sai hệ thống chứ
 *  không phải tranh chấp bình thường, và thử mãi chỉ kéo dài request. */
const SO_LAN_THU_LAI_CAS = 5;

interface CauHinhLamThemApDung {
  soGioMoiNgay: number;
  cheDoBu: string;
  heSoTra: Record<string, number>;
  heSoTichQuy: HeSoTichQuy;
  khungGioDem: { tu: string; den: string } | null;
  uuTienLoai: string[];
  soThangHanDung: number | null;
  khiHetHan: string;
}

@Injectable()
export class QuyGio_Service {
  private readonly logger = new Logger(QuyGio_Service.name);

  constructor(
    @InjectRepository(OvertimeBalance)
    private readonly repo: Repository<OvertimeBalance>,
    @InjectRepository(OvertimeBalanceEntry)
    private readonly soRepo: Repository<OvertimeBalanceEntry>,
    @InjectRepository(CauHinhLuong)
    private readonly cauHinhRepo: Repository<CauHinhLuong>,
  ) {}

  /**
   * Cấu hình làm thêm của tenant hiện tại, hoặc `null` khi công ty CHƯA khai.
   *
   * Chưa khai thì trả null chứ KHÔNG rơi về mặc định: hệ số tích sai là sai
   * thành giờ nghỉ thật của người lao động, và một mặc định im lặng ở đây
   * không ai phát hiện cho tới lúc đối soát.
   */
  private async layCauHinh(): Promise<CauHinhLamThemApDung | null> {
    const rows = await this.cauHinhRepo.find({});
    const ch: any = rows[0];
    if (!ch?.lamThem) return null;

    return {
      soGioMoiNgay: ch.soGioMoiNgay ?? 8,
      cheDoBu: ch.lamThem.cheDoBu,
      // Công ty đã khai `lamThem` từ P4.2a chưa có bốn trường của P4.2b — rơi
      // về mặc định thay vì `undefined`, để đơn nộp ngay sau deploy (trước khi
      // HR kịp vào lưu lại cấu hình) không chẻ ra hệ số NaN.
      heSoTra: ch.lamThem.heSoTra ?? { ...HE_SO_OT_MAC_DINH },
      heSoTichQuy: ch.lamThem.heSoTichQuy,
      khungGioDem: ch.lamThem.khungGioDem ?? { ...KHUNG_GIO_DEM_MAC_DINH },
      uuTienLoai: ch.lamThem.uuTienLoai ?? [...UU_TIEN_LOAI_MAC_DINH],
      soThangHanDung: ch.lamThem.soThangHanDung ?? null,
      khiHetHan: ch.lamThem.khiHetHan ?? 'quy_ra_tien',
    };
  }

  /**
   * Bảng hệ số + khung giờ đêm cho `chiaGioOtTheoLoai()`. `null` = công ty
   * CHƯA khai `lamThem` — nơi gọi giữ nguyên hành vi trước P4.2b (không chẻ),
   * đi qua đúng cửa `layCauHinh()` mà `tichTuDonOt()` dùng để quyết có tích
   * hay không, nên hai bên không bao giờ lệch pha về việc quỹ đã bật hay chưa.
   */
  async cauHinhChiaGio(): Promise<{
    heSoTra: Record<string, number>;
    heSoTichQuy: HeSoTichQuy;
    khungGioDem: { tu: string; den: string } | null;
    uuTienLoai: string[];
  } | null> {
    const ch = await this.layCauHinh();
    if (!ch) return null;
    const { heSoTra, heSoTichQuy, khungGioDem, uuTienLoai } = ch;
    return { heSoTra, heSoTichQuy, khungGioDem, uuTienLoai };
  }

  /** Số giờ của một ngày công — nơi gọi bên ngoài (đơn nghỉ bù) cần biết. */
  async soGioMoiNgay(): Promise<number> {
    return (await this.layCauHinh())?.soGioMoiNgay ?? 8;
  }

  /**
   * Công ty đã bật quỹ giờ làm thêm chưa (đã khai `lamThem`) — nơi gọi bên
   * ngoài (đơn nghỉ bù) PHẢI hỏi câu này TRƯỚC khi định giữ chỗ.
   *
   * Đi qua ĐÚNG một cửa `layCauHinh()` — cùng cửa `tichTuDonOt()` đã dùng để
   * quyết định có tích hay không (xem log "Bỏ qua tích quỹ giờ..." ở đó).
   * Tích và tiêu phải luôn đồng thanh trả lời "bật hay chưa": nếu nơi gọi tự
   * suy ra câu trả lời bằng cách khác (vd tự đọc thẳng trường khác trên
   * `CauHinhLuong`), hai bên có thể lệch pha — tiêu từ một quỹ CHƯA TỪNG được
   * tích (đúng lỗi rollout-blocker P4.2a: công ty chưa khai cấu hình mà
   * `nghi_bu` vẫn cố trừ quỹ trống, ném 409 cho MỌI đơn nghỉ bù ngay khi
   * deploy, chứ không đợi tới lúc HR thật sự bật tính năng).
   */
  async dangKichHoat(): Promise<boolean> {
    return (await this.layCauHinh()) !== null;
  }

  private async ghiSo(input: {
    balanceId: string;
    employeeId: string;
    kyTich: string;
    soGio: number;
    lyDo: string;
    requestId?: string;
    nguoiThucHien?: string;
    ghiChu?: string;
  }): Promise<void> {
    await this.soRepo.save(
      this.soRepo.create({
        ...input,
        // Sổ append-only là NGUỒN SỰ THẬT của `doiSoat()` — nếu số dư lưu 2
        // chữ số mà sổ lưu số thô, hai bên lệch nhau theo đúng phần đã làm
        // tròn và `doiSoat()` báo lệch trên quỹ hoàn toàn đúng.
        soGio: lamTronGio(input.soGio),
        thoiDiem: new Date().toISOString(),
      } as Partial<OvertimeBalanceEntry>),
    );
  }

  /**
   * ĐIỂM CHẶN LÀM TRÒN DUY NHẤT của số dư (review nhánh, IMPORTANT 2).
   *
   * Mọi đường ghi số dư trong service này đều đi qua đây trước khi `save()`
   * (`tichTuDonOt`, `thuHoiTichTuDonOt`, và cả bốn hàm vòng đời nghỉ bù qua
   * `apDung()`) — nên làm tròn ở đúng một chỗ này là đủ để không có con số
   * giờ thô nào chạm tới DB. Làm tròn cả ba trường cộng dồn chứ không chỉ
   * `soGioConLai`: `soGioTich += 6.999999…` lặp lại nhiều tháng sẽ trôi xa
   * dần, và `soGioTich` mới là con số HR đọc trên màn quỹ giờ.
   */
  private tinhLaiConLai(quy: OvertimeBalance): void {
    quy.soGioTich = lamTronGio(quy.soGioTich);
    quy.soGioDaDung = lamTronGio(quy.soGioDaDung);
    quy.soGioDangChoDuyet = lamTronGio(quy.soGioDangChoDuyet);
    quy.soGioConLai = lamTronGio(
      quy.soGioTich - quy.soGioDaDung - quy.soGioDangChoDuyet,
    );
  }

  /**
   * Các dòng sổ `duyet_don_ot`/`huy_don_ot` của một đơn — nguồn để tính RÒNG
   * (cùng cách `soRongDaDung()` bên `quy-phep.service.ts` làm cho quỹ phép).
   */
  private async donLienQuanOt(
    requestId: string,
    employeeId: string,
  ): Promise<OvertimeBalanceEntry[]> {
    return (await this.soRepo.find({ where: { requestId } as any })).filter(
      (d) =>
        d.employeeId === employeeId &&
        (d.lyDo === 'duyet_don_ot' || d.lyDo === 'huy_don_ot'),
    );
  }

  /**
   * RÒNG đã tích của một đơn, theo từng kỳ tích — `duyet_don_ot` +soGio,
   * `huy_don_ot` đã lưu sẵn -soGio nên cộng thẳng là ra ròng.
   *
   * Ròng > 0 ở một kỳ nghĩa là đơn này đang có giờ tích CÒN HIỆU LỰC ở kỳ đó
   * (chưa từng thu hồi, hoặc đã tích lại sau khi thu hồi). Ròng <= 0 nghĩa là
   * chưa từng tích, hoặc đã thu hồi xong — cả hai đều là "không có gì để làm
   * lại", dùng để chặn double-apply ở cả hai chiều tích/thu hồi.
   */
  private async rongTichTheoKy(
    requestId: string,
    employeeId: string,
  ): Promise<Map<string, number>> {
    const ds = await this.donLienQuanOt(requestId, employeeId);
    const theoKy = new Map<string, number>();
    for (const d of ds) {
      theoKy.set(d.kyTich, (theoKy.get(d.kyTich) ?? 0) + d.soGio);
    }
    return theoKy;
  }

  /**
   * Tích giờ vào quỹ khi một đơn làm thêm được duyệt.
   *
   * Không tích ở chế độ `chi_tien` (giờ đó đi ra tiền, tích nữa là trả hai
   * lần) và không tích khi công ty chưa khai cấu hình.
   */
  async tichTuDonOt(input: {
    employeeId: string;
    employeeName?: string;
    employeeCode?: string;
    ngay: string;
    soGioOt: number;
    loaiNgayOt: string;
    /** P4.2b — có thì cộng theo từng phần bằng hệ số snapshot trên đơn. */
    phanBoOt?: PhanBoOt[];
    requestId: string;
    nguoiThucHien: string;
  }): Promise<void> {
    const cauHinh = await this.layCauHinh();
    if (!cauHinh) {
      this.logger.warn(
        `Bỏ qua tích quỹ giờ cho đơn ${input.requestId}: công ty chưa khai cấu hình làm thêm`,
      );
      return;
    }
    if (cauHinh.cheDoBu === 'chi_tien') return;

    const soGio = gioTichTuDonOt({
      soGioOt: input.soGioOt,
      loaiNgayOt: input.loaiNgayOt,
      heSoTichQuy: cauHinh.heSoTichQuy,
      phanBoOt: input.phanBoOt,
    });
    if (soGio <= 0) return;

    const kyTich = input.ngay.slice(0, 7);

    // (chống trùng): đơn này đã tích cho đúng kỳ này và CHƯA bị thu hồi (ròng
    // > 0) thì gọi lại — bấm hai lần, retry sau lỗi mạng — phải là no-op.
    // Không chặn thì cộng giờ hai lần và ghi hai dòng sổ `duyet_don_ot` cho
    // cùng một sự kiện thật; đây đúng bẫy round 3 mà `chuyenSangDaDung()` bên
    // `quy-phep.service.ts` đã vá cho quỹ phép.
    const rongTheoKy = await this.rongTichTheoKy(
      input.requestId,
      input.employeeId,
    );
    if ((rongTheoKy.get(kyTich) ?? 0) > 0) return;

    let quy = await this.repo.findOne({
      where: { employeeId: input.employeeId, kyTich } as any,
    });

    if (!quy) {
      quy = this.repo.create({
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        employeeCode: input.employeeCode,
        kyTich,
        soGioTich: 0,
        soGioDaDung: 0,
        soGioDangChoDuyet: 0,
        soGioConLai: 0,
        hanDung: hanDungCuaKy(kyTich, cauHinh.soThangHanDung),
        trangThai: 'dang_hieu_luc',
        isActive: true,
      } as Partial<OvertimeBalance>);
    }

    quy.soGioTich += soGio;
    this.tinhLaiConLai(quy);
    const daLuu = await this.repo.save(quy);

    await this.ghiSo({
      balanceId: String((daLuu as any)._id),
      employeeId: input.employeeId,
      kyTich,
      soGio,
      lyDo: 'duyet_don_ot',
      requestId: input.requestId,
      nguoiThucHien: input.nguoiThucHien,
    });
  }

  /**
   * Thu hồi giờ đã tích khi một đơn OT đã duyệt bị hủy/từ chối.
   *
   * Giờ đã bị TIÊU rồi thì ném 409 và bắt HR xử lý tay — không tự đẩy quỹ
   * xuống âm, và không tự thu hồi ngược các đơn nghỉ bù đã duyệt (người ta
   * đã nghỉ thật rồi, không đòi lại được bằng một phép trừ).
   *
   * Duyệt theo RÒNG chứ không theo "có dòng duyet_don_ot chưa": sổ append-only
   * nên dòng duyet_don_ot của lần tích đầu KHÔNG BAO GIỜ biến mất, kể cả sau
   * khi đã thu hồi. Gọi lại thu hồi cho cùng `requestId` (retry, huỷ hai lần)
   * mà lặp theo dòng cũ sẽ trừ NHẦM vào quỹ hiện tại — quỹ đó lúc này có thể
   * đã được một đơn KHÁC bồi thêm cùng kỳ. Ròng <= 0 nghĩa là đơn này không
   * còn gì cần thu hồi ở kỳ đó → bỏ qua, không trừ, không ghi sổ.
   */
  async thuHoiTichTuDonOt(
    requestId: string,
    employeeId: string,
    nguoiThucHien: string,
  ): Promise<void> {
    const rongTheoKy = await this.rongTichTheoKy(requestId, employeeId);

    for (const [kyTich, rong] of rongTheoKy) {
      if (rong <= 0) continue;

      const quy = await this.repo.findOne({
        where: { employeeId, kyTich } as any,
      });
      if (!quy) continue;

      // `- EPSILON_GIO`: số dư và số cần thu hồi đều đã làm tròn 2 chữ số,
      // nhưng phép trừ ngay trước đó vẫn sinh dư nhị phân — so `<` trần trụi
      // sẽ chặn NHẦM một lần thu hồi hoàn toàn hợp lệ (còn đúng bằng cần).
      if (quy.soGioConLai < rong - EPSILON_GIO) {
        throw new ConflictException({
          code: MA_LOI_QUY_GIO.DA_TIEU_KHONG_THU_HOI_DUOC,
          message: `Giờ tích từ đơn này đã được nghỉ bù mất một phần (kỳ ${kyTich} chỉ còn ${lamTronGio(quy.soGioConLai)} giờ, cần thu hồi ${lamTronGio(rong)}). Xử lý tay trước khi hủy đơn.`,
        });
      }

      quy.soGioTich -= rong;
      this.tinhLaiConLai(quy);
      await this.repo.save(quy);

      await this.ghiSo({
        balanceId: String((quy as any)._id),
        employeeId,
        kyTich,
        soGio: -rong,
        lyDo: 'huy_don_ot',
        requestId,
        nguoiThucHien,
      });
    }
  }

  async layQuyCuaNhanVien(employeeId: string): Promise<OvertimeBalance[]> {
    const ds = await this.repo.find({ where: { employeeId } as any });
    return ds
      .filter((q) => q.isActive !== false)
      .sort((a, b) => (a.kyTich < b.kyTich ? -1 : 1));
  }

  /**
   * Quỹ còn hiệu lực, chưa quá hạn tại ngày `den`, còn giờ để dùng — LUẬT DUY
   * NHẤT cho "khả dụng". `soDuKhaDung()` (số hiển thị cho HR/nhân viên) và
   * `quyKhaDung()` (danh sách FIFO thật sự bị tiêu ở Task 5) phải đi qua
   * chung một cửa: khác cửa là số hiển thị và số tiêu được có thể trôi khỏi
   * nhau mà không ai biết, nếu sau này có ai thêm một điều kiện loại trừ vào
   * một trong hai bên mà quên bên còn lại.
   */
  private async quyDuDieuKienDung(
    employeeId: string,
    den: string,
  ): Promise<OvertimeBalance[]> {
    return (await this.layQuyCuaNhanVien(employeeId)).filter(
      (q) =>
        q.trangThai === 'dang_hieu_luc' &&
        q.hanDung >= den &&
        // `> EPSILON_GIO` chứ không `> 0`: một quỹ đã tiêu hết nhưng còn dư
        // nhị phân 4e-16 vẫn "còn giờ" theo `> 0`, và sẽ lọt vào cả số dư
        // hiển thị lẫn danh sách FIFO như một kỳ có thể tiêu được.
        q.soGioConLai > EPSILON_GIO,
    );
  }

  /** Số dư dùng được tại ngày `den` — bỏ quỹ đã đóng và quỹ quá hạn. */
  async soDuKhaDung(
    employeeId: string,
    den: string,
  ): Promise<{
    soGioConLai: number;
    theoKy: Array<{ kyTich: string; hanDung: string; soGioConLai: number }>;
  }> {
    const ds = await this.quyDuDieuKienDung(employeeId, den);

    return {
      // Đây là con số ĐI THẲNG RA MÀN HÌNH ("Bạn còn X giờ nghỉ bù") — tổng
      // của nhiều kỳ nên phải làm tròn LẠI sau khi cộng, dù từng kỳ đã tròn.
      soGioConLai: lamTronGio(ds.reduce((t, q) => t + q.soGioConLai, 0)),
      theoKy: ds.map((q) => ({
        kyTich: q.kyTich,
        hanDung: q.hanDung,
        soGioConLai: lamTronGio(q.soGioConLai),
      })),
    };
  }

  /** Danh sách quỹ khả dụng ở dạng `phanBoFifo()` cần — dùng ở Task 5. */
  protected async quyKhaDung(
    employeeId: string,
    den: string,
  ): Promise<QuyKhaDung[]> {
    const ds = await this.quyDuDieuKienDung(employeeId, den);

    return ds.map((q) => ({
      balanceId: String((q as any)._id),
      kyTich: q.kyTich,
      hanDung: q.hanDung,
      soGioConLai: lamTronGio(q.soGioConLai),
    }));
  }

  /**
   * Chọn quỹ nào chịu bao nhiêu giờ cho một đơn nghỉ bù.
   *
   * Dịch lỗi thuần của `phanBoFifo()` thành `ConflictException` có MÃ LỖI ổn
   * định — FE cần mã để hiện đúng thông báo, không được so khớp câu chữ.
   */
  async phanBoChoNghiBu(
    employeeId: string,
    soGioCan: number,
    den: string,
  ): Promise<PhanBoQuyGio[]> {
    const khaDung = await this.quyKhaDung(employeeId, den);
    const conLai = lamTronGio(khaDung.reduce((t, q) => t + q.soGioConLai, 0));
    const can = lamTronGio(soGioCan);

    try {
      return phanBoFifo(khaDung, can);
    } catch {
      throw new ConflictException({
        code: MA_LOI_QUY_GIO.KHONG_DU_SO_DU,
        message:
          conLai <= EPSILON_GIO
            ? 'Bạn chưa có giờ làm thêm nào để nghỉ bù.'
            : `Quỹ giờ làm thêm không đủ: cần ${can} giờ, chỉ còn ${conLai} giờ.`,
        soGioCan: can,
        soGioConLai: conLai,
      });
    }
  }

  /**
   * ĐẾM ròng các dòng sổ của một đơn nghỉ bù cho MỘT CẶP lý do đối nghịch
   * nhau, theo từng kỳ tích — mỗi dòng khớp `lyDoTang` tính +1, mỗi dòng khớp
   * `lyDoGiam` tính −1.
   *
   * KHÁC `rongTichTheoKy()` bên tích quỹ OT (hàm đó CỘNG DỒN GIÁ TRỊ `soGio`
   * thật của các dòng, để ra "còn bao nhiêu giờ ròng"). Hàm này chỉ ĐẾM SỐ
   * LƯỢT xảy ra của mỗi loại, không quan tâm mỗi dòng bao nhiêu giờ — dùng để
   * trả lời "đã áp dụng lượt này chưa", không phải "còn bao nhiêu giờ". Hai
   * hàm tên gần giống nhau CỐ Ý đặt tên khác hẳn (`demRongTheoLyDo` so với
   * `rongTichTheoKy`) để không ai nhầm ý nghĩa khi đọc lướt.
   *
   * CHỈ dùng để chống trùng cho HAI hàm "tiến" — `giuCho` (cặp
   * `giu_cho_nghi_bu`/`huy_nghi_bu`) và `chuyenSangDaDung` (cặp
   * `duyet_nghi_bu`/`huy_nghi_bu`) — nơi gọi lại đúng `requestId` (bấm hai
   * lần, retry sau lỗi mạng) sẽ CỘNG DỒN không giới hạn nếu không chặn:
   *   - `giuCho` gọi lại: giữ thêm chỗ đè lên chỗ đã giữ — phần dư đó không
   *     đơn nào (nhaCho/chuyenSangDaDung) biết mà nhả ra, kẹt vĩnh viễn trong
   *     `soGioDangChoDuyet`, y hệt bug round 3 mà `rongTichTheoKy` đã vá cho
   *     `tichTuDonOt`.
   *   - `chuyenSangDaDung` gọi lại: `soGioDaDung` cộng dồn không giới hạn (vế
   *     này KHÔNG có Math.max chặn trần), đẩy `soGioConLai` xuống sai lệch
   *     vĩnh viễn — đúng lớp lỗi mà `soRongDaDung()` bên `quy-phep.service.ts`
   *     tồn tại để chặn.
   *
   * CỐ Ý KHÔNG dùng cho `nhaCho`/`hoanTraDaDung` (hai hàm "lùi", chỉ giảm
   * dần về 0 qua `Math.max(0, …)`) — một guard kiểu này đòi hỏi phải có sẵn
   * dòng sổ của thao tác "tiến" tương ứng, điều không đúng khi số dư bị set
   * thẳng (fixture test, điều chỉnh tay). Hai hàm đó tự chống trùng bằng
   * cách khác — xem `apDung()` (tham số `boQuaKhiKhongDoi`).
   */
  private async demRongTheoLyDo(
    requestId: string,
    employeeId: string,
    lyDoTang: string,
    lyDoGiam: string,
  ): Promise<Map<string, number>> {
    const ds = (await this.soRepo.find({ where: { requestId } as any })).filter(
      (d) =>
        d.employeeId === employeeId &&
        (d.lyDo === lyDoTang || d.lyDo === lyDoGiam),
    );
    const theoKy = new Map<string, number>();
    for (const d of ds) {
      const dau = d.lyDo === lyDoTang ? 1 : -1;
      theoKy.set(d.kyTich, (theoKy.get(d.kyTich) ?? 0) + dau);
    }
    return theoKy;
  }

  /**
   * `doi()` giờ TRẢ VỀ số giờ THỰC SỰ đã áp dụng (sau khi Math.max kẹp), chứ
   * không phải số giờ YÊU CẦU (`p.soGio`) — hai số này lệch nhau đúng lúc một
   * lần gọi lại (retry/bấm hai lần) rơi vào phần đã bị kẹp về 0.
   *
   * Review round phát hiện: bản cũ ghi `dauSo(p.soGio)` (theo YÊU CẦU) trong
   * khi `doi()` áp dụng theo THỰC TẾ (bị Math.max kẹp) — với `nhaCho`/
   * `hoanTraDaDung`, một lần gọi lại sau khi đã về 0 thì SỐ DƯ đúng (kẹp ở
   * 0, không đổi thêm) nhưng SỔ vẫn ghi thêm một dòng `+p.soGio` như thể có
   * di chuyển thật — sổ cộng dồn ra nhiều hơn số dư thực sự đã đổi. `sổ là
   * nguồn sự thật` (nguyên tắc `doiSoat()`, Task 12, dựng lại số dư từ tổng
   * sổ và báo lệch) — dòng sổ ma này khiến MỘT QUỸ HOÀN TOÀN ĐÚNG bị báo lệch
   * vĩnh viễn, đúng thứ mà sổ append-only tồn tại để tránh.
   *
   * `boQuaKhiKhongDoi = true` (dùng cho `nhaCho`/`hoanTraDaDung`): khi số
   * thực tế áp dụng là 0 (đã bị kẹp từ trước — không còn gì để nhả/hoàn) thì
   * BỎ QUA hẳn cả `repo.save()` lẫn `ghiSo()` — không có biến động thật thì
   * không có gì để ghi.
   *
   * `giuCho`/`chuyenSangDaDung` giữ `boQuaKhiKhongDoi = false` (mặc định):
   * `giuCho` chưa từng đụng Math.max (kiem() chặn trước khi tràn, không kẹp
   * âm thầm) nên số thực tế luôn bằng số yêu cầu; `chuyenSangDaDung` CỐ Ý
   * luôn ghi `soGio: 0` làm VẾT TRẠNG THÁI bất kể số thực tế di chuyển bao
   * nhiêu (xem doc-comment hàm đó) — nếu bật `boQuaKhiKhongDoi` ở đây, vết đó
   * sẽ bị nuốt mất ngay ở lần gọi hợp lệ đầu tiên. Cả hai hàm này vẫn có
   * guard `demRongTheoLyDo()` riêng chặn retry TRƯỚC khi vào `apDung()` —
   * nếu không, `soGioDaDung` của `chuyenSangDaDung` (không hề bị Math.max
   * kẹp) vẫn cộng dồn sai dù dòng sổ trông vô hại (toàn số 0).
   */
  private async apDung(
    employeeId: string,
    phanBo: PhanBoQuyGio[],
    lyDo: string,
    requestId: string,
    nguoiThucHien: string,
    doi: (quy: OvertimeBalance, soGio: number) => number,
    dauSo: (soGioThucTe: number) => number,
    kiem?: (quy: OvertimeBalance, soGio: number) => string | null,
    boQuaKhiKhongDoi = false,
  ): Promise<void> {
    for (const p of phanBo) {
      let daXong = false;

      for (let lan = 0; lan < SO_LAN_THU_LAI_CAS && !daXong; lan++) {
        const quy = await this.repo.findOne({
          where: { employeeId, kyTich: p.kyTich } as any,
        });
        if (!quy) {
          daXong = true;
          break;
        }

        const loi = kiem?.(quy, p.soGio);
        if (loi) {
          throw new ConflictException({
            code: MA_LOI_QUY_GIO.KHONG_DU_SO_DU,
            message: loi,
          });
        }

        const truoc = {
          soGioTich: quy.soGioTich,
          soGioDaDung: quy.soGioDaDung,
          soGioDangChoDuyet: quy.soGioDangChoDuyet,
        };

        // `doi()` sửa TẠI CHỖ, nên phải cho nó một BẢN SAO: `truoc` là vế so
        // sánh của CAS, và nếu `doi()` sửa thẳng vào chính object mà repo
        // đang giữ thì đến lúc so sánh, giá trị dưới DB đã là giá trị MỚI —
        // filter không bao giờ khớp và vòng lặp quay đủ 5 lần rồi ném. Bản
        // sao cũng làm hàm này độc lập với chuyện repo trả về tham chiếu
        // dùng chung hay object mới mỗi lần đọc.
        const ban = { ...quy } as OvertimeBalance;

        const thucTe = doi(ban, p.soGio);
        if (boQuaKhiKhongDoi && thucTe === 0) {
          daXong = true; // đã bị kẹp từ trước — không có gì để ghi
          break;
        }

        this.tinhLaiConLai(ban);

        if (!(await this.capNhatCas((quy as any)._id, truoc, ban))) {
          continue; // ai đó vừa đổi số dư — đọc lại, `kiem()` chạy trên số MỚI
        }

        await this.ghiSo({
          balanceId: String((quy as any)._id),
          employeeId,
          kyTich: p.kyTich,
          soGio: dauSo(thucTe),
          lyDo,
          requestId,
          nguoiThucHien,
        });
        daXong = true;
      }

      if (!daXong) {
        throw new ConflictException({
          code: MA_LOI_QUY_GIO.DANG_SUA_DONG_THOI,
          message: `Quỹ kỳ ${p.kyTich} đang được sửa đồng thời, vui lòng thử lại`,
        });
      }
    }
  }

  /**
   * Ghi số dư bằng compare-and-swap: filter chứa ĐÚNG ba con số đã đọc, nên
   * bất kỳ ai chen vào giữa lúc đọc và lúc ghi cũng làm filter trượt.
   *
   * Đi thẳng qua `getMongoRepository()` (proxy tenant của @app/database KHÔNG
   * chặn `findOneAndUpdate`), nên filter phải tự đủ chặt. `_id` là khoá toàn
   * cục duy nhất nên không cần thêm `tenantId` — cùng lập luận đã ghi ở
   * `nhan-vien.service.ts` cho `generateEmployeeId()`.
   */
  private async capNhatCas(
    id: unknown,
    truoc: {
      soGioTich: number;
      soGioDaDung: number;
      soGioDangChoDuyet: number;
    },
    sau: OvertimeBalance,
  ): Promise<boolean> {
    const mongoRepo = this.repo.manager.getMongoRepository(
      OvertimeBalance,
    ) as unknown as import('typeorm').MongoRepository<OvertimeBalance>;

    const kq = await (mongoRepo as any).findOneAndUpdate(
      { _id: id, ...truoc },
      {
        $set: {
          soGioTich: sau.soGioTich,
          soGioDaDung: sau.soGioDaDung,
          soGioDangChoDuyet: sau.soGioDangChoDuyet,
          soGioConLai: sau.soGioConLai,
        },
      },
      { returnDocument: 'after' },
    );
    return kq != null;
  }

  /**
   * Nộp đơn → giữ chỗ ngay, để hai đơn nộp cùng lúc không cùng ăn một số dư.
   *
   * Chống trùng bằng `demRongTheoLyDo(giu_cho_nghi_bu, huy_nghi_bu)`: kỳ nào
   * ròng đã > 0 (đang giữ chỗ, chưa được nhả) thì bỏ qua — gọi lại `giuCho`
   * cho đúng `requestId` (bấm hai lần, retry) không được giữ thêm chỗ đè lên
   * chỗ đã giữ. Xem lý do đầy đủ ở doc-comment `demRongTheoLyDo()`.
   *
   * NGUYÊN TỬ (P4.2b): `apDung()` ghi bằng compare-and-swap — filter chứa
   * đúng ba số dư đã đọc, nên hai đơn nộp gần như đồng thời không thể cùng
   * giữ chỗ trên một số dư. Bên trượt đọc lại và chạy `kiem()` trên số dư
   * MỚI, nên nó rớt đúng chỗ đáng rớt thay vì đẩy số dư xuống âm.
   *
   * Guard `demRongTheoLyDo()` phía trên vẫn cần và vẫn giữ: nó chặn một lớp
   * lỗi KHÁC (gọi lại cùng `requestId`), thứ mà CAS không nhìn thấy — hai
   * lần gọi đó thật sự đọc hai số dư khác nhau và cả hai đều hợp lệ.
   */
  async giuCho(
    employeeId: string,
    phanBo: PhanBoQuyGio[],
    requestId: string,
    nguoiThucHien: string,
  ): Promise<void> {
    const rong = await this.demRongTheoLyDo(
      requestId,
      employeeId,
      'giu_cho_nghi_bu',
      'huy_nghi_bu',
    );
    const canGiu = phanBo.filter((p) => (rong.get(p.kyTich) ?? 0) <= 0);

    await this.apDung(
      employeeId, canGiu, 'giu_cho_nghi_bu', requestId, nguoiThucHien,
      (q, g) => { q.soGioDangChoDuyet += g; return g; },
      (thucTe) => -thucTe,
      (q, g) =>
        q.soGioDangChoDuyet + g > q.soGioTich - q.soGioDaDung
          ? `Quỹ kỳ ${q.kyTich} không còn đủ để giữ chỗ`
          : null,
    );
  }

  /**
   * Từ chối đơn còn ở `cho_duyet` → nhả chỗ.
   *
   * KHÔNG có guard lọc-trước ở đây (khác `giuCho`/`chuyenSangDaDung`, xem
   * doc-comment `demRongTheoLyDo()`) — quyết định có cân nhắc, không phải bỏ
   * sót: một guard kiểu `demRongTheoLyDo(giu_cho_nghi_bu, huy_nghi_bu) > 0`
   * sẽ đòi hỏi PHẢI có sẵn dòng sổ `giu_cho_nghi_bu` cho đúng `requestId` mới
   * cho nhả — đúng trong vận hành thật, nhưng vỡ ngay khi số dư bị set thẳng
   * (fixture test, sửa tay của HR) — guard sẽ coi "không có dòng
   * giu_cho_nghi_bu" là "không có gì để nhả" và bỏ qua NHẦM.
   *
   * Chống trùng thay vào đó bằng `apDung(…, boQuaKhiKhongDoi = true)`:
   * `Math.max(0, soGioDangChoDuyet - g)` đã tự chặn SỐ DƯ khỏi âm, nên việc
   * còn lại chỉ là chặn SỔ khỏi ghi trùng — `apDung()` tự phát hiện lần gọi
   * lại đã bị kẹp về 0 (không còn gì thay đổi thật) và bỏ qua cả `save()` lẫn
   * `ghiSo()`. Xem doc-comment đầy đủ ở `apDung()`.
   *
   * ── `chiPhanDaGiuCuaDon` (review nhánh, IMPORTANT 5)
   * Mặc định `false` = hành vi cũ, dùng cho MỌI lời gọi nghiệp vụ bình
   * thường (từ chối đơn, tự huỷ, xoá đơn) — nơi ta biết chắc đơn này đã giữ
   * chỗ theo đúng `phanBo` truyền vào.
   *
   * `true` CHỈ dùng cho đường BÙ khi `giuCho()` hỏng giữa chừng
   * (`don-cham-cong.service.ts`): ở đó nơi gọi KHÔNG biết `giuCho()` đã kịp
   * giữ tới kỳ nào, nên phải nhả trên TOÀN BỘ `phanBo`. Nhả mù trên kỳ chưa
   * hề bị đụng là NGUY HIỂM: `soGioDangChoDuyet` là bộ đếm DÙNG CHUNG theo
   * quỹ, không tách theo đơn (đúng cái bẫy đã ghi ở `huyDonCuaToi()`), nên
   * `Math.max(0, 2 - 1)` sẽ ăn mất chỗ giữ của một đơn KHÁC — mà kỳ đó gần
   * như chắc chắn đang có đơn khác giữ chỗ, vì đó chính là lý do `giuCho()`
   * vừa ném ở đấy. `true` giới hạn việc nhả vào đúng những kỳ mà SỔ xác nhận
   * đơn NÀY đang giữ chỗ.
   */
  async nhaCho(
    employeeId: string,
    phanBo: PhanBoQuyGio[],
    requestId: string,
    nguoiThucHien: string,
    chiPhanDaGiuCuaDon = false,
  ): Promise<void> {
    let canNha = phanBo;
    if (chiPhanDaGiuCuaDon) {
      const rong = await this.demRongTheoLyDo(
        requestId,
        employeeId,
        'giu_cho_nghi_bu',
        'huy_nghi_bu',
      );
      canNha = phanBo.filter((p) => (rong.get(p.kyTich) ?? 0) > 0);
    }

    await this.apDung(
      employeeId, canNha, 'huy_nghi_bu', requestId, nguoiThucHien,
      (q, g) => {
        const truoc = q.soGioDangChoDuyet;
        q.soGioDangChoDuyet = Math.max(0, truoc - g);
        return truoc - q.soGioDangChoDuyet; // số giờ THỰC SỰ vừa nhả — 0 nếu đã kẹp từ trước
      },
      (thucTe) => thucTe,
      undefined,
      true,
    );
  }

  /**
   * Duyệt đơn → phần giữ chỗ thành đã dùng. `soGioConLai` KHÔNG đổi.
   *
   * Chống trùng bằng `demRongTheoLyDo(duyet_nghi_bu, huy_nghi_bu)`: kỳ nào
   * ròng đã > 0 (đã chuyển thành đã dùng, chưa được hoàn) thì bỏ qua — gọi
   * lại `chuyenSangDaDung` không được cộng dồn `soGioDaDung` lần hai (vế này
   * KHÔNG bị Math.max chặn trần, nên trùng ở đây là lệch số vĩnh viễn).
   *
   * `apDung()` gọi với `boQuaKhiKhongDoi` mặc định `false`: dòng sổ ở đây
   * LUÔN là `soGio: 0` (vết trạng thái, không phải biến động — xem
   * doc-comment `apDung()`) bất kể số giờ thực tế di chuyển bao nhiêu, nên
   * không được để `apDung()` coi "ghi 0" là "không có gì xảy ra" rồi bỏ qua.
   */
  async chuyenSangDaDung(
    employeeId: string,
    phanBo: PhanBoQuyGio[],
    requestId: string,
    nguoiThucHien: string,
  ): Promise<void> {
    const rong = await this.demRongTheoLyDo(
      requestId,
      employeeId,
      'duyet_nghi_bu',
      'huy_nghi_bu',
    );
    const canDuyet = phanBo.filter((p) => (rong.get(p.kyTich) ?? 0) <= 0);

    await this.apDung(
      employeeId, canDuyet, 'duyet_nghi_bu', requestId, nguoiThucHien,
      (q, g) => {
        q.soGioDangChoDuyet = Math.max(0, q.soGioDangChoDuyet - g);
        q.soGioDaDung += g;
        return 0; // vết trạng thái — luôn 0, không phải số giờ thực tế di chuyển
      },
      () => 0,
    );
  }

  /**
   * Đơn ĐÃ DUYỆT bị từ chối → hoàn trả phần đã dùng.
   *
   * KHÔNG có guard lọc-trước — cùng lý do đã ghi ở `nhaCho()`. Chống trùng
   * bằng `apDung(…, boQuaKhiKhongDoi = true)`: `Math.max(0, soGioDaDung - g)`
   * tự chặn số dư khỏi âm, và `apDung()` bỏ qua ghi sổ khi số giờ thực tế
   * hoàn được là 0 (đã hoàn xong từ lần gọi trước).
   */
  async hoanTraDaDung(
    employeeId: string,
    phanBo: PhanBoQuyGio[],
    requestId: string,
    nguoiThucHien: string,
  ): Promise<void> {
    await this.apDung(
      employeeId, phanBo, 'huy_nghi_bu', requestId, nguoiThucHien,
      (q, g) => {
        const truoc = q.soGioDaDung;
        q.soGioDaDung = Math.max(0, truoc - g);
        return truoc - q.soGioDaDung; // số giờ THỰC SỰ vừa hoàn — 0 nếu đã hoàn từ trước
      },
      (thucTe) => thucTe,
      undefined,
      true,
    );
  }

  /**
   * Danh sách quỹ SẼ bị đóng nếu chạy `dongQuyGio(den)` — không ghi gì.
   *
   * Bảng xem trước là BẮT BUỘC, khác `generate()` của bảng công: thao tác này
   * phá dữ liệu người (giờ làm thêm đã tích), không phải tính lại phần của máy.
   *
   * ── Vì sao tách làm HAI danh sách (review nhánh, IMPORTANT 4)
   * Bản cũ lọc mỗi `hanDung` + `trangThai`, không ngó tới
   * `soGioDangChoDuyet`. Kịch bản mất giờ:
   *   quỹ `soGioTich 12, soGioDangChoDuyet 4, soGioConLai 8` quá hạn → đóng,
   *   ghi sổ `-8`. Đơn nghỉ bù đang chờ SAU ĐÓ bị từ chối → `nhaCho()` chạy
   *   trên quỹ ĐÃ ĐÓNG → `tinhLaiConLai()` dựng `soGioConLai` về 12. Bốn giờ
   *   đó vô hình với `soDuKhaDung()` (chỉ nhìn `dang_hieu_luc`) và chưa từng
   *   có mặt trong con số chốt lúc đóng — sau này hoặc mất trắng, hoặc được
   *   trả CHỒNG lên 8 giờ đã ghi.
   *
   * Không tự đoán hộ (đóng luôn 12, hay đóng 8 rồi kệ): cả hai đều là quyết
   * định thay người dùng trên tiền thật của NLĐ. Đúng lý lẽ mà chính bảng
   * xem trước này viện ra ("thao tác này phá dữ liệu người") — nêu ra cho HR,
   * để HR duyệt/từ chối đơn treo trước, rồi chạy lại.
   */
  async xemTruocDongQuy(den: string): Promise<{
    seDong: Array<{
      balanceId: string;
      employeeId: string;
      employeeName?: string;
      kyTich: string;
      hanDung: string;
      soGioConLai: number;
    }>;
    vuongCho: Array<{
      balanceId: string;
      employeeId: string;
      employeeName?: string;
      kyTich: string;
      hanDung: string;
      soGioConLai: number;
      soGioDangChoDuyet: number;
    }>;
  }> {
    const ds = await this.repo.find({ where: { trangThai: 'dang_hieu_luc' } as any });
    const quaHan = ds.filter((q) => q.isActive !== false && q.hanDung < den);

    const chung = (q: OvertimeBalance) => ({
      balanceId: String((q as any)._id),
      employeeId: q.employeeId,
      employeeName: q.employeeName,
      kyTich: q.kyTich,
      hanDung: q.hanDung,
      soGioConLai: lamTronGio(q.soGioConLai),
    });

    return {
      seDong: quaHan
        .filter((q) => q.soGioDangChoDuyet <= EPSILON_GIO)
        .map(chung),
      vuongCho: quaHan
        .filter((q) => q.soGioDangChoDuyet > EPSILON_GIO)
        .map((q) => ({
          ...chung(q),
          soGioDangChoDuyet: lamTronGio(q.soGioDangChoDuyet),
        })),
    };
  }

  /**
   * Đóng mọi quỹ quá hạn tại ngày `den`.
   *
   * `quy_ra_tien` chỉ ĐÓNG và ghi sổ ở chặng này; tiền thật do P4.2b trả, dựa
   * vào `kyLuongTra` còn rỗng. Tách hai bước là cố ý: đóng quỹ phải chạy được
   * ngay cả khi công ty chưa bật phần lương.
   *
   * BỎ QUA quỹ còn giữ chỗ sống (`vuongCho`, review nhánh IMPORTANT 4 — xem
   * lý do đầy đủ ở `xemTruocDongQuy()`) và trả số lượng ra ngoài, để nơi gọi
   * biết mình VỪA KHÔNG đóng cái gì thay vì tưởng đã đóng sạch.
   */
  async dongQuyGio(
    den: string,
    nguoiThucHien: string,
  ): Promise<{
    soQuyDong: number;
    soGioHetHan: number;
    soGioChoTraTien: number;
    soQuyVuongCho: number;
  }> {
    const cauHinh = await this.layCauHinh();
    const quyRaTien = cauHinh?.khiHetHan !== 'huy_bo';

    const { seDong: sePhaiDong, vuongCho } = await this.xemTruocDongQuy(den);
    let soGioHetHan = 0;
    // Đếm số quỹ THỰC SỰ đã đóng chứ không `sePhaiDong.length`: vòng lặp có
    // ba nhánh `continue` (quỹ biến mất, đã đóng bởi lượt khác, vừa có giữ
    // chỗ mới) — báo số dự kiến thay vì số thật là nói dối người vận hành.
    let soQuyDong = 0;

    for (const m of sePhaiDong) {
      const quy = await this.repo.findOne({
        where: { employeeId: m.employeeId, kyTich: m.kyTich } as any,
      });
      if (!quy || quy.trangThai !== 'dang_hieu_luc') continue;

      // Đọc lại `soGioDangChoDuyet` NGAY TRƯỚC KHI ghi, không tin bản chụp
      // của `xemTruocDongQuy()`: giữa lúc HR xem bảng xem trước và lúc bấm
      // đóng, một đơn nghỉ bù mới hoàn toàn có thể vừa giữ chỗ vào quỹ này.
      if (quy.soGioDangChoDuyet > EPSILON_GIO) continue;

      const conLai = lamTronGio(quy.soGioConLai);
      quy.trangThai = 'da_dong';
      await this.repo.save(quy);
      soQuyDong += 1;
      soGioHetHan = lamTronGio(soGioHetHan + conLai);

      if (conLai > 0) {
        await this.ghiSo({
          balanceId: m.balanceId,
          employeeId: m.employeeId,
          kyTich: m.kyTich,
          soGio: -conLai,
          lyDo: quyRaTien ? 'quy_ra_tien' : 'het_han',
          nguoiThucHien,
          ghiChu: quyRaTien
            ? 'Chờ kỳ lương kế tiếp trả tiền'
            : 'Hết hạn, không quy ra tiền theo cấu hình công ty',
        });
      }
    }

    return {
      soQuyDong,
      soGioHetHan,
      soGioChoTraTien: quyRaTien ? soGioHetHan : 0,
      soQuyVuongCho: vuongCho.length,
    };
  }

  /**
   * Dựng lại số dư từ SỔ và so với bản tổng hợp.
   *
   * Sổ là nguồn sự thật; `overtime_balances` chỉ là bản tổng hợp cho nhanh.
   * Lệch nghĩa là có nơi nào đó ghi số dư mà quên ghi sổ — báo cáo, KHÔNG tự
   * sửa: tự sửa là xoá mất bằng chứng của chính cái bug cần tìm.
   *
   * ── Vì sao phải BỎ dòng đóng quỹ ra khi dựng lại (review nhánh, IMPORTANT 3)
   * `dongQuyGio()` ghi một dòng sổ `-conLai` nhưng CỐ Ý giữ nguyên
   * `soGioConLai` (chặng lương P4.2b còn phải đọc số đó để trả tiền). Nên
   * với một quỹ ĐÃ ĐÓNG ĐÚNG, tổng sổ về 0 trong khi `theoSoDu` vẫn giữ số
   * giờ còn lại: `lech = soGioConLai` VĨNH VIỄN, trên MỌI nhân viên từng có
   * giờ hết hạn. `ops/README.md` bảo vận hành chạy đối soát sau rollout để
   * xác nhận không lệch — một cột lệch toàn số khác 0 làm đúng cái việc đó
   * trở nên vô nghĩa, và nhấn chìm một sai lệch THẬT nếu có.
   *
   * Cách vá KHÔNG phải là bỏ qua quỹ đã đóng (thế thì mất luôn khả năng phát
   * hiện sai lệch thật trên chúng), mà là dựng lại số dư theo đúng ĐỊNH
   * NGHĨA mà `soGioConLai` đang mang: "số giờ còn lại TRƯỚC bước đóng". Tức
   * cộng ngược phần đã ghi bởi hai lý do đóng quỹ (`quy_ra_tien`/`het_han`,
   * đều là số ÂM) vào tổng sổ. Quỹ chưa đóng không có dòng nào loại này nên
   * công thức thoái về đúng công thức cũ.
   *
   * `soGioDaDong` được trả ra ngoài để người đối soát nhìn thấy phần đã cộng
   * ngược, thay vì phải tin một phép trừ vô hình.
   */
  async doiSoat(employeeId: string): Promise<
    Array<{
      kyTich: string;
      theoSo: number;
      theoSoDu: number;
      lech: number;
      soGioDaDong: number;
    }>
  > {
    const quy = await this.layQuyCuaNhanVien(employeeId);
    const so = await this.soRepo.find({ where: { employeeId } as any });

    return quy.map((q) => {
      const cuaKy = so.filter((d) => d.kyTich === q.kyTich);
      const tongSo = cuaKy.reduce((t, d) => t + d.soGio, 0);
      // Âm (dongQuyGio ghi `-conLai`); đảo dấu để ra số giờ đã bị đóng.
      const soGioDaDong = lamTronGio(
        -cuaKy
          .filter((d) => d.lyDo === 'quy_ra_tien' || d.lyDo === 'het_han')
          .reduce((t, d) => t + d.soGio, 0),
      );
      const theoSo = lamTronGio(tongSo + soGioDaDong);

      return {
        kyTich: q.kyTich,
        theoSo,
        theoSoDu: lamTronGio(q.soGioConLai),
        // Làm tròn CẢ hiệu, không chỉ hai vế: hai số đã tròn trừ nhau vẫn ra
        // 1e-15 (0.1 - 0.3 + 0.2 …), và một cột "lệch" toàn 1e-15 là đúng
        // thứ nhiễu mà IMPORTANT 2 đã đo được trên ~22% quỹ HOÀN TOÀN ĐÚNG.
        lech: lamTronGio(q.soGioConLai - theoSo),
        soGioDaDong,
      };
    });
  }
}
