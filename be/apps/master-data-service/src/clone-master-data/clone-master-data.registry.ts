export interface CloneCategory {
  key: string;
  label: string;
  /** Tên class entity, dùng dựng token raw repo `RAW_<entityName>`. */
  entityName: string;
  /** Khóa chống trùng ở tenant đích. */
  dedupKey: (doc: any) => string;
  /** Sửa tham chiếu id trên doc đã clone trước khi insert (tùy chọn). */
  remap?: (doc: any, idMaps: Record<string, Map<string, string>>) => void;
}

export const CLONE_CATEGORIES: CloneCategory[] = [
  {
    key: 'tai-khoan', label: 'Tài khoản', entityName: 'TaiKhoan',
    dedupKey: (d) => d.ma,
    remap: (doc, idMaps) => {
      const m = idMaps['tai-khoan'];
      if (doc.parentId && m?.has(doc.parentId)) doc.parentId = m.get(doc.parentId);
    },
  },
  { key: 'ho-so-chung-tu', label: 'Biên tập hồ sơ', entityName: 'HoSoChungTu', dedupKey: (d) => d.ma },
  { key: 'khoan-muc', label: 'Khoản mục chi phí', entityName: 'KhoanMuc', dedupKey: (d) => d.ma },
  { key: 'nhom-khoan-muc', label: 'Nhóm khoản mục', entityName: 'NhomKhoanMuc', dedupKey: (d) => d.ma },
  { key: 'loai-chung-tu', label: 'Loại chứng từ', entityName: 'LoaiChungTuMaster', dedupKey: (d) => d.ma },
  { key: 'loai-giao-dich', label: 'Loại giao dịch', entityName: 'LoaiGiaoDich', dedupKey: (d) => d.ma },
  {
    key: 'quy-chuan', label: 'Quy chuẩn hạch toán', entityName: 'QuyChuan',
    dedupKey: (d) => `${d.loaiGiaoDich}|${d.nghiepVu}|${d.taiKhoanNo}|${d.taiKhoanCo}`,
    remap: (doc, idMaps) => {
      const m = idMaps['ho-so-chung-tu'];
      if (Array.isArray(doc.hoSoChungTu) && m) {
        doc.hoSoChungTu = doc.hoSoChungTu.map((el: any) => ({ ...el, id: m.get(el.id) ?? el.id }));
      }
    },
  },
];
