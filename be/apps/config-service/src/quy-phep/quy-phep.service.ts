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
import { ngayVN } from '../ban-ghi-cham-cong/thoi-gian.util';

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

    const idHienCo = (quy as any)._id ? String((quy as any)._id) : undefined;

    // (P3.8 review round 4, IMPORTANT 6): SỔ TRƯỚC, SỐ DƯ SAU khi quỹ đã có
    // sẵn _id (mọi lần GHI ĐÈ một quỹ đang tồn tại — duyệt/hoàn/điều
    // chỉnh/hết hạn). Thứ tự CŨ (số dư trước, sổ sau) hỏng ở giữa để lại số
    // dư ĐÃ DI CHUYỂN mà sổ không có dấu vết gì — bộ đếm chống trùng
    // (`soRongDaDung`, đọc từ sổ) vẫn thấy net = 0 nên một lần RETRY sẽ ÁP
    // DỤNG LẦN HAI, cộng/trừ chồng lên số đã chồng, và không có transaction
    // nào ở đây để cuộn lại. Đảo thứ tự thì thất bại giữa chừng để lại đúng
    // MỘT dòng sổ không khớp số dư — `doiSoat()` phát hiện đúng lệch đó
    // (theoSo ≠ theoQuy) và CON NGƯỜI dựng lại số dư từ sổ (nguồn sự thật)
    // được, đúng lý do kiến trúc này có sổ append-only ngay từ đầu.
    if (idHienCo) {
      await this.repoSo.save(
        this.repoSo.create({
          balanceId: idHienCo,
          employeeId: quy.employeeId,
          nam: quy.nam,
          loaiQuy: quy.loaiQuy,
          soNgay: bienDong.soNgay,
          lyDo: bienDong.lyDo,
          requestId: bienDong.requestId,
          nguoiThucHien: bienDong.nguoiThucHien,
          thoiDiem: new Date().toISOString(),
          ghiChu: bienDong.ghiChu,
        }) as Partial<LeaveBalanceEntry>,
      );
      return this.repo.save(quy);
    }

    // Quỹ MỚI (capMotNam() tạo lần đầu — chưa có _id): không có balanceId để
    // ghi sổ trước, buộc phải lưu số dư trước để Mongo cấp _id cho quỹ. Nhánh
    // này KHÔNG có nguy cơ double-apply của nhánh trên: capMotNam() tự chống
    // trùng bằng `timQuy()` NGAY TRƯỚC khi gọi ghi() — nếu sổ hỏng sau khi số
    // dư đã lưu, lần gọi lại sẽ thấy quỹ đã tồn tại và bỏ qua (trả null),
    // không tạo/cộng thêm lần hai.
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

  /**
   * Quỹ của một NV dùng cho các khối HIỂN THỊ CHO NGƯỜI DÙNG chọn ngày
   * (khối số dư tự phục vụ, form HR nộp hộ) — KHÔNG dùng cho bảng quản trị
   * đầy đủ (`layTatCaQuy()`), nơi HR cần thấy cả lịch sử quỹ đã đóng.
   *
   * (P3.8 review round 4, IMPORTANT 11): chỉ lọc `isActive` là chưa đủ — một
   * quỹ `da_dong` của 5 năm trước vẫn `isActive` mãi mãi (xoá mềm không áp
   * dụng cho quỹ đã đóng đúng quy trình), nên khối số dư phình thêm một dòng
   * chết mỗi năm. Giữ lại quỹ khi CÒN DÙNG ĐƯỢC (`hanDung >= homNay`) HOẶC
   * còn `dang_hieu_luc` (quỹ chưa đóng, kể cả lỡ trễ hạn đóng) — chỉ loại
   * đúng những quỹ đã `da_dong` VÀ đã qua `hanDung`, tức lịch sử chết thật.
   *
   * `homNay` nhận qua tham số (mặc định giờ thật) để test ghim được mốc so
   * sánh — không rải `new Date()` khắp hàm.
   */
  async layQuyCuaNhanVien(
    employeeId: string,
    loaiQuy = LOAI_QUY_PHEP_NAM,
    homNay: string = ngayVN(new Date()),
  ): Promise<LeaveBalance[]> {
    const ds = await this.repo.find({ where: { employeeId, loaiQuy } as any });
    return ds
      .filter((q) => q.isActive !== false)
      .filter((q) => q.hanDung >= homNay || q.trangThai === 'dang_hieu_luc')
      .sort((a, b) => a.nam - b.nam);
  }

  /** Toàn bộ quỹ còn hiệu lực dữ liệu — dùng cho bảng HR và cho `thoi-viec`/`bang-luong` đọc `soNgayConLai`. */
  async layTatCaQuy(): Promise<LeaveBalance[]> {
    const ds = await this.repo.find({ where: {} as any });
    return ds
      .filter((q) => q.isActive !== false)
      .sort(
        (a, b) =>
          (a.employeeCode ?? '').localeCompare(b.employeeCode ?? '') ||
          a.nam - b.nam,
      );
  }

  private async nhanVienDangHoatDong(): Promise<Employee[]> {
    return this.repoNhanVien.find({ where: { isActive: true } as any });
  }

  /**
   * Lọc NV đủ điều kiện nằm trong lệnh cấp phép đầu năm cho `nam`.
   *
   * (P3.8 review round 4, IMPORTANT 2): trước đây chỉ kiểm `!!nv.ngayChinhThuc`
   * — coi TRƯỜNG này như một cờ boolean. Từ khi `ngayChinhThuc` cho phép ghi
   * một ngày TƯƠNG LAI (kế hoạch hết thử việc nhập lúc tuyển), một NV còn thử
   * việc với `ngayChinhThuc` xa trong tương lai vẫn lọt qua cờ truthy đó và bị
   * tính phép của năm `nam` như thể đã chính thức — lật ngược đúng quyết định
   * spec §3.1 (thử việc = quỹ 0). So bằng CHUỖI với `${nam}-12-31` (không phải
   * boolean) mới đúng bản chất: chỉ NV có `ngayChinhThuc` rơi vào year `nam`
   * trở về trước mới được coi là đã/sẽ chính thức trong năm này.
   *
   * NV bị loại ở đây (còn thử việc, hoặc ngayChinhThuc rơi vào một năm SAU
   * `nam`) sẽ được cấp sau, đúng lúc `moKhoaLenChinhThuc()` chạy — gồm cả
   * phần cấp bù năm trước (ca D của spec).
   */
  private locNhanVienDuocCap(ds: Employee[], nam: number): Employee[] {
    const hanCuoiNam = `${nam}-12-31`;
    return ds.filter(
      (nv) =>
        !!nv.ngayChinhThuc &&
        nv.ngayChinhThuc <= hanCuoiNam &&
        !!nv.ngayVaoLam &&
        nv.trangThai !== 'da_nghi',
    );
  }

  /**
   * Cấp một quỹ cho (NV, năm). `lyDoBoQua` phân biệt HAI lý do khác hẳn nhau
   * của việc không cấp — Task 7 (review round 4): trước đây cả hai đổ chung
   * vào một con số `boQua` khiến FE báo sai "đã có quỹ" cho người thực ra
   * chưa đủ tháng làm việc (0 ngày), và ngược lại.
   */
  private async capMotNam(
    nv: Employee,
    nam: number,
    lyDo: string,
    nguoiThucHien: string,
  ): Promise<{
    quy: LeaveBalance | null;
    lyDoBoQua?: 'da_co_quy' | 'khong_du_thang';
  }> {
    const employeeId = String((nv as any)._id);
    if (await this.timQuy(employeeId, nam)) {
      return { quy: null, lyDoBoQua: 'da_co_quy' };
    }

    const { soNgay, canCuCap } = tinhPhepDuocCap({
      ngayVaoLam: nv.ngayVaoLam!,
      nam,
      ngayLamViecTrongTuan: nv.ngayLamViecTrongTuan,
    });
    if (soNgay <= 0) return { quy: null, lyDoBoQua: 'khong_du_thang' };

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

    return { quy: await this.ghi(quy, { soNgay, lyDo, nguoiThucHien }) };
  }

  async xemTruocCapPhepDauNam(nam: number): Promise<DongXemTruocCap[]> {
    const ds = this.locNhanVienDuocCap(await this.nhanVienDangHoatDong(), nam);
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

  /**
   * Cấp phép đầu năm hàng loạt. Trả BA con số riêng (Task 7, review round 4)
   * thay vì gộp một `boQua` mập mờ: `daCoQuy` (đã có quỹ năm này từ trước —
   * lệnh chạy lại) tách khỏi `boQuaThuViec` (chưa đủ điều kiện có quỹ — còn
   * thử việc, hoặc chưa đủ tháng làm việc để tính ra ngày nào). Gộp hai cái
   * này từng khiến toast báo sai "bỏ qua N người đã có quỹ" cho một người mới
   * vào làm chưa đủ tháng.
   *
   * Chỉ MỘT lần `repoNhanVien.find()` cho cả hàm (trước đây gọi hai lần — một
   * lần gián tiếp qua `nhanVienDuocCap()`, một lần nữa chỉ để đếm tổng).
   */
  async capPhepDauNam(
    nam: number,
    nguoiThucHien: string,
  ): Promise<{ daCap: number; daCoQuy: number; boQuaThuViec: number }> {
    const tatCa = await this.nhanVienDangHoatDong();
    const ds = this.locNhanVienDuocCap(tatCa, nam);

    let daCap = 0;
    let daCoQuy = 0;
    let khongDuThang = 0;

    for (const nv of ds) {
      const { quy, lyDoBoQua } = await this.capMotNam(
        nv,
        nam,
        'cap_dau_nam',
        nguoiThucHien,
      );
      if (quy) daCap += 1;
      else if (lyDoBoQua === 'da_co_quy') daCoQuy += 1;
      else khongDuThang += 1;
    }

    // Người bị `locNhanVienDuocCap()` loại thẳng (còn thử việc, hoặc
    // ngayChinhThuc rơi vào năm sau `nam`) cộng chung với người "đủ điều
    // kiện nhưng ra 0 ngày" — cả hai đều là "chưa đủ điều kiện có quỹ",
    // khác hẳn nhóm `daCoQuy` (đã có quỹ, lệnh chạy trùng).
    const boQuaThuViec = tatCa.length - ds.length + khongDuThang;

    return { daCap, daCoQuy, boQuaThuViec };
  }

  /**
   * Mở khoá quỹ khi NV lên chính thức. Cấp quỹ năm của `ngayChinhThuc` VÀ
   * cấp bù mọi năm trước đó CÒN DÙNG ĐƯỢC mà chưa có quỹ (ca D của spec): NV
   * vào làm T11/2026 nhưng T1/2027 mới chính thức thì các tháng làm việc năm
   * 2026 vẫn có thật — không cấp bù là NV mất trắng do lỗi thời điểm.
   *
   * Idempotent: gọi lại không cấp thêm (dựa `capMotNam` trả null khi đã có quỹ).
   *
   * (P3.8 review round 4, IMPORTANT 2 + 4):
   *
   * 2 — `ngayChinhThuc` là một NGÀY, không phải cờ boolean. Trước đây hàm
   * này chỉ kiểm `!!nv.ngayChinhThuc` rồi cấp NGAY LẬP TỨC, kể cả khi ngày đó
   * nằm ở TƯƠNG LAI (kế hoạch hết thử việc nhập lúc tuyển) — HR gõ xong là
   * một người còn đang thử việc nhận trọn quỹ ngay hôm đó, lật ngược spec
   * §3.1 ("cấp trước rồi NV nghỉ ngang là mất tiền mà không đòi lại được").
   * Chặn ở đây: chưa tới `ngayChinhThuc` (so với `homNay`) thì KHÔNG mở khoá
   * gì cả — trả mảng rỗng, không tạo quỹ nào. `homNay` nhận qua tham số
   * (mặc định giờ thật) để test ghim được mốc so sánh.
   *
   * 4 — Backfill KHÔNG được cấp vào những năm đã chết (`hanDung < homNay`):
   * rollout đổ `ngayChinhThuc` hàng loạt cho NV đang làm lâu năm (ví dụ vào
   * làm 2019, chính thức 2019, nhưng hôm nay đã là 2026) sẽ tạo một quỹ 2019
   * hết hạn từ 2020 mà KHÔNG tạo quỹ năm nay — `layQuyCuaNhanVien` không lọc
   * hạn dùng ở tầng entity nên khối số dư nhân viên sẽ hiện một quỹ chết như
   * còn dùng được. Bound vòng lặp tới `max(namChinhThuc, namHomNay)` rồi lọc
   * bỏ từng năm đã hết hạn NGAY TRONG vòng lặp — luôn đảm bảo năm hiện tại
   * (nếu còn hạn, luôn đúng) được xét tới dù `namChinhThuc` đã lùi xa.
   */
  async moKhoaLenChinhThuc(
    employeeId: string,
    nguoiThucHien: string,
    homNay: string = ngayVN(new Date()),
  ): Promise<LeaveBalance[]> {
    const { ObjectId } = await import('mongodb');
    const nv = await this.repoNhanVien.findOne({
      where: { _id: new ObjectId(employeeId) as any },
    });
    if (!nv) throw new NotFoundException('Không tìm thấy nhân viên');
    if (!nv.ngayChinhThuc || !nv.ngayVaoLam) return [];
    if (nv.ngayChinhThuc > homNay) return [];

    const namVao = Number(nv.ngayVaoLam.slice(0, 4));
    const namChinhThuc = Number(nv.ngayChinhThuc.slice(0, 4));
    const namHomNay = Number(homNay.slice(0, 4));
    const namCuoiBackfill = Math.max(namChinhThuc, namHomNay);

    const daCap: LeaveBalance[] = [];
    for (let nam = namVao; nam <= namCuoiBackfill; nam += 1) {
      if (hanDungCuaNam(nam) < homNay) continue; // quỹ năm này đã chết, cấp cũng vô nghĩa

      const lyDo =
        nam === namChinhThuc
          ? 'cap_len_chinh_thuc'
          : nam < namChinhThuc
            ? 'cap_bu_nam_truoc'
            // nam > namChinhThuc: chỉ xảy ra khi rollout điền ngayChinhThuc
            // trễ (namHomNay > namChinhThuc) — đây thực chất là phần cấp
            // đầu năm bình thường mà NV lẽ ra đã nhận qua capPhepDauNam() nếu
            // hồ sơ có ngayChinhThuc từ đầu năm.
            : 'cap_dau_nam';
      const { quy } = await this.capMotNam(nv, nam, lyDo, nguoiThucHien);
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
   * Lần duyệt trước cho đúng (quỹ này, đơn này) còn hiệu lực không (P3.8 fix
   * round 3 — vá lại round 2).
   *
   * Round 2 dùng "đã từng có dòng `duyet_don`/`huy_don` chưa" làm khoá chống
   * trùng — SAI về bản chất: sổ ghi LỊCH SỬ, không ghi TRẠNG THÁI. Chuỗi
   * duyệt → từ chối → mở lại → duyệt là HỢP LỆ (chính app hướng dẫn HR đi
   * qua chuỗi này khi chặn chuyển thẳng `da_duyet → cho_duyet`), và lần
   * duyệt THỨ HAI trong chuỗi đó PHẢI thực sự chạy — round 2 lại thấy dòng
   * `duyet_don` từ lần duyệt ĐẦU TIÊN và bỏ qua, để chỗ giữ (`giuCho` ở bước
   * mở lại) kẹt vĩnh viễn trong `soNgayDangChoDuyet`, không bao giờ được
   * nhả (huỷ đơn sau đó cũng bị bản kiểm tra cũ — tiền thân của
   * `soRongDaDung()` bên dưới — chặn nhầm vì đã có dòng `huy_don` từ lần từ
   * chối trước).
   *
   * Số RÒNG mới trả lời đúng câu hỏi "hiện đang tiêu hay đã hoàn": mỗi dòng
   * `duyet_don` +1, mỗi dòng `huy_don` −1. Vẫn chặn được đúng ca round 2
   * nhắm tới (vòng lặp nhiều quỹ hỏng nửa chừng rồi thử lại: quỹ đã xong có
   * net > 0 ngay từ lần áp dụng đầu, quỹ chưa tới có net = 0) — chỉ khác là
   * không còn nhầm "đã từng" với "vẫn còn hiệu lực".
   */
  private async soRongDaDung(
    balanceId: string,
    requestId: string,
  ): Promise<number> {
    const ds = await this.repoSo.find({ where: { balanceId, requestId } as any });
    return ds.reduce((tong, dong) => {
      if (dong.lyDo === 'duyet_don') return tong + 1;
      if (dong.lyDo === 'huy_don') return tong - 1;
      return tong;
    }, 0);
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

  /**
   * (P3.8 review round 4, IMPORTANT 5): nhả chỗ trên một quỹ ĐÃ ĐÓNG
   * (`dongQuy()` thu hồi phần rảnh nhưng CỐ Ý giữ nguyên phần đang giữ chỗ —
   * xem doc-comment `dongQuy()`) không được để phần vừa nhả "sống lại". Nếu
   * không xử lý, `soNgayConLai` của một quỹ `da_dong` sẽ hiện > 0 dù không
   * đơn nào tiêu được nó (`phanBoChoNgayNghi` chỉ chọn quỹ `dang_hieu_luc`)
   * — và `soNgayConLai` chính là con số spec §11 hứa cho `thoi-viec`/
   * `bang-luong` đọc để trả tiền phép chưa nghỉ, nên "không tiêu được qua
   * đơn" không đồng nghĩa "vô hại": nó vẫn có thể bị trả thành tiền thật.
   * `requestId`/`nguoiThucHien` giờ ĐƯỢC dùng (bỏ tiền tố `_`) để ghi đúng
   * dòng `het_han` bù này vào sổ, truy được về đúng đơn gây ra nó.
   */
  async nhaCho(
    employeeId: string,
    phanBo: PhanBoQuy[],
    requestId: string,
    nguoiThucHien: string,
  ): Promise<void> {
    for (const p of phanBo) {
      const quy = await this.layQuyTheoId(employeeId, p.balanceId);
      quy.soNgayDangChoDuyet = Math.max(0, quy.soNgayDangChoDuyet - p.soNgay);
      quy.soNgayConLai =
        quy.soNgayDuocCap - quy.soNgayDaDung - quy.soNgayDangChoDuyet;

      if (quy.trangThai === 'da_dong' && quy.soNgayConLai > 0) {
        const mat = quy.soNgayConLai;
        quy.soNgayDuocCap -= mat;
        await this.ghi(quy, {
          soNgay: -mat,
          lyDo: 'het_han',
          nguoiThucHien,
          requestId,
        });
      } else {
        await this.repo.save(quy);
      }
    }
  }

  async chuyenSangDaDung(
    employeeId: string,
    phanBo: PhanBoQuy[],
    requestId: string,
    nguoiThucHien: string,
  ): Promise<void> {
    for (const p of phanBo) {
      // (P3.8 fix round 3): vòng lặp này không nguyên tử theo `phanBo` — nếu
      // lần chạy trước đã áp dụng xong cho quỹ này rồi mới hỏng ở MỘT quỹ
      // khác trong CÙNG `phanBo`, lần gọi lại (retry, hoặc "duyệt lại" sau
      // khi updateStatus() khôi phục đơn về cho_duyet) phải bỏ qua quỹ đã
      // xong này. Nhưng "đã xong" nghĩa là NET > 0 (lần duyệt gần nhất còn
      // hiệu lực), KHÔNG phải "đã từng có dòng duyet_don" — nếu không, chuỗi
      // duyệt→từ chối→mở lại→duyệt (hợp lệ, do chính app hướng dẫn HR đi
      // qua) sẽ bị bỏ qua NHẦM ở lần duyệt thứ hai, xem doc-comment của
      // `soRongDaDung()`.
      if ((await this.soRongDaDung(p.balanceId, requestId)) > 0) continue;

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
      // (P3.8 fix round 3): xem doc-comment của `soRongDaDung()`. Ở đây câu
      // hỏi đúng là "hiện có gì đã tiêu để mà hoàn không" — net <= 0 nghĩa
      // là không (chưa từng duyệt, hoặc đã hoàn xong từ lần huỷ trước) →
      // bỏ qua. Giữ NGUYÊN clamp `sau === truoc` bên dưới như một lớp phòng
      // thủ thứ hai (trường hợp `soNgayDaDung` đã về đúng mức mong đợi qua
      // một đường khác) — hai lớp không loại trừ nhau.
      if ((await this.soRongDaDung(p.balanceId, requestId)) <= 0) continue;

      const quy = await this.layQuyTheoId(employeeId, p.balanceId);
      const truoc = quy.soNgayDaDung;
      const sau = Math.max(0, truoc - p.soNgay);
      if (sau === truoc) continue; // clamp cắn: hoàn lặp lần hai, không ghi sổ rỗng
      quy.soNgayDaDung = sau;
      const daLuu = await this.ghi(quy, {
        soNgay: p.soNgay,
        lyDo: 'huy_don',
        requestId,
        nguoiThucHien,
      });

      // (P3.8 review round 4, IMPORTANT 5): xem doc-comment tương ứng ở
      // `nhaCho()` — hoàn phép vào một quỹ ĐÃ ĐÓNG (đơn đã duyệt trước lúc
      // đóng, bị huỷ SAU khi đóng) làm `soNgayConLai` sống lại dù không đơn
      // nào tiêu được nó. Hết hạn NGAY phần vừa hồi sinh để số dư về đúng 0.
      if (daLuu.trangThai === 'da_dong' && daLuu.soNgayConLai > 0) {
        const mat = daLuu.soNgayConLai;
        daLuu.soNgayDuocCap -= mat;
        await this.ghi(daLuu, {
          soNgay: -mat,
          lyDo: 'het_han',
          nguoiThucHien,
          requestId,
        });
      }
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
    // (P3.8 review round 4, IMPORTANT 8): modal FE mặc định ô số ngày = 0 —
    // một lần bấm Lưu lỡ tay (chưa kịp gõ số) sẽ ghi một dòng sổ RỖNG, vô
    // nghĩa nhưng vẫn chiếm một dòng lịch sử vĩnh viễn (sổ append-only,
    // không sửa/xoá được).
    if (soNgay === 0) {
      throw new BadRequestException('Điều chỉnh quỹ phép phải khác 0 ngày');
    }

    const quy = await this.layQuyTheoId(employeeId, balanceId);
    // Chặn TRƯỚC khi ghi: `soNgayDuocCap` sau điều chỉnh không được thấp hơn
    // `soNgayDaDung` — đó là trạng thái KHÔNG THỂ CÓ THẬT (đã tiêu nhiều hơn
    // số được cấp) và không có cách nào tự hồi phục, vì `soNgayDaDung` chỉ
    // giảm qua `hoanTraDaDung()` (một sự kiện nghiệp vụ khác, không phải điều
    // chỉnh tay này).
    //
    // CỐ Ý không đưa `soNgayDangChoDuyet` vào phép so sánh này (khác với công
    // thức `soNgayConLai` dùng ở mọi nơi khác trong file): phần đang giữ chỗ
    // là trạng thái TẠM — HR hạ `soNgayDuocCap` xuống dưới mức đang giữ (ví
    // dụ sửa lại một lần cấp nhầm quá tay trong lúc đơn của NV còn chờ duyệt)
    // là một thao tác HỢP LỆ và đã được test ở
    // 'duyệt hỏng ở quỹ thứ hai...' phía trên: `soNgayConLai` âm tạm thời ở
    // đây không phải dữ liệu hỏng, nó đúng là "không đủ cho các đơn đang chờ"
    // — và `chuyenSangDaDung()` đã có guard riêng chặn đúng lúc duyệt.
    const duocCapSauDieuChinh = quy.soNgayDuocCap + soNgay;
    if (duocCapSauDieuChinh < quy.soNgayDaDung) {
      throw new ConflictException({
        code: MA_LOI_QUY_PHEP.KHONG_DU_SO_DU,
        message: `Điều chỉnh sẽ làm số ngày được cấp của quỹ ${quy.nam} thấp hơn số đã dùng (${quy.soNgayDaDung} ngày đã dùng, còn ${duocCapSauDieuChinh} sau điều chỉnh)`,
      });
    }

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
