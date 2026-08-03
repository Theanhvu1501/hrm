import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AttendanceRequest,
  CauHinhLuong,
  DongLuongThemGio,
  Employee,
} from '@app/entities';
import { tinhDongThemGio } from '@app/core';
import { CapNhatDongThemGioDto } from './dto';

/** Cấu hình làm thêm đã resolve, hoặc `null` khi công ty chưa khai. */
interface CauHinhThemGio {
  congChuan: number;
  soGioMoiNgay: number;
  cheDoBu: string;
  heSoTra: Record<string, number>;
  uuTienLoai: string[];
}

/**
 * Bảng thanh toán tiền làm thêm giờ (mẫu 03-LĐTL) — tổng hợp theo kỳ từ đơn
 * OT đã duyệt.
 *
 * Tách khỏi `BangLuong_Service` chứ không nhét vào đó: file kia đã lo bảng
 * lương chính và hai bảng này chốt kỳ ĐỘC LẬP nhau.
 */
@Injectable()
export class ThemGio_Service {
  private readonly logger = new Logger(ThemGio_Service.name);

  constructor(
    @InjectRepository(DongLuongThemGio)
    private readonly repo: Repository<DongLuongThemGio>,
    @InjectRepository(AttendanceRequest)
    private readonly donRepo: Repository<AttendanceRequest>,
    @InjectRepository(Employee)
    private readonly nvRepo: Repository<Employee>,
    @InjectRepository(CauHinhLuong)
    private readonly cauHinhRepo: Repository<CauHinhLuong>,
  ) {}

  /**
   * `null` = công ty chưa khai `lamThem`. Đi qua cùng một cửa mà
   * `QuyGio_Service` dùng để quyết có tích quỹ hay không — tích và trả tiền
   * phải luôn đồng thanh trả lời "tính năng đã bật hay chưa", nếu không hai
   * bên lệch pha và bảng lương trả tiền cho giờ chưa từng vào quỹ.
   */
  private async layCauHinh(): Promise<CauHinhThemGio | null> {
    const rows = await this.cauHinhRepo.find({});
    const ch: any = rows[0];
    if (!ch?.lamThem) return null;
    return {
      congChuan: ch.congChuan ?? 26,
      soGioMoiNgay: ch.soGioMoiNgay ?? 8,
      cheDoBu: ch.lamThem.cheDoBu,
      heSoTra: ch.lamThem.heSoTra ?? {},
      uuTienLoai: ch.lamThem.uuTienLoai ?? [],
    };
  }

  /** Đơn OT được TRẢ TIỀN trong kỳ, theo `cheDoBu` (spec P4.2c §2.3). */
  private locDonTraTien(
    dons: AttendanceRequest[],
    cheDoBu: string,
  ): AttendanceRequest[] {
    // Giờ đã vào quỹ nghỉ bù — bảng lương không trả gì.
    if (cheDoBu === 'chi_nghi_bu') return [];
    // Người nộp tự chọn từng đơn; đơn không khai coi như KHÔNG chọn tiền.
    if (cheDoBu === 'nhan_vien_chon') {
      return dons.filter((d) => d.hinhThucBu === 'tien');
    }
    // chi_tien: trả toàn bộ. nghi_bu_va_chenh: trả toàn bộ nhưng hệ số − 1
    // (xử lý bằng `truMotDonVi` ở nơi gọi).
    return dons;
  }

  /** Cộng giờ theo loại từ `phanBoOt`; đơn cũ chưa backfill rơi về scalar. */
  private congGioTheoLoai(dons: AttendanceRequest[]): Record<string, number> {
    const gio: Record<string, number> = {};
    for (const don of dons) {
      if (don.phanBoOt?.length) {
        for (const p of don.phanBoOt) {
          gio[p.loaiNgayOt] = (gio[p.loaiNgayOt] ?? 0) + p.soGio;
        }
      } else if (don.loaiNgayOt && don.soGioOt) {
        gio[don.loaiNgayOt] = (gio[don.loaiNgayOt] ?? 0) + don.soGioOt;
      }
    }
    return gio;
  }

  /**
   * Tổng hợp bảng thanh toán tiền làm thêm của một kỳ.
   *
   * Bỏ qua dòng đã `chot` (snapshot bất biến) và dòng kế toán đã `suaTay`
   * (tổng hợp lại là thao tác thường ngày; ghi đè số họ vừa sửa là mất việc
   * của họ) — cùng quy ước `BangLuong_Service.tongHop()`.
   */
  async tongHop(thang: string): Promise<DongLuongThemGio[]> {
    const ch = await this.layCauHinh();
    if (!ch) {
      this.logger.warn(
        `Bỏ qua tổng hợp bảng lương thêm giờ kỳ ${thang}: công ty chưa khai cấu hình làm thêm`,
      );
      return [];
    }

    const employees = await this.nvRepo.find({
      where: { isActive: true } as any,
    });
    const tatCaDon = await this.donRepo.find({
      where: {
        loaiDon: 'lam_them_gio',
        trangThai: 'da_duyet',
        isActive: true,
      } as any,
    });
    const donTrongKy = tatCaDon.filter((d) => (d.ngay ?? '').startsWith(thang));

    const rows: DongLuongThemGio[] = [];

    for (const emp of employees) {
      const employeeId = String((emp as any)._id);
      const cu = (await this.repo.find({ where: { thang, employeeId } as any }))[0];

      if (cu && (cu.trangThai === 'chot' || cu.suaTay)) {
        rows.push(cu);
        continue;
      }

      const donCuaNV = this.locDonTraTien(
        donTrongKy.filter((d) => String(d.employeeId) === employeeId),
        ch.cheDoBu,
      );

      const kq = tinhDongThemGio({
        luongThang: emp.luongThoaThuan ?? 0,
        congChuan: ch.congChuan,
        soGioMoiNgay: ch.soGioMoiNgay,
        gioTheoLoai: this.congGioTheoLoai(donCuaNV),
        heSoTra: ch.heSoTra,
        truMotDonVi: ch.cheDoBu === 'nghi_bu_va_chenh',
      });

      const row =
        cu ??
        this.repo.create({
          thang,
          employeeId,
          employeeName: emp.hoTen,
          employeeCode: emp.employeeId,
          trangThai: 'nhap',
          suaTay: false,
          isActive: true,
        } as Partial<DongLuongThemGio>);

      row.luongThang = emp.luongThoaThuan ?? 0;
      row.congChuan = ch.congChuan;
      row.soGioMoiNgay = ch.soGioMoiNgay;
      row.donGiaNgay = kq.donGiaNgay;
      row.donGiaGio = kq.donGiaGio;
      row.theoLoai = kq.theoLoai;
      row.tongTien = kq.tongTien;

      // Cột "Số ngày nghỉ bù" của mẫu 03-LĐTL là THÔNG TIN. Biểu mẫu gốc trừ
      // nó vào Thực nhận vì giả định công ty trả tiền OT rồi lấy lại phần đã
      // nghỉ bù. Trong cả bốn chế độ của ta, một giờ công KHÔNG BAO GIỜ vừa
      // vào quỹ vừa được trả tiền (`nghi_bu_va_chenh` tách 1.0 / phần chênh,
      // không chồng nhau), nên trừ thêm là trừ hai lần của người lao động.
      row.gioNghiBu = row.gioNghiBu ?? 0;
      row.tienNghiBu = 0;
      row.thucNhan = kq.tongTien;

      // P4.2c-2 mới đọc quỹ hết hạn và trả tiền cho nó.
      row.gioOtHetHan = row.gioOtHetHan ?? 0;

      rows.push(await this.repo.save(row));
    }

    return rows;
  }
  async danhSach(thang: string): Promise<DongLuongThemGio[]> {
    return this.repo.find({ where: { thang, isActive: true } as any });
  }

  /**
   * Sửa tay số GIỜ từng loại rồi TÍNH LẠI tiền. Không nhận thành tiền trực
   * tiếp: một con số tiền không suy ra được từ giờ × đơn giá × hệ số là con số
   * không ai đối soát được về sau — trên một biểu mẫu có chỗ ký của kế toán
   * và giám đốc.
   */
  async capNhatDong(
    id: string,
    dto: CapNhatDongThemGioDto,
  ): Promise<DongLuongThemGio> {
    const { ObjectId } = await import('mongodb');
    const row = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!row) throw new NotFoundException(`Không tìm thấy dòng ${id}`);
    if (row.trangThai === 'chot') {
      throw new BadRequestException('Dòng đã chốt — mở lại kỳ trước khi sửa');
    }

    const ch = await this.layCauHinh();
    if (!ch) {
      throw new BadRequestException('Công ty chưa khai cấu hình làm thêm');
    }

    if (dto.theoLoai) {
      const kq = tinhDongThemGio({
        luongThang: row.luongThang,
        congChuan: row.congChuan,
        soGioMoiNgay: row.soGioMoiNgay,
        gioTheoLoai: dto.theoLoai,
        heSoTra: ch.heSoTra,
        truMotDonVi: ch.cheDoBu === 'nghi_bu_va_chenh',
      });
      row.donGiaNgay = kq.donGiaNgay;
      row.donGiaGio = kq.donGiaGio;
      row.theoLoai = kq.theoLoai;
      row.tongTien = kq.tongTien;
      row.thucNhan = kq.tongTien - (row.tienNghiBu ?? 0);
    }

    if (dto.gioNghiBu !== undefined) row.gioNghiBu = dto.gioNghiBu;

    row.suaTay = true;
    return this.repo.save(row);
  }

  async chot(thang: string): Promise<{ soDong: number }> {
    return this.doiTrangThai(thang, 'nhap', 'chot');
  }

  async moLai(thang: string): Promise<{ soDong: number }> {
    return this.doiTrangThai(thang, 'chot', 'nhap');
  }

  private async doiTrangThai(
    thang: string,
    tu: string,
    den: string,
  ): Promise<{ soDong: number }> {
    const rows = await this.repo.find({
      where: { thang, trangThai: tu, isActive: true } as any,
    });
    for (const r of rows) {
      r.trangThai = den;
      await this.repo.save(r);
    }
    return { soDong: rows.length };
  }
}
