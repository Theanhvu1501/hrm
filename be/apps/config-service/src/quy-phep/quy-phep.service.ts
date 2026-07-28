import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, LeaveBalance, LeaveBalanceEntry, PhanBoQuy } from '@app/entities';
import { hanDungCuaNam, tinhPhepDuocCap } from './luat-phep';

export const MA_LOI_QUY_PHEP = {
  /** Nộp đơn `phep_nam` khi hồ sơ chưa có `ngayChinhThuc`. */
  CHUA_LEN_CHINH_THUC: 'CHUA_LEN_CHINH_THUC',
  /** Tổng ngày nghỉ vượt số dư khả dụng tại đúng những ngày xin nghỉ. */
  KHONG_DU_SO_DU: 'KHONG_DU_SO_DU',
} as const;

export const LOAI_QUY_PHEP_NAM = 'phep_nam';

export interface DongXemTruocCap {
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  nam: number;
  soNgay: number;
  daCoQuy: boolean;
}

/**
 * CỬA DUY NHẤT được ghi `leave_balances` / `leave_balance_entries`.
 *
 * Cố ý KHÔNG phụ thuộc `NhanVien_Service` (đọc thẳng `Employee` repo): nhờ vậy
 * `NhanVien_Module` import ngược lại được module này để gọi
 * `moKhoaLenChinhThuc()` mà không tạo vòng phụ thuộc.
 */
@Injectable()
export class QuyPhep_Service {
  constructor(
    @InjectRepository(LeaveBalance)
    private readonly repo: Repository<LeaveBalance>,
    @InjectRepository(LeaveBalanceEntry)
    private readonly repoSo: Repository<LeaveBalanceEntry>,
    @InjectRepository(Employee)
    private readonly repoNhanVien: Repository<Employee>,
  ) {}

  /** Ghi số dư + ghi sổ trong CÙNG một lời gọi. Không hàm nào khác được lưu quỹ. */
  private async ghi(
    quy: LeaveBalance,
    bienDong: {
      soNgay: number;
      lyDo: string;
      nguoiThucHien: string;
      requestId?: string;
      ghiChu?: string;
    },
  ): Promise<LeaveBalance> {
    quy.soNgayConLai =
      quy.soNgayDuocCap - quy.soNgayDaDung - quy.soNgayDangChoDuyet;
    const daLuu = await this.repo.save(quy);

    await this.repoSo.save(
      this.repoSo.create({
        balanceId: String((daLuu as any)._id),
        employeeId: daLuu.employeeId,
        nam: daLuu.nam,
        loaiQuy: daLuu.loaiQuy,
        soNgay: bienDong.soNgay,
        lyDo: bienDong.lyDo,
        requestId: bienDong.requestId,
        nguoiThucHien: bienDong.nguoiThucHien,
        thoiDiem: new Date().toISOString(),
        ghiChu: bienDong.ghiChu,
      }) as Partial<LeaveBalanceEntry>,
    );

    return daLuu;
  }

  private async timQuy(
    employeeId: string,
    nam: number,
    loaiQuy = LOAI_QUY_PHEP_NAM,
  ): Promise<LeaveBalance | null> {
    const ds = await this.repo.find({ where: { employeeId, loaiQuy } as any });
    return ds.find((q) => q.nam === nam) ?? null;
  }

  async layQuyCuaNhanVien(
    employeeId: string,
    loaiQuy = LOAI_QUY_PHEP_NAM,
  ): Promise<LeaveBalance[]> {
    const ds = await this.repo.find({ where: { employeeId, loaiQuy } as any });
    return ds.filter((q) => q.isActive !== false).sort((a, b) => a.nam - b.nam);
  }

  private async nhanVienDuocCap(): Promise<Employee[]> {
    const ds = await this.repoNhanVien.find({ where: { isActive: true } as any });
    // Bỏ qua người còn thử việc (chưa có ngayChinhThuc) và người đã nghỉ.
    // Người còn thử việc sẽ được cấp sau, đúng lúc moKhoaLenChinhThuc() chạy —
    // gồm cả phần cấp bù năm trước.
    return ds.filter(
      (nv) => !!nv.ngayChinhThuc && !!nv.ngayVaoLam && nv.trangThai !== 'da_nghi',
    );
  }

  /** Cấp một quỹ cho (NV, năm). Đã có quỹ thì trả null — đây là cơ chế idempotent. */
  private async capMotNam(
    nv: Employee,
    nam: number,
    lyDo: string,
    nguoiThucHien: string,
  ): Promise<LeaveBalance | null> {
    const employeeId = String((nv as any)._id);
    if (await this.timQuy(employeeId, nam)) return null;

    const { soNgay, canCuCap } = tinhPhepDuocCap({
      ngayVaoLam: nv.ngayVaoLam!,
      nam,
      ngayLamViecTrongTuan: nv.ngayLamViecTrongTuan,
    });
    if (soNgay <= 0) return null;

    const quy = this.repo.create({
      employeeId,
      employeeName: nv.hoTen,
      employeeCode: nv.employeeId,
      nam,
      loaiQuy: LOAI_QUY_PHEP_NAM,
      soNgayDuocCap: soNgay,
      soNgayDaDung: 0,
      soNgayDangChoDuyet: 0,
      soNgayConLai: soNgay,
      hanDung: hanDungCuaNam(nam),
      trangThai: 'dang_hieu_luc',
      canCuCap,
      isActive: true,
    } as Partial<LeaveBalance>);

    return this.ghi(quy, { soNgay, lyDo, nguoiThucHien });
  }

  async xemTruocCapPhepDauNam(nam: number): Promise<DongXemTruocCap[]> {
    const ds = await this.nhanVienDuocCap();
    return Promise.all(
      ds.map(async (nv) => {
        const employeeId = String((nv as any)._id);
        const { soNgay } = tinhPhepDuocCap({
          ngayVaoLam: nv.ngayVaoLam!,
          nam,
          ngayLamViecTrongTuan: nv.ngayLamViecTrongTuan,
        });
        return {
          employeeId,
          employeeName: nv.hoTen,
          employeeCode: nv.employeeId,
          nam,
          soNgay,
          daCoQuy: !!(await this.timQuy(employeeId, nam)),
        };
      }),
    );
  }

  async capPhepDauNam(
    nam: number,
    nguoiThucHien: string,
  ): Promise<{ daCap: number; boQua: number }> {
    const ds = await this.nhanVienDuocCap();
    let daCap = 0;
    let boQua = 0;

    for (const nv of ds) {
      const quy = await this.capMotNam(nv, nam, 'cap_dau_nam', nguoiThucHien);
      if (quy) daCap += 1;
      else boQua += 1;
    }

    // Người còn thử việc cũng nằm trong `boQua` gián tiếp: họ đã bị loại ở
    // nhanVienDuocCap(), nên cộng thêm phần chênh lệch cho con số báo cáo đúng.
    const tongNhanSu = (await this.repoNhanVien.find({ where: { isActive: true } as any }))
      .length;
    boQua += tongNhanSu - ds.length;

    return { daCap, boQua };
  }

  /**
   * Mở khoá quỹ khi NV lên chính thức. Cấp quỹ năm của `ngayChinhThuc` VÀ
   * cấp bù mọi năm trước đó có tháng làm việc mà chưa có quỹ (ca D của spec):
   * NV vào làm T11/2026 nhưng T1/2027 mới chính thức thì các tháng làm việc
   * năm 2026 vẫn có thật — không cấp bù là NV mất trắng do lỗi thời điểm.
   *
   * Idempotent: gọi lại không cấp thêm (dựa `capMotNam` trả null khi đã có quỹ).
   */
  async moKhoaLenChinhThuc(
    employeeId: string,
    nguoiThucHien: string,
  ): Promise<LeaveBalance[]> {
    const { ObjectId } = await import('mongodb');
    const nv = await this.repoNhanVien.findOne({
      where: { _id: new ObjectId(employeeId) as any },
    });
    if (!nv) throw new NotFoundException('Không tìm thấy nhân viên');
    if (!nv.ngayChinhThuc || !nv.ngayVaoLam) return [];

    const namVao = Number(nv.ngayVaoLam.slice(0, 4));
    const namChinhThuc = Number(nv.ngayChinhThuc.slice(0, 4));

    const daCap: LeaveBalance[] = [];
    for (let nam = namVao; nam <= namChinhThuc; nam += 1) {
      const lyDo = nam === namChinhThuc ? 'cap_len_chinh_thuc' : 'cap_bu_nam_truoc';
      const quy = await this.capMotNam(nv, nam, lyDo, nguoiThucHien);
      if (quy) daCap.push(quy);
    }

    return daCap;
  }

  /**
   * Chia số ngày nghỉ vào các quỹ, ưu tiên quỹ sắp hết hạn nhất.
   *
   * Phân bổ theo TỪNG NGÀY nghỉ chứ không theo ngày bắt đầu đơn: một quỹ chỉ
   * dùng được cho ngày nghỉ ≤ `hanDung` của nó. Xét theo ngày bắt đầu thì NV
   * nộp một đơn dài vắt qua 31/3 là lách được hạn dùng của toàn bộ quỹ cũ, và
   * ngày nghỉ 2/4 vốn không phải ngày nghỉ của năm cũ.
   *
   * `cacNgayNghi` là các ngày THỰC SỰ TRỪ PHÉP (đã loại cuối tuần và ngày lễ,
   * xem `tinhSoNgayNghi` trong luat-don.ts). `soNgayNghi` là tổng đã tính —
   * bằng `cacNgayNghi.length`, trừ đơn nửa ngày thì bằng 0.5.
   */
  async phanBoChoNgayNghi(
    employeeId: string,
    cacNgayNghi: string[],
    soNgayNghi: number,
  ): Promise<PhanBoQuy[]> {
    const quyKhaDung = (await this.layQuyCuaNhanVien(employeeId))
      .filter((q) => q.trangThai === 'dang_hieu_luc')
      .sort((a, b) => a.nam - b.nam);

    // Số dư còn dùng được, tính trong bộ nhớ để nhiều ngày của cùng một đơn
    // không cùng "nhìn thấy" một số dư đã bị ngày trước đó lấy mất.
    const conLai = new Map<string, number>(
      quyKhaDung.map((q) => [String((q as any)._id), q.soNgayConLai]),
    );

    const trongLuongMoiNgay =
      cacNgayNghi.length > 0 ? soNgayNghi / cacNgayNghi.length : 0;
    const ketQua = new Map<string, PhanBoQuy>();

    for (const ngay of cacNgayNghi) {
      let can = trongLuongMoiNgay;

      for (const quy of quyKhaDung) {
        if (can <= 0) break;
        if (quy.hanDung < ngay) continue; // so chuỗi "YYYY-MM-DD" là so đúng thứ tự thời gian

        const id = String((quy as any)._id);
        const co = conLai.get(id) ?? 0;
        if (co <= 0) continue;

        const lay = Math.min(co, can);
        conLai.set(id, co - lay);
        can -= lay;

        const da = ketQua.get(id);
        if (da) da.soNgay += lay;
        else ketQua.set(id, { balanceId: id, nam: quy.nam, soNgay: lay });
      }

      if (can > 0) {
        const tomTat = quyKhaDung
          .map((q) => `${q.nam}: ${q.soNgayConLai} ngày (hạn ${q.hanDung})`)
          .join('; ');
        throw new ConflictException({
          code: MA_LOI_QUY_PHEP.KHONG_DU_SO_DU,
          message: `Không đủ phép cho ngày ${ngay}. Số dư hiện có — ${tomTat || 'chưa có quỹ nào'}`,
        });
      }
    }

    return [...ketQua.values()];
  }

  private async layQuyTheoId(balanceId: string): Promise<LeaveBalance> {
    const { ObjectId } = await import('mongodb');
    const quy = await this.repo.findOne({
      where: { _id: new ObjectId(balanceId) as any },
    });
    if (!quy) throw new NotFoundException(`Không tìm thấy quỹ phép ${balanceId}`);
    return quy;
  }

  /**
   * Giữ chỗ NGAY khi nộp đơn, không đợi duyệt. Nếu chỉ trừ lúc duyệt thì NV
   * còn 2 ngày phép nộp được 5 đơn mỗi đơn 2 ngày — tất cả đều qua bước kiểm
   * tra vì chưa đơn nào bị trừ, và HR duyệt tới đơn thứ hai mới phát hiện âm
   * quỹ, lúc đó đã hứa với NV rồi.
   *
   * Giữ chỗ KHÔNG ghi sổ: sổ ghi những biến động thật của quỹ (cấp/dùng/hoàn/
   * hết hạn), còn giữ chỗ là trạng thái tạm. `doiSoat()` vì vậy chỉ đối chiếu
   * `soNgayDuocCap` và `soNgayDaDung`.
   */
  async giuCho(
    phanBo: PhanBoQuy[],
    _requestId: string,
    _nguoiThucHien: string,
  ): Promise<void> {
    for (const p of phanBo) {
      const quy = await this.layQuyTheoId(p.balanceId);
      quy.soNgayDangChoDuyet += p.soNgay;
      quy.soNgayConLai =
        quy.soNgayDuocCap - quy.soNgayDaDung - quy.soNgayDangChoDuyet;
      await this.repo.save(quy);
    }
  }

  async nhaCho(
    phanBo: PhanBoQuy[],
    _requestId: string,
    _nguoiThucHien: string,
  ): Promise<void> {
    for (const p of phanBo) {
      const quy = await this.layQuyTheoId(p.balanceId);
      quy.soNgayDangChoDuyet = Math.max(0, quy.soNgayDangChoDuyet - p.soNgay);
      quy.soNgayConLai =
        quy.soNgayDuocCap - quy.soNgayDaDung - quy.soNgayDangChoDuyet;
      await this.repo.save(quy);
    }
  }

  async chuyenSangDaDung(
    phanBo: PhanBoQuy[],
    requestId: string,
    nguoiThucHien: string,
  ): Promise<void> {
    for (const p of phanBo) {
      const quy = await this.layQuyTheoId(p.balanceId);
      quy.soNgayDangChoDuyet = Math.max(0, quy.soNgayDangChoDuyet - p.soNgay);
      quy.soNgayDaDung += p.soNgay;
      await this.ghi(quy, {
        soNgay: -p.soNgay,
        lyDo: 'duyet_don',
        requestId,
        nguoiThucHien,
      });
    }
  }

  /**
   * Hoàn phép của đơn ĐÃ DUYỆT bị huỷ. Hoàn về ĐÚNG quỹ đã trừ theo `phanBo`
   * đã snapshot trên đơn — kể cả quỹ đã `da_dong`. Hoàn vào quỹ năm hiện tại
   * sẽ biến phép hết hạn thành phép mới.
   */
  async hoanTraDaDung(
    phanBo: PhanBoQuy[],
    requestId: string,
    nguoiThucHien: string,
  ): Promise<void> {
    for (const p of phanBo) {
      const quy = await this.layQuyTheoId(p.balanceId);
      quy.soNgayDaDung = Math.max(0, quy.soNgayDaDung - p.soNgay);
      await this.ghi(quy, {
        soNgay: p.soNgay,
        lyDo: 'huy_don',
        requestId,
        nguoiThucHien,
      });
    }
  }
}
