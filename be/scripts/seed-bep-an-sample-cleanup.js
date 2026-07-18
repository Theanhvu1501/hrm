/**
 * XÓA data mẫu Bếp ăn do seed-bep-an-sample.js tạo (tất cả code/ma prefix "MAU-").
 *
 * CHỈ xóa DATA ĐẦU VÀO (danh mục + đề xuất + điểm danh). KHÔNG tự gỡ bút toán/
 * phiếu kho nếu bạn đã bấm "Nhận hàng" / "Chốt tiêu hao" trên UI — những chứng từ
 * đó phải xóa thủ công trong màn hình tương ứng (chúng không mang prefix MAU-).
 *
 * CÁCH CHẠY:
 *   cat be/scripts/seed-bep-an-sample-cleanup.js | ssh kt "docker exec -i mongo mongosh \
 *     'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 */

var TENANT_NAME =
  (typeof process !== "undefined" && process.env.TENANT_NAME) || "Danh Lâm";

var tenant = db.tenants.findOne({ name: { $regex: TENANT_NAME, $options: "i" } });
if (!tenant) { print('LỖI: không tìm thấy tenant "' + TENANT_NAME + '".'); quit(1); }
var TID = tenant._id instanceof ObjectId ? tenant._id.toString() : String(tenant._id);
print('Tenant: "' + tenant.name + '"  (tenantId=' + TID + ")");

var MAU = { $regex: "^MAU-" };
function del(col, field) {
  var q = { tenantId: TID };
  q[field] = MAU;
  var r = db.getCollection(col).deleteMany(q);
  print("  " + col + ": deleted=" + r.deletedCount);
}

del("doi_tuong", "ma");
del("hang_hoa_vat_tu", "ma");
del("dinh_muc_tien_an", "code");
del("cong_thuc_dinh_luong", "code");
del("de_xuat_mua_thuc_pham", "soPhieu");
db.diem_danh_an.deleteMany({ tenantId: TID, lopMa: MAU });
print("  diem_danh_an: deleted by lopMa ^MAU-");
print("XONG.");
