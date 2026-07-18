/**
 * Clone master data giữa 2 tenant (giữ nguyên content, sinh _id mới, đổi tenantId).
 *
 * Clone 6 mục: tai_khoan, khoan_muc, nhom_khoan_muc, loai_chung_tu,
 *              loai_giao_dich, quy_chuan.
 *
 * - Idempotent: bỏ qua bản ghi đã tồn tại ở đích (theo `ma`; quy_chuan theo
 *   loaiGiaoDich+nghiepVu+taiKhoanNo+taiKhoanCo) → chạy lại an toàn.
 * - tai_khoan.parentId được remap sang _id mới trong tenant đích (giữ cây tài khoản).
 *
 * Tham chiếu bằng MÃ (an toàn copy nguyên, không cần remap):
 *   khoan_muc.nhom -> nhom_khoan_muc.ma
 *   loai_giao_dich.loaiChungTuMa -> loai_chung_tu.ma
 *   quy_chuan.taiKhoanNo/taiKhoanCo -> tai_khoan.ma
 * LƯU Ý: quy_chuan.hoSoChungTu[].id trỏ collection `ho_so_chung_tu` (NGOÀI 6 mục)
 *   → id nhúng vẫn trỏ tenant nguồn (ma/ten giữ nguyên). Clone `ho_so_chung_tu`
 *   riêng nếu cần khớp.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÁCH CHẠY (từ máy local, qua SSH tới server prod):
 *
 *   cat be/scripts/clone-master-data.js | \
 *     ssh kt "SRC=<tenantId_nguon> DST=<tenantId_dich> \
 *       docker exec -i -e SRC -e DST mongo mongosh \
 *       'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 *
 * Hoặc sửa trực tiếp 2 biến SRC/DST bên dưới rồi:
 *   cat be/scripts/clone-master-data.js | ssh kt "docker exec -i mongo mongosh \
 *     'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 *
 * Tìm tenantId: db.tenants.find({}, {ten:1})
 * ─────────────────────────────────────────────────────────────────────────
 */

// Ưu tiên env (process.env trong mongosh); fallback sang giá trị hardcode bên dưới.
var SRC = (typeof process !== "undefined" && process.env.SRC) || "<SRC_TENANT_ID>";
var DST = (typeof process !== "undefined" && process.env.DST) || "<DST_TENANT_ID>";

if (SRC.indexOf("<") === 0 || DST.indexOf("<") === 0) {
  print("LỖI: chưa set SRC/DST. Truyền qua env SRC=... DST=... hoặc sửa trong file.");
  quit(1);
}

function report(col, inserted, skipped) {
  print(col + ": inserted=" + inserted + " skipped(exists)=" + skipped);
}

// Clone theo khóa duy nhất `ma`.
function cloneByMa(col) {
  var c = db.getCollection(col);
  var src = c.find({ tenantId: SRC }).toArray();
  var inserted = 0, skipped = 0;
  src.forEach(function (doc) {
    if (c.countDocuments({ tenantId: DST, ma: doc.ma }) > 0) { skipped++; return; }
    delete doc._id;
    doc.tenantId = DST;
    c.insertOne(doc);
    inserted++;
  });
  report(col, inserted, skipped);
}

// tai_khoan: remap parentId (chuỗi _id của tài khoản cha) trong tenant.
function cloneTaiKhoan() {
  var c = db.tai_khoan;
  var src = c.find({ tenantId: SRC }).toArray();
  // idMap: oldIdStr -> _id đích (dùng lại nếu ma đã có ở đích, ngược lại sinh mới)
  var idMap = {};
  src.forEach(function (doc) {
    var existing = c.findOne({ tenantId: DST, ma: doc.ma });
    idMap[doc._id.toString()] = existing ? existing._id : new ObjectId();
  });
  var inserted = 0, skipped = 0;
  src.forEach(function (doc) {
    var oldId = doc._id.toString();
    if (c.countDocuments({ tenantId: DST, ma: doc.ma }) > 0) { skipped++; return; }
    doc._id = idMap[oldId];
    doc.tenantId = DST;
    if (doc.parentId && idMap[doc.parentId]) {
      doc.parentId = idMap[doc.parentId].toString();
    }
    c.insertOne(doc);
    inserted++;
  });
  report("tai_khoan", inserted, skipped);
}

// quy_chuan: không có `ma`, dedup theo tổ hợp nghiệp vụ + cặp tài khoản.
function cloneQuyChuan() {
  var c = db.quy_chuan;
  var src = c.find({ tenantId: SRC }).toArray();
  var inserted = 0, skipped = 0;
  src.forEach(function (doc) {
    var dup = c.countDocuments({
      tenantId: DST,
      loaiGiaoDich: doc.loaiGiaoDich,
      nghiepVu: doc.nghiepVu,
      taiKhoanNo: doc.taiKhoanNo,
      taiKhoanCo: doc.taiKhoanCo,
    });
    if (dup > 0) { skipped++; return; }
    delete doc._id;
    doc.tenantId = DST;
    c.insertOne(doc);
    inserted++;
  });
  report("quy_chuan", inserted, skipped);
}

print("=== CLONE START " + SRC + " -> " + DST + " ===");
cloneTaiKhoan();
cloneByMa("khoan_muc");
cloneByMa("nhom_khoan_muc");
cloneByMa("loai_chung_tu");
cloneByMa("loai_giao_dich");
cloneQuyChuan();

print("=== VERIFY target counts ===");
["tai_khoan","khoan_muc","nhom_khoan_muc","loai_chung_tu","loai_giao_dich","quy_chuan"].forEach(function (col) {
  print(col + " (target): " + db.getCollection(col).countDocuments({ tenantId: DST }));
});

print("=== parentId integrity check (target tai_khoan) ===");
var bad = 0;
db.tai_khoan.find({ tenantId: DST, parentId: { $ne: null } }).forEach(function (t) {
  if (t.parentId && db.tai_khoan.countDocuments({ tenantId: DST, _id: ObjectId(t.parentId) }) === 0) bad++;
});
print("dangling parentId in target: " + bad);
