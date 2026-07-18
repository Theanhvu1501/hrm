/**
 * Seed DATA MẪU cho module Bếp ăn (lĩnh vực Mầm non) — để demo/hình dung quy trình.
 *
 * Tạo trọn bộ DATA ĐẦU VÀO cho 1 chu kỳ:
 *   - NCC thực phẩm (đối tượng)              -> doi_tuong
 *   - 3 hàng hóa thực phẩm (cachXuat)        -> hang_hoa_vat_tu   (tkKho 152)
 *   - 1 định mức tiền ăn (ngân sách)         -> dinh_muc_tien_an
 *   - 1 công thức định lượng (3 nguyên liệu) -> cong_thuc_dinh_luong
 *   - 1 đề xuất mua (trạng thái CHO_DUYET)   -> de_xuat_mua_thuc_pham
 *   - 3 phiếu điểm danh ăn (3 ngày gần nhất) -> diem_danh_an
 *
 * KHÔNG sinh bút toán / kho. Người dùng tự bấm trên UI để THẤY quy trình:
 *   Đề xuất mua -> Duyệt -> Nhận hàng  (⇒ nhập kho + Nợ152/Có331)
 *   Bảng kiểm soát -> Chốt tiêu hao    (⇒ xuất kho + Nợ632/Có152)
 *
 * - Tất cả code/ma prefix "MAU-" để dễ nhận diện & xóa (xem seed-bep-an-sample-cleanup.js).
 * - Idempotent: bỏ qua bản ghi đã tồn tại (theo code/ma/soPhieu) → chạy lại an toàn.
 * - tenantId: tự tra theo tên công ty (TENANT_NAME, mặc định "Danh Lâm").
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÁCH CHẠY (từ máy local, qua SSH tới server prod):
 *
 *   cat be/scripts/seed-bep-an-sample.js | ssh kt "docker exec -i mongo mongosh \
 *     'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 *
 * Đổi công ty đích:  ... ssh kt "... -e TENANT_NAME docker exec -i -e TENANT_NAME mongo ..."
 * hoặc sửa biến TENANT_NAME bên dưới.
 * ─────────────────────────────────────────────────────────────────────────
 */

var TENANT_NAME =
  (typeof process !== "undefined" && process.env.TENANT_NAME) || "Danh Lâm";

// ── Tra tenantId theo tên công ty ────────────────────────────────────────
var tenant = db.tenants.findOne({ name: { $regex: TENANT_NAME, $options: "i" } });
if (!tenant) {
  print('LỖI: không tìm thấy tenant khớp tên "' + TENANT_NAME + '".');
  print("Danh sách tenant hiện có:");
  db.tenants.find({}, { name: 1 }).forEach(function (t) {
    print("  - " + t._id + "  " + t.name);
  });
  quit(1);
}
var TID = tenant._id instanceof ObjectId ? tenant._id.toString() : String(tenant._id);
print('Tenant: "' + tenant.name + '"  (tenantId=' + TID + ")");
print("");

var now = new Date();
function daysAgo(n) {
  return new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
}
var ins = 0, skip = 0;

// insertIfAbsent: chèn nếu chưa có bản ghi khớp `match` trong tenant.
function upsert(colName, match, doc, label) {
  var col = db.getCollection(colName);
  var q = Object.assign({ tenantId: TID }, match);
  if (col.countDocuments(q) > 0) {
    print("  [skip] " + label + " (đã tồn tại)");
    skip++;
    return;
  }
  doc.tenantId = TID;
  doc.isActive = true;
  doc.createdAt = now;
  doc.updatedAt = now;
  col.insertOne(doc);
  print("  [ins ] " + label);
  ins++;
}

// ── 1. NCC thực phẩm ─────────────────────────────────────────────────────
print("1) Nhà cung cấp:");
upsert("doi_tuong", { ma: "MAU-NCC01" }, {
  loai: ["NHA_CUNG_CAP"],
  ma: "MAU-NCC01",
  ten: "Cửa hàng thực phẩm sạch (mẫu)",
  maSoThue: "0000000000",
  diaChi: "—",
}, "NCC MAU-NCC01");

// ── 2. Hàng hóa thực phẩm (cachXuat = DINH_LUONG, tkKho 152) ─────────────
print("2) Hàng hóa thực phẩm:");
var HH = [
  { ma: "MAU-TP-GAO", ten: "Gạo tẻ (mẫu)", donGia: 20000 },
  { ma: "MAU-TP-THIT", ten: "Thịt heo (mẫu)", donGia: 120000 },
  { ma: "MAU-TP-RAU", ten: "Rau cải (mẫu)", donGia: 15000 },
];
HH.forEach(function (h) {
  upsert("hang_hoa_vat_tu", { ma: h.ma }, {
    ma: h.ma,
    ten: h.ten,
    tinhChat: "NGUYEN_LIEU",
    donViTinhTen: "kg",
    tkKho: "152",
    donGia: h.donGia,
    cachXuat: "DINH_LUONG",
  }, "Hàng hóa " + h.ma);
});

// ── 3. Định mức tiền ăn (ngân sách 25.000đ/suất/ngày) ────────────────────
print("3) Định mức tiền ăn:");
upsert("dinh_muc_tien_an", { code: "MAU-DM-CHUAN" }, {
  code: "MAU-DM-CHUAN",
  ten: "Suất chuẩn 25.000đ/ngày (mẫu)",
  phamVi: "CHUNG",
  mucTien: 25000,
  hieuLucTu: daysAgo(30),
}, "Định mức MAU-DM-CHUAN (25.000đ)");

// ── 4. Công thức định lượng (định lượng/suất) ────────────────────────────
print("4) Công thức định lượng:");
upsert("cong_thuc_dinh_luong", { code: "MAU-CT-CHUAN" }, {
  code: "MAU-CT-CHUAN",
  ten: "Công thức suất chuẩn (mẫu)",
  ganTheo: "SUAT_CHUAN",
  chiTiet: [
    { hangHoaMa: "MAU-TP-GAO", hangHoaTen: "Gạo tẻ (mẫu)", dinhLuong: 0.08, donViTinh: "kg", cachXuat: "DINH_LUONG" },
    { hangHoaMa: "MAU-TP-THIT", hangHoaTen: "Thịt heo (mẫu)", dinhLuong: 0.05, donViTinh: "kg", cachXuat: "DINH_LUONG" },
    { hangHoaMa: "MAU-TP-RAU", hangHoaTen: "Rau cải (mẫu)", dinhLuong: 0.06, donViTinh: "kg", cachXuat: "DINH_LUONG" },
  ],
}, "Công thức MAU-CT-CHUAN (gạo 80g + thịt 50g + rau 60g /suất)");

// ── 5. Đề xuất mua (CHO_DUYET — để user tự Duyệt → Nhận hàng) ────────────
print("5) Đề xuất mua thực phẩm:");
var ctDx = [
  { stt: 1, hangHoaMa: "MAU-TP-GAO", hangHoaTen: "Gạo tẻ (mẫu)", donViTinh: "kg", soLuong: 20, donGia: 20000, thanhTien: 400000 },
  { stt: 2, hangHoaMa: "MAU-TP-THIT", hangHoaTen: "Thịt heo (mẫu)", donViTinh: "kg", soLuong: 10, donGia: 120000, thanhTien: 1200000 },
  { stt: 3, hangHoaMa: "MAU-TP-RAU", hangHoaTen: "Rau cải (mẫu)", donViTinh: "kg", soLuong: 15, donGia: 15000, thanhTien: 225000 },
];
var tongTien = ctDx.reduce(function (s, x) { return s + x.thanhTien; }, 0); // 1.825.000
upsert("de_xuat_mua_thuc_pham", { soPhieu: "MAU-DX01" }, {
  soPhieu: "MAU-DX01",
  ngayDeXuat: daysAgo(3),
  nguoiDeXuat: "Bếp (mẫu)",
  doiTuongMa: "MAU-NCC01",
  doiTuongTen: "Cửa hàng thực phẩm sạch (mẫu)",
  chiTiet: ctDx,
  tongTien: tongTien,
  trangThai: "CHO_DUYET",
}, "Đề xuất MAU-DX01 (tổng " + tongTien.toLocaleString("vi-VN") + "đ, CHO_DUYET)");

// ── 6. Điểm danh ăn — 3 ngày gần nhất, Lớp Mầm 1 (mẫu) ──────────────────
print("6) Điểm danh ăn:");
var diemDanh = [
  { d: 2, dangKy: 30, thucTe: 28 },
  { d: 1, dangKy: 30, thucTe: 29 },
  { d: 0, dangKy: 30, thucTe: 27 },
];
diemDanh.forEach(function (x) {
  var ngay = daysAgo(x.d);
  var ymd = ngay.toISOString().slice(0, 10);
  upsert("diem_danh_an", { lopMa: "MAU-LOP-A", congThucCode: "MAU-CT-CHUAN", ngay: { $gte: new Date(ymd + "T00:00:00Z"), $lte: new Date(ymd + "T23:59:59Z") } }, {
    ngay: ngay,
    lopMa: "MAU-LOP-A",
    lopTen: "Lớp Mầm 1 (mẫu)",
    soTreDangKy: x.dangKy,
    soTreAnThucTe: x.thucTe,
    congThucCode: "MAU-CT-CHUAN",
    ghiChu: "Điểm danh mẫu",
  }, "Điểm danh " + ymd + " (ăn " + x.thucTe + "/" + x.dangKy + ")");
});

print("");
print("────────────────────────────────────────────────────────");
print("XONG. inserted=" + ins + " skipped=" + skip);
print("");
print("BƯỚC TIẾP THEO (làm trên UI, công ty " + tenant.name + "):");
print("  1. Bếp ăn → Đề xuất mua → mở MAU-DX01 → Duyệt → Nhận hàng");
print("       ⇒ nhập kho 45kg thực phẩm + bút toán Nợ152/Có331 (1.825.000đ)");
print("  2. Bếp ăn → Bảng kiểm soát chi phí → chọn kỳ (7 ngày gần nhất)");
print("       ⇒ so ngân sách (25.000đ × 84 suất) vs chi phí thực (tiêu hao × đơn giá nhập)");
print("  3. Bấm CHỐT TIÊU HAO ⇒ xuất kho + bút toán giá vốn Nợ632/Có152");
print("────────────────────────────────────────────────────────");
