import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  /**
   * Ghi số dư + ghi sổ trong CÙNG một lời gọi — mọi BIẾN ĐỘNG THẬT của quỹ
   * (cấp/dùng/hoàn/hết hạn) phải đi qua đây. Ngoại lệ duy nhất: `giuCho` và
   * `nhaCho` lưu thẳng qua `repo.save()`, không qua hàm này — giữ chỗ là
   * trạng thái tạm của một đơn đang chờ duyệt, không phải biến động quỹ thật
   * nên không vào sổ (xem doc-comment của `giuCho`).
   */
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
   * `cacNgayNghi` là các ngày THỰC SỰ TRỪ PHÉP — danh sách này do NƠI GỌI tự
   * dựng bằng cùng bộ lọc đã bỏ cuối tuần/ngày lễ/ngày ngoài lịch làm việc
   * (xem `tinhSoNgayNghi` trong luat-don.ts, hàm đó chỉ trả về MỘT CON SỐ chứ
   * không phải danh sách ngày). `soNgayNghi` là tổng đã tính cho đúng danh
   * sách đó — bằng `cacNgayNghi.length`, trừ đơn nửa ngày (1 ngày, 0.5 công)
   * thì bằng 0.5. Guard đầu hàm canh hai tham số này khớp nhau.
   */
  async phanBoChoNgayNghi(
    employeeId: string,
    cacNgayNghi: string[],
    soNgayNghi: number,
  ): Promise<PhanBoQuy[]> {
    // `soNgayNghi` và `cacNgayNghi` phải khớp nhau, nếu không phép chia đều ở
    // dưới sinh trọng lượng lẻ (2/3 ngày) — lúc đó số dư còn lại kiểu 1e-16 sẽ
    // lọt qua `co <= 0` và đẻ ra dòng phân bổ rác. Chặn ở đây vì hai tham số
    // này do NƠI GỌI tính, và một sai lệch im lặng ở đó là mất ngày phép thật.
    const ngayDuyNhat = [...new Set(cacNgayNghi)];
    if (ngayDuyNhat.length !== cacNgayNghi.length) {
      throw new BadRequestException('Danh sách ngày nghỉ có ngày trùng');
    }
    const hopLe =
      soNgayNghi === cacNgayNghi.length ||
      (cacNgayNghi.length === 1 && soNgayNghi === 0.5);
    if (!hopLe) {
      throw new BadRequestException(
        `Số ngày nghỉ (${soNgayNghi}) không khớp danh sách ngày nghỉ (${cacNgayNghi.length} ngày)`,
      );
    }

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
        // Báo đúng số dư TẠI THỜI ĐIỂM ngày đang xét bị chặn, không phải số
        // dư gốc lúc bắt đầu hàm: nếu đơn hỏng ở ngày thứ N, các ngày 1..N-1
        // của CHÍNH đơn này đã tiêu bớt quỹ rồi — đọc `conLai` (bộ nhớ) chứ
        // không đọc `q.soNgayConLai` (đã lưu) mới không báo lạc quan. Quỹ đã
        // hết hạn so với `ngay` cũng bị loại khỏi tóm tắt vì nó chưa từng và
        // sẽ không bao giờ trả được cho ngày này.
        const tomTat = quyKhaDung
          .filter((q) => q.hanDung >= ngay)
          .map(
            (q) =>
              `${q.nam}: ${conLai.get(String((q as any)._id)) ?? 0} ngày (hạn ${q.hanDung})`,
          )
          .join('; ');
        throw new ConflictException({
          code: MA_LOI_QUY_PHEP.KHONG_DU_SO_DU,
          message: `Không đủ phép cho ngày ${ngay}. Số dư hiện có — ${tomTat || 'chưa có quỹ nào'}`,
        });
      }
    }

    return [...ketQua.values()];
  }

  /**
   * Tra quỹ theo `_id` VÀ đối chiếu `employeeId`. `phanBoQuy` là dữ liệu
   * `json` snapshot trên `attendance_requests` — chỉ cần một DTO sơ hở ở nơi
   * gọi (Task 8) là một NV có thể trỏ `balanceId` vào quỹ của đồng nghiệp.
   * Bốn hàm vòng đời dưới đây đều đi qua cửa này để chặn việc đó.
   */
  private async layQuyTheoId(
    employeeId: string,
    balanceId: string,
  ): Promise<LeaveBalance> {
    const { ObjectId } = await import('mongodb');
    const quy = await this.repo.findOne({
      where: { _id: new ObjectId(balanceId) as any },
    });
    if (!quy) throw new NotFoundException(`Không tìm thấy quỹ phép ${balanceId}`);
    if (quy.employeeId !== employeeId) {
      throw new ForbiddenException('Phân bổ quỹ không thuộc nhân viên này');
    }
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
   *
   * GIỚI HẠN CÒN LẠI: repo này không dùng transaction ở bất kỳ service nào,
   * và read-modify-write trên `soNgayDangChoDuyet` không nguyên tử — hai đơn
   * nộp GẦN NHƯ ĐỒNG THỜI vẫn có thể cùng đọc một số dư rồi cùng giữ chỗ
   * thành công, vượt quỹ thật. Guard dưới đây chỉ thu hẹp cửa sổ hở (chặn
   * được trường hợp tuần tự — đơn sau thấy đúng số dư đơn trước đã giữ), chứ
   * không đóng hẳn race thật sự đồng thời; muốn đóng hẳn phải có transaction
   * hoặc `$inc` nguyên tử ở tầng DB. Việc đó được park lại, không làm ở đây.
   */
  async giuCho(
    employeeId: string,
    phanBo: PhanBoQuy[],
    _requestId: string,
    _nguoiThucHien: string,
  ): Promise<void> {
    for (const p of phanBo) {
      const quy = await this.layQuyTheoId(employeeId, p.balanceId);
      if (
        quy.soNgayDangChoDuyet + p.soNgay >
        quy.soNgayDuocCap - quy.soNgayDaDung
      ) {
        throw new ConflictException({
          code: MA_LOI_QUY_PHEP.KHONG_DU_SO_DU,
          message: `Quỹ ${quy.nam} không còn đủ để giữ chỗ`,
        });
      }
      quy.soNgayDangChoDuyet += p.soNgay;
      quy.soNgayConLai =
        quy.soNgayDuocCap - quy.soNgayDaDung - quy.soNgayDangChoDuyet;
      await this.repo.save(quy);
    }
  }

  async nhaCho(
    employeeId: string,
    phanBo: PhanBoQuy[],
    _requestId: string,
    _nguoiThucHien: string,
  ): Promise<void> {
    for (const p of phanBo) {
      const quy = await this.layQuyTheoId(employeeId, p.balanceId);
      quy.soNgayDangChoDuyet = Math.max(0, quy.soNgayDangChoDuyet - p.soNgay);
      quy.soNgayConLai =
        quy.soNgayDuocCap - quy.soNgayDaDung - quy.soNgayDangChoDuyet;
      await this.repo.save(quy);
    }
  }

  async chuyenSangDaDung(
    employeeId: string,
    phanBo: PhanBoQuy[],
    requestId: string,
    nguoiThucHien: string,
  ): Promise<void> {
    for (const p of phanBo) {
      const quy = await this.layQuyTheoId(employeeId, p.balanceId);
      // Chặn vượt trần thay vì clamp-rồi-lưu: gọi duyệt hai lần cho cùng một
      // đơn (bấm hai lần, retry sau lỗi mạng) mà clamp thì lần hai vẫn cộng
      // thêm `p.soNgay` vào `soNgayDaDung`, đẩy `soNgayConLai` xuống âm và
      // ghi thêm một dòng sổ `duyet_don` không có thật. Ném lỗi ở đây vừa giữ
      // quỹ không âm, vừa buộc nơi gọi phát hiện đơn đã được duyệt rồi.
      if (quy.soNgayDaDung + p.soNgay > quy.soNgayDuocCap) {
        throw new ConflictException({
          code: MA_LOI_QUY_PHEP.KHONG_DU_SO_DU,
          message: `Duyệt đơn sẽ làm quỹ ${quy.nam} vượt số ngày được cấp`,
        });
      }
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
    employeeId: string,
    phanBo: PhanBoQuy[],
    requestId: string,
    nguoiThucHien: string,
  ): Promise<void> {
    for (const p of phanBo) {
      const quy = await this.layQuyTheoId(employeeId, p.balanceId);
      const truoc = quy.soNgayDaDung;
      const sau = Math.max(0, truoc - p.soNgay);
      if (sau === truoc) continue; // clamp cắn: hoàn lặp lần hai, không ghi sổ rỗng
      quy.soNgayDaDung = sau;
      await this.ghi(quy, {
        soNgay: p.soNgay,
        lyDo: 'huy_don',
        requestId,
        nguoiThucHien,
      });
    }
  }

  async laySoBienDong(balanceId: string): Promise<LeaveBalanceEntry[]> {
    const ds = await this.repoSo.find({ where: { balanceId } as any });
    return ds.sort((a, b) => a.thoiDiem.localeCompare(b.thoiDiem));
  }

  /**
   * Cộng/trừ tay. `ghiChu` BẮT BUỘC: đây là đường duy nhất đổi quỹ mà không có
   * sự kiện nghiệp vụ nào đứng sau, nên lý do phải nằm trong sổ — nếu không,
   * sáu tháng sau không ai biết vì sao NV bị trừ 1 ngày.
   *
   * Nhận `employeeId` làm tham số đầu, giống `giuCho`/`nhaCho`/
   * `chuyenSangDaDung`/`hoanTraDaDung`: đi qua `layQuyTheoId(employeeId, …)`
   * để chặn HR gõ nhầm `balanceId` của một NV khác.
   */
  async dieuChinhTay(
    employeeId: string,
    balanceId: string,
    soNgay: number,
    ghiChu: string,
    nguoiThucHien: string,
  ): Promise<LeaveBalance> {
    if (!ghiChu?.trim()) {
      throw new BadRequestException('Điều chỉnh quỹ phép bắt buộc phải có ghi chú');
    }

    const quy = await this.layQuyTheoId(employeeId, balanceId);
    quy.soNgayDuocCap += soNgay;
    return this.ghi(quy, {
      soNgay,
      lyDo: 'dieu_chinh_tay',
      nguoiThucHien,
      ghiChu: ghiChu.trim(),
    });
  }

  private async quyDangHieuLucCuaNam(nam: number): Promise<LeaveBalance[]> {
    const ds = await this.repo.find({ where: { loaiQuy: LOAI_QUY_PHEP_NAM } as any });
    return ds.filter(
      (q) => q.nam === nam && q.trangThai === 'dang_hieu_luc' && q.isActive !== false,
    );
  }

  async xemTruocDongQuy(nam: number): Promise<
    Array<{
      balanceId: string;
      employeeName?: string;
      employeeCode?: string;
      soNgayMat: number;
    }>
  > {
    const ds = await this.quyDangHieuLucCuaNam(nam);
    return ds
      .filter((q) => q.soNgayConLai > 0)
      .map((q) => ({
        balanceId: String((q as any)._id),
        employeeName: q.employeeName,
        employeeCode: q.employeeCode,
        soNgayMat: q.soNgayConLai,
      }));
  }

  /**
   * Đóng quỹ năm N sau 31/3 năm N+1. CHỈ chạy khi HR bấm, không có job tự
   * động: trừ phép là thao tác phá huỷ, chạy âm thầm mà sai thì cả công ty
   * mất phép và không ai biết cho tới khi có người thắc mắc.
   *
   * Đơn còn `cho_duyet` đang giữ chỗ vẫn giữ nguyên phần giữ chỗ — chỉ số dư
   * còn tự do mới bị thu. Quỹ chuyển `da_dong` nên không nhận đơn mới nữa.
   *
   * Chỉ đọc quỹ đang `dang_hieu_luc` của năm — quỹ đã `da_dong` (kể cả quỹ
   * vừa nhận `hoanTraDaDung` sau khi đóng, xem doc-comment của hàm đó) không
   * bao giờ lọt vào đây nên không bị "hồi sinh" hay bị thu phép lần hai.
   */
  async dongQuy(
    nam: number,
    nguoiThucHien: string,
  ): Promise<{ soQuyDaDong: number; tongNgayMat: number }> {
    const ds = await this.quyDangHieuLucCuaNam(nam);
    let soQuyDaDong = 0;
    let tongNgayMat = 0;

    for (const quy of ds) {
      const mat = quy.soNgayConLai;
      quy.trangThai = 'da_dong';
      if (mat > 0) {
        quy.soNgayDuocCap -= mat;
        await this.ghi(quy, { soNgay: -mat, lyDo: 'het_han', nguoiThucHien });
        tongNgayMat += mat;
      } else {
        quy.soNgayConLai =
          quy.soNgayDuocCap - quy.soNgayDaDung - quy.soNgayDangChoDuyet;
        await this.repo.save(quy);
      }
      soQuyDaDong += 1;
    }

    return { soQuyDaDong, tongNgayMat };
  }

  /**
   * Dựng lại số dư từ sổ và so với `leave_balances`. Lệch = có nơi nào đó ghi
   * quỹ mà không ghi sổ — bug phải sửa ở chỗ ghi, KHÔNG phải sửa số ở đây.
   * Vì vậy hàm này chỉ BÁO CÁO, không tự chữa.
   *
   * Chỉ đối chiếu `soNgayDuocCap - soNgayDaDung` (phần sổ có ghi); phần
   * `soNgayDangChoDuyet` là trạng thái tạm của đơn đang chờ, không vào sổ.
   *
   * Quỹ `da_dong` nhận `hoanTraDaDung` sau khi đóng (xem doc-comment hàm đó)
   * vẫn khớp bình thường ở đây: dòng sổ `het_han` lúc đóng VÀ dòng `huy_don`
   * lúc hoàn đều đã cộng dồn vào `theoSo`, và `ghi()` đã cập nhật lại
   * `soNgayDuocCap`/`soNgayDaDung` tương ứng — không cần biệt lệ theo
   * `trangThai`.
   */
  async doiSoat(employeeId?: string): Promise<
    Array<{
      balanceId: string;
      employeeCode?: string;
      nam: number;
      theoSo: number;
      theoQuy: number;
    }>
  > {
    const ds = employeeId
      ? await this.repo.find({ where: { employeeId } as any })
      : await this.repo.find({ where: {} as any });

    const lech: Array<{
      balanceId: string;
      employeeCode?: string;
      nam: number;
      theoSo: number;
      theoQuy: number;
    }> = [];
    for (const quy of ds) {
      const balanceId = String((quy as any)._id);
      const so = await this.laySoBienDong(balanceId);
      const theoSo = so.reduce((tong, dong) => tong + dong.soNgay, 0);
      const theoQuy = quy.soNgayDuocCap - quy.soNgayDaDung;
      if (Math.abs(theoSo - theoQuy) > 1e-9) {
        lech.push({
          balanceId,
          employeeCode: quy.employeeCode,
          nam: quy.nam,
          theoSo,
          theoQuy,
        });
      }
    }
    return lech;
  }
}
