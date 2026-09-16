import type { LoaiDonVi, OrgUnit } from '@app/entities';

export interface NutCay {
  id: string;
  ten: string;
  loai: LoaiDonVi;
  parentId: string | null;
  thuTu: number;
  vaiTro?: string;
  departmentId?: string | null;
  moTa?: string;
  con: NutCay[];
}

function khoaCha(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

/**
 * Dựng cây từ danh sách phẳng.
 *
 * Nút có `parentId` trỏ tới một nút KHÔNG tồn tại (cha đã bị xoá bằng tay
 * dưới DB) được nâng lên làm nút gốc chứ không bị bỏ đi: mất hẳn khỏi màn
 * hình nghĩa là không ai sửa lại được nó, còn dữ liệu thì vẫn nằm đó và vẫn
 * được hồ sơ nhân viên trỏ vào.
 */
export function dungCay(ds: OrgUnit[]): NutCay[] {
  const nut = new Map<string, NutCay>();
  for (const u of ds) {
    nut.set(u.id, {
      id: u.id,
      ten: u.ten,
      loai: u.loai,
      parentId: khoaCha(u.parentId),
      thuTu: u.thuTu ?? 0,
      vaiTro: u.vaiTro,
      departmentId: u.departmentId ?? null,
      moTa: u.moTa,
      con: [],
    });
  }

  const goc: NutCay[] = [];
  for (const n of nut.values()) {
    const cha = n.parentId ? nut.get(n.parentId) : undefined;
    if (cha && cha.id !== n.id) cha.con.push(n);
    else goc.push(n);
  }

  const sapXep = (ds: NutCay[]): NutCay[] => {
    ds.sort((a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, 'vi'));
    for (const n of ds) sapXep(n.con);
    return ds;
  };
  return sapXep(goc);
}

/**
 * Đường dẫn đầy đủ của một nút ("Khối Kinh doanh / Phòng Bán hàng / Trưởng
 * phòng") — dùng làm nhãn khi chọn chức danh ở hồ sơ nhân viên: hai phòng
 * cùng có "Trưởng nhóm" thì chỉ tên lá không phân biệt được.
 */
export function duongDan(
  id: string,
  ds: OrgUnit[],
  nganCach = ' / ',
): string {
  const theoId = new Map(ds.map((u) => [u.id, u]));
  const ten: string[] = [];
  let hienTai = theoId.get(id);
  // Chặn vòng lặp vô hạn khi dữ liệu có chu trình (A là cha của B, B là cha
  // của A) — người ta tạo được chu trình bằng cách sửa thẳng DB.
  const daQua = new Set<string>();
  while (hienTai && !daQua.has(hienTai.id)) {
    daQua.add(hienTai.id);
    ten.unshift(hienTai.ten);
    const cha = khoaCha(hienTai.parentId);
    hienTai = cha ? theoId.get(cha) : undefined;
  }
  return ten.join(nganCach);
}

/**
 * Nút nào là con/cháu của `id` (kể cả chính nó). Dùng để:
 *   - chặn đặt một nút làm cha của chính hậu duệ nó (tạo chu trình);
 *   - đếm xem xoá một nhánh thì mất bao nhiêu nút.
 */
export function hauDue(id: string, ds: OrgUnit[]): Set<string> {
  const conTheoCha = new Map<string, string[]>();
  for (const u of ds) {
    const cha = khoaCha(u.parentId);
    if (!cha) continue;
    const list = conTheoCha.get(cha) ?? [];
    list.push(u.id);
    conTheoCha.set(cha, list);
  }

  const ra = new Set<string>([id]);
  const hangDoi = [id];
  while (hangDoi.length) {
    const hienTai = hangDoi.shift() as string;
    for (const con of conTheoCha.get(hienTai) ?? []) {
      if (ra.has(con)) continue;
      ra.add(con);
      hangDoi.push(con);
    }
  }
  return ra;
}
