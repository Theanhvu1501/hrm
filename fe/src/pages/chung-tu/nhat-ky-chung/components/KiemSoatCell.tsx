import { useEffect, useState } from "react";
import {
  Popover,
  Button,
  Select,
  Space,
  InputNumber,
  Input,
  Tag,
  Tooltip,
  message,
} from "antd";
import type { NhatKyChung, KiemSoatChungTu, KiemSoatTrangThai } from "@/types";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import { lyDoKhongHopLeService } from "@/services/lyDoKhongHopLeService";
import { useAuth } from "@/contexts/AuthContext";
import { suggestNhomChiPhi, type NhomChiPhi } from "../nhomChiPhi";

interface KiemSoatCellProps {
  entry: NhatKyChung;
  onSaved: () => void;
}

const NHOM_CHI_PHI_OPTIONS: { value: NhomChiPhi; label: string }[] = [
  { value: 1, label: "1 - Chi phí dịch vụ, hàng hóa mua vào" },
  { value: 2, label: "2 - Chi phí về TSCĐ, CCDC, CPTT" },
  { value: 3, label: "3 - Chi phí nhân công, bảo hiểm" },
  { value: 4, label: "4 - Chi phí tài chính, chi phí khác" },
];

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN");
};

const TRANG_THAI_LABEL: Record<KiemSoatTrangThai, string> = {
  HOP_LE: "Hợp lệ",
  CHUA_HOP_LE: "Chưa hợp lệ",
  KHONG_DUOC_TRU: "Không được trừ",
};

// Dữ liệu cũ lyDo có thể là string đơn; chuẩn hoá về mảng.
const normalizeLyDo = (v?: string[] | string): string[] =>
  Array.isArray(v) ? v : v ? [v] : [];

export function KiemSoatCell({ entry, onSaved }: KiemSoatCellProps) {
  const { user } = useAuth();
  // Lưu cả tên + username (email) để biết rõ ai kiểm soát, không chỉ vai trò.
  const currentUserName =
    [user?.hoTen, user?.email].filter(Boolean).join(" - ") || "";

  const tkNo = entry.taiKhoanNo || entry.danhMuc?.taiKhoanNo?.ma;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trangThai, setTrangThai] = useState<KiemSoatTrangThai>(
    entry.kiemSoat?.trangThai ?? "HOP_LE"
  );
  const [nhom, setNhom] = useState<NhomChiPhi>(
    entry.kiemSoat?.nhomChiPhi ?? suggestNhomChiPhi(tkNo)
  );
  const [soTien, setSoTien] = useState<number>(
    entry.kiemSoat?.soTienKhongTru ?? entry.soTien ?? 0
  );
  const [yKien, setYKien] = useState<string>(entry.kiemSoat?.yKien ?? "");
  const [lyDo, setLyDo] = useState<string[]>(normalizeLyDo(entry.kiemSoat?.lyDo));

  // Options "Lý do không hợp lệ" (load 1 lần khi mở popover)
  const [lyDoOptions, setLyDoOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [lyDoLoaded, setLyDoLoaded] = useState(false);

  const loadLyDoOptions = async () => {
    if (lyDoLoaded) return;
    setLyDoLoaded(true);
    try {
      const data = await lyDoKhongHopLeService.getAll();
      setLyDoOptions(data.map((x) => ({ value: x.ten, label: x.ten })));
    } catch {
      setLyDoOptions([]);
    }
  };

  // Đồng bộ lại form theo dữ liệu mới nhất của entry (sau refresh)
  const syncFromEntry = () => {
    setTrangThai(entry.kiemSoat?.trangThai ?? "HOP_LE");
    setNhom(entry.kiemSoat?.nhomChiPhi ?? suggestNhomChiPhi(tkNo));
    setSoTien(entry.kiemSoat?.soTienKhongTru ?? entry.soTien ?? 0);
    setYKien(entry.kiemSoat?.yKien ?? "");
    setLyDo(normalizeLyDo(entry.kiemSoat?.lyDo));
  };

  useEffect(() => {
    syncFromEntry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.kiemSoat, entry.soTien]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      syncFromEntry();
      void loadLyDoOptions();
    }
    setOpen(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const kiemSoat: KiemSoatChungTu = {
        trangThai,
        yKien: yKien || undefined,
        nguoiKiemSoat: currentUserName,
      };
      if (trangThai === "KHONG_DUOC_TRU") {
        kiemSoat.nhomChiPhi = nhom;
        kiemSoat.soTienKhongTru = soTien;
        kiemSoat.lyDo = lyDo.length ? lyDo : undefined;
      } else if (trangThai === "CHUA_HOP_LE") {
        kiemSoat.lyDo = lyDo.length ? lyDo : undefined;
      }
      await nhatKyChungService.update(entry.id, { kiemSoat });
      message.success("Đã lưu kiểm soát");
      setOpen(false);
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu kiểm soát thất bại";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const popoverContent = (
    <div style={{ width: 320 }}>
      <div style={{ marginBottom: 8 }}>
        <Select<KiemSoatTrangThai>
          size="small"
          style={{ width: "100%" }}
          value={trangThai}
          onChange={(v) => setTrangThai(v)}
          options={[
            { value: "HOP_LE", label: "Hợp lệ" },
            { value: "CHUA_HOP_LE", label: "Chưa hợp lệ" },
            { value: "KHONG_DUOC_TRU", label: "Không được trừ" },
          ]}
        />
      </div>

      {trangThai === "KHONG_DUOC_TRU" && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
              Nhóm chi phí
            </div>
            <Select<NhomChiPhi>
              size="small"
              style={{ width: "100%" }}
              value={nhom}
              onChange={(v) => setNhom(v)}
              options={NHOM_CHI_PHI_OPTIONS}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
              Số tiền không trừ
            </div>
            <InputNumber
              size="small"
              style={{ width: "100%" }}
              value={soTien}
              min={0}
              onChange={(v) => setSoTien(v ?? 0)}
              formatter={(v) =>
                `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(v) => Number((v || "").replace(/,/g, ""))}
            />
          </div>
        </>
      )}

      {(trangThai === "KHONG_DUOC_TRU" || trangThai === "CHUA_HOP_LE") && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
            {trangThai === "CHUA_HOP_LE"
              ? "Lý do chưa hợp lệ (chọn nhiều)"
              : "Lý do không hợp lệ (chọn nhiều)"}
          </div>
          <Select
            mode="multiple"
            size="small"
            style={{ width: "100%" }}
            allowClear
            showSearch
            optionFilterProp="label"
            value={lyDo}
            onChange={(v) => setLyDo(v ?? [])}
            options={lyDoOptions}
            placeholder="Chọn lý do..."
          />
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
          Ý kiến phê duyệt
        </div>
        <Input.TextArea
          size="small"
          rows={2}
          value={yKien}
          onChange={(e) => setYKien(e.target.value)}
          placeholder="Ý kiến phê duyệt..."
        />
      </div>

      {(entry.kiemSoat?.nguoiKiemSoat || entry.kiemSoat?.ngayKiemSoat) && (
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>
          Kiểm soát bởi {entry.kiemSoat?.nguoiKiemSoat || "-"}
          {entry.kiemSoat?.ngayKiemSoat
            ? ` · ${formatDate(entry.kiemSoat.ngayKiemSoat)}`
            : ""}
        </div>
      )}

      <div style={{ textAlign: "right" }}>
        <Space size="small">
          <Button size="small" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            size="small"
            type="primary"
            loading={saving}
            onClick={handleSave}
          >
            Lưu
          </Button>
        </Space>
      </div>
    </div>
  );

  const tag =
    entry.kiemSoat?.trangThai === "HOP_LE" ? (
      <Tag color="green" style={{ cursor: "pointer", margin: 0 }}>
        Hợp lệ
      </Tag>
    ) : entry.kiemSoat?.trangThai === "CHUA_HOP_LE" ? (
      <Tag color="orange" style={{ cursor: "pointer", margin: 0 }}>
        Chưa hợp lệ
      </Tag>
    ) : entry.kiemSoat?.trangThai === "KHONG_DUOC_TRU" ? (
      <Tag color="red" style={{ cursor: "pointer", margin: 0 }}>
        Không được trừ
      </Tag>
    ) : (
      <span style={{ cursor: "pointer", color: "#999" }}>—</span>
    );

  // Nội dung xem nhanh khi hover (chỉ đọc).
  const ks = entry.kiemSoat;
  const hoverLyDo = normalizeLyDo(ks?.lyDo);
  const hoverContent = ks ? (
    <div style={{ maxWidth: 300 }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {TRANG_THAI_LABEL[ks.trangThai] ?? ks.trangThai}
      </div>
      {ks.trangThai === "KHONG_DUOC_TRU" && (
        <>
          {ks.nhomChiPhi && (
            <div>
              Nhóm:{" "}
              {NHOM_CHI_PHI_OPTIONS.find((o) => o.value === ks.nhomChiPhi)?.label}
            </div>
          )}
          {ks.soTienKhongTru != null && (
            <div>Số tiền: {ks.soTienKhongTru.toLocaleString("vi-VN")}</div>
          )}
        </>
      )}
      {(ks.trangThai === "KHONG_DUOC_TRU" || ks.trangThai === "CHUA_HOP_LE") &&
        hoverLyDo.length > 0 && <div>Lý do: {hoverLyDo.join(", ")}</div>}
      {ks.yKien && <div>Ý kiến: {ks.yKien}</div>}
      {(ks.nguoiKiemSoat || ks.ngayKiemSoat) && (
        <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
          Bởi {ks.nguoiKiemSoat || "-"}
          {ks.ngayKiemSoat ? ` · ${formatDate(ks.ngayKiemSoat)}` : ""}
        </div>
      )}
    </div>
  ) : (
    "Chưa kiểm soát"
  );

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottomRight"
      title="Kiểm soát hạch toán"
      content={popoverContent}
    >
      <Tooltip title={hoverContent} open={open ? false : undefined}>
        <span>{tag}</span>
      </Tooltip>
    </Popover>
  );
}
