import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CauHinhLuong,
  OvertimeBalance,
  OvertimeBalanceEntry,
} from '@app/entities';
import {
  HeSoTichQuy,
  PhanBoQuyGio,
  QuyKhaDung,
  gioTichTuDonOt,
  hanDungCuaKy,
  phanBoFifo,
} from './luat-quy-gio';

/** Mã lỗi ổn định cho FE so khớp — KHÔNG so khớp câu chữ tiếng Việt. */
export const MA_LOI_QUY_GIO = {
  KHONG_DU_SO_DU: 'QUY_GIO_KHONG_DU_SO_DU',
  DA_TIEU_KHONG_THU_HOI_DUOC: 'QUY_GIO_DA_TIEU',
} as const;

interface CauHinhLamThemApDung {
  soGioMoiNgay: number;
  cheDoBu: string;
  heSoTichQuy: HeSoTichQuy;
  soThangHanDung: number | null;
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
      heSoTichQuy: ch.lamThem.heSoTichQuy,
      soThangHanDung: ch.lamThem.soThangHanDung ?? null,
    };
  }

  /** Số giờ của một ngày công — nơi gọi bên ngoài (đơn nghỉ bù) cần biết. */
  async soGioMoiNgay(): Promise<number> {
    return (await this.layCauHinh())?.soGioMoiNgay ?? 8;
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
        thoiDiem: new Date().toISOString(),
      } as Partial<OvertimeBalanceEntry>),
    );
  }

  private tinhLaiConLai(quy: OvertimeBalance): void {
    quy.soGioConLai =
      quy.soGioTich - quy.soGioDaDung - quy.soGioDangChoDuyet;
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

      if (quy.soGioConLai < rong) {
        throw new ConflictException({
          code: MA_LOI_QUY_GIO.DA_TIEU_KHONG_THU_HOI_DUOC,
          message: `Giờ tích từ đơn này đã được nghỉ bù mất một phần (kỳ ${kyTich} chỉ còn ${quy.soGioConLai} giờ, cần thu hồi ${rong}). Xử lý tay trước khi hủy đơn.`,
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
        q.soGioConLai > 0,
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
      soGioConLai: ds.reduce((t, q) => t + q.soGioConLai, 0),
      theoKy: ds.map((q) => ({
        kyTich: q.kyTich,
        hanDung: q.hanDung,
        soGioConLai: q.soGioConLai,
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
      soGioConLai: q.soGioConLai,
    }));
  }
}
