import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import type { Employee } from "@/services/employeeService";
import type { LaborContract } from "@/services/laborContractService";
import type { AttendanceRequest } from "@/services/attendanceRequestService";
import type { Resignation } from "@/services/resignationService";
import { tinhChiSo, hopDongSapHetHan, bienDongTheoThang, demTheo } from "./tongQuan";

const HOM_NAY = dayjs("2026-09-10");

const nv = (x: Partial<Employee>): Employee =>
  ({ id: Math.random().toString(), employeeId: "NV", hoTen: "A", cccd: "", loaiHopDong: "chinh_thuc", trangThai: "dang_lam_viec", isActive: true, ...x }) as Employee;
const hd = (x: Partial<LaborContract>): LaborContract =>
  ({ id: Math.random().toString(), contractNo: "HĐ", employeeId: "e", loaiHopDong: "xac_dinh_thoi_han", trangThai: "dang_hieu_luc", isActive: true, ...x }) as LaborContract;
const tv = (x: Partial<Resignation>): Resignation =>
  ({ id: Math.random().toString(), employeeId: "e", ngayNopDon: "2026-08-01", loaiThoiViec: "tu_nguyen", trangThai: "hoan_thanh", isActive: true, ...x }) as Resignation;

describe("tinhChiSo", () => {
  it("nguồn vắng (không có quyền) cho null chứ không cho 0", () => {
    const cs = tinhChiSo({ nhanVien: [nv({})] }, HOM_NAY);
    expect(cs.tongNhanSu).toBe(1);
    expect(cs.hopDongSapHetHan).toBeNull();
    expect(cs.donChoDuyet).toBeNull();
    expect(cs.nghiTrongThang).toBeNull();
  });

  it("đếm đúng từng nhóm trạng thái", () => {
    const cs = tinhChiSo(
      {
        nhanVien: [
          nv({ trangThai: "dang_lam_viec", ngayVaoLam: "2026-09-02" }),
          nv({ trangThai: "dang_lam_viec", loaiHopDong: "thu_viec" }),
          nv({ trangThai: "tam_nghi" }),
          nv({ trangThai: "da_nghi", loaiHopDong: "thu_viec" }),
        ],
        donChamCong: [
          { trangThai: "cho_duyet" } as AttendanceRequest,
          { trangThai: "da_duyet" } as AttendanceRequest,
        ],
        thoiViec: [tv({ ngayLamViecCuoi: "2026-09-05" }), tv({ ngayLamViecCuoi: "2026-09-06", trangThai: "da_duyet" })],
      },
      HOM_NAY,
    );
    expect(cs.tongNhanSu).toBe(3);
    expect(cs.dangLamViec).toBe(2);
    // Người đã nghỉ không tính vào thử việc hiện có.
    expect(cs.thuViec).toBe(1);
    expect(cs.tamNghi).toBe(1);
    expect(cs.vaoTrongThang).toBe(1);
    // Đơn mới "đã duyệt" chưa phải nghỉ thật.
    expect(cs.nghiTrongThang).toBe(1);
    expect(cs.donChoDuyet).toBe(1);
  });
});

describe("hopDongSapHetHan", () => {
  it("chỉ lấy hợp đồng đang hiệu lực còn ≤ 30 ngày, gồm cả đã quá hạn, gần hạn trước", () => {
    const ds = hopDongSapHetHan(
      [
        hd({ contractNo: "xa", ngayKetThuc: "2026-12-31" }),
        hd({ contractNo: "gan", ngayKetThuc: "2026-09-20" }),
        hd({ contractNo: "qua-han", ngayKetThuc: "2026-09-01" }),
        hd({ contractNo: "khong-thoi-han" }),
        hd({ contractNo: "da-thanh-ly", ngayKetThuc: "2026-09-15", trangThai: "da_thanh_ly" }),
      ],
      HOM_NAY,
    );
    expect(ds.map((x) => x.hopDong.contractNo)).toEqual(["qua-han", "gan"]);
    expect(ds[0].conLai).toBe(-9);
    expect(ds[1].conLai).toBe(10);
  });
});

describe("bienDongTheoThang", () => {
  it("12 điểm, tháng cuối là tháng hiện tại, cột ra âm", () => {
    const ds = bienDongTheoThang(
      [nv({ ngayVaoLam: "2025-01-01" }), nv({ ngayVaoLam: "2026-09-03" }), nv({})],
      [tv({ ngayLamViecCuoi: "2026-08-15" })],
      HOM_NAY,
    );
    expect(ds).toHaveLength(12);
    expect(ds[11].ky).toBe("2026-09");
    expect(ds[11].thang).toBe("T9");
    expect(ds[11].vao).toBe(1);
    expect(ds[10].ra).toBe(-1);
  });

  it("quy mô tháng này bằng đúng số nhân sự đang có, tháng trước tính lùi", () => {
    const ds = bienDongTheoThang(
      [
        nv({ ngayVaoLam: "2026-09-03" }),
        nv({}),
        // Chuyển "đã nghỉ" bằng tay, không có đơn thôi việc — không được đếm.
        nv({ trangThai: "da_nghi" }),
      ],
      [tv({ ngayLamViecCuoi: "2026-08-15" })],
      HOM_NAY,
    );
    expect(ds[11].tong).toBe(2);
    // Tháng 8: bỏ người vào tháng 9 (−1), thêm lại người nghỉ trong tháng 9 (0).
    expect(ds[10].tong).toBe(1);
    // Tháng 7: thêm lại người nghỉ tháng 8.
    expect(ds[9].tong).toBe(2);
  });
});

describe("demTheo", () => {
  it("gom khoá rỗng và xếp nhiều nhất trước", () => {
    const ds = demTheo(["a", "b", "a", "", null], (x) => x);
    expect(ds).toEqual([
      { ten: "a", soLuong: 2 },
      { ten: "Chưa xếp", soLuong: 2 },
      { ten: "b", soLuong: 1 },
    ]);
  });
});
