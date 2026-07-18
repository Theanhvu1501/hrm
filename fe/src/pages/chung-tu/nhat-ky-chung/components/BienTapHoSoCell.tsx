import { useEffect, useMemo, useState } from "react";
import { Popover, Checkbox, Button, Select, Space, Tooltip, message } from "antd";
import { PlusOutlined, DeleteOutlined, FileTextOutlined } from "@ant-design/icons";
import type {
  NhatKyChung,
  QuyChuan,
  HoSoChungTu,
  HoSoChungTuItem,
} from "@/types";
import { nhatKyChungService } from "@/services/nhatKyChungService";

interface BienTapHoSoCellProps {
  entry: NhatKyChung;
  quyChaunList: QuyChuan[];
  hoSoChungTuList: HoSoChungTu[];
  onSaved: () => void;
}

export function BienTapHoSoCell({
  entry,
  quyChaunList,
  hoSoChungTuList,
  onSaved,
}: BienTapHoSoCellProps) {
  // Danh sách mặc định từ quy chuẩn khớp với nghiệp vụ (và loại giao dịch nếu có)
  const defaultFromQuyChuan = useMemo((): HoSoChungTuItem[] => {
    const nv = entry.danhMuc?.nghiepVu?.ten;
    // QuyChuan.loaiGiaoDich stores the loại-giao-dịch CODE (ma), not the display name.
    // DanhMucLoaiGiaoDich snapshot exposes both .ma and .ten — compare .ma so both sides are codes.
    const loaiGD = entry.danhMuc?.loaiGiaoDich?.ma;
    if (!nv) return [];
    const matches = quyChaunList.filter((q) => q.nghiepVu === nv);
    const qc =
      (loaiGD && matches.find((q) => q.loaiGiaoDich === loaiGD)) ||
      matches[0];
    return (qc?.hoSoChungTu || []).map((h) => ({
      id: h.id,
      ma: h.ma,
      ten: h.ten,
      daCo: false,
    }));
  }, [entry.danhMuc?.nghiepVu?.ten, entry.danhMuc?.loaiGiaoDich?.ma, quyChaunList]);

  const initialItems = useMemo(
    (): HoSoChungTuItem[] =>
      entry.hoSoChungTu?.length
        ? entry.hoSoChungTu.map((h) => ({ ...h }))
        : defaultFromQuyChuan,
    [entry.hoSoChungTu, defaultFromQuyChuan]
  );

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HoSoChungTuItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [addId, setAddId] = useState<string | undefined>(undefined);

  // Đồng bộ lại khi dữ liệu entry thay đổi (sau refresh)
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const total = items.length;
  const daCoCount = items.filter((i) => i.daCo).length;

  const toggleItem = (id: string, checked: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, daCo: checked } : i))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addItem = () => {
    if (!addId) return;
    const src = hoSoChungTuList.find((h) => h.id === addId);
    if (!src) return;
    if (items.some((i) => i.id === src.id)) {
      setAddId(undefined);
      return;
    }
    setItems((prev) => [
      ...prev,
      { id: src.id, ma: src.ma, ten: src.ten, daCo: false },
    ]);
    setAddId(undefined);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await nhatKyChungService.update(entry.id, { hoSoChungTu: items });
      message.success("Đã lưu hồ sơ chứng từ");
      setOpen(false);
      onSaved();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Lưu hồ sơ chứng từ thất bại";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Mở lại → đồng bộ với dữ liệu mới nhất
      setItems(initialItems);
    }
    setOpen(next);
  };

  const availableToAdd = useMemo(
    () =>
      hoSoChungTuList
        .filter((h) => !items.some((i) => i.id === h.id))
        .map((h) => ({ value: h.id, label: `${h.ma} - ${h.ten}` })),
    [hoSoChungTuList, items]
  );

  const popoverContent = (
    <div style={{ width: 320 }}>
      {items.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 8 }}>
          Chưa có hồ sơ chứng từ nào.
        </div>
      ) : (
        <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "2px 0",
              }}
            >
              <Checkbox
                checked={item.daCo}
                onChange={(e) => toggleItem(item.id, e.target.checked)}
              >
                <Tooltip title={`${item.ma} - ${item.ten}`}>
                  <span>{item.ten}</span>
                </Tooltip>
              </Checkbox>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeItem(item.id)}
              />
            </div>
          ))}
        </div>
      )}

      <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
        <Select
          size="small"
          style={{ flex: 1 }}
          placeholder="Thêm hồ sơ chứng từ"
          value={addId}
          onChange={(v) => setAddId(v)}
          options={availableToAdd}
          showSearch
          optionFilterProp="label"
          allowClear
        />
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={addItem}
          disabled={!addId}
        >
          Thêm
        </Button>
      </Space.Compact>

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

  // Xem nhanh danh sách hồ sơ khi hover (chỉ đọc).
  const hoverContent =
    items.length > 0 ? (
      <div style={{ maxWidth: 300 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Đã có {daCoCount}/{total}
        </div>
        {items.map((i) => (
          <div key={i.id}>
            <span style={{ color: i.daCo ? "#52c41a" : "#bbb" }}>
              {i.daCo ? "✓" : "○"}
            </span>{" "}
            {i.ten}
          </div>
        ))}
      </div>
    ) : (
      "Chưa có hồ sơ chứng từ"
    );

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottomRight"
      title="Biên tập hồ sơ chứng từ"
      content={popoverContent}
    >
      <Tooltip title={hoverContent} open={open ? false : undefined}>
        {total > 0 ? (
          <Button
            size="small"
            type="link"
            icon={<FileTextOutlined />}
            style={{ padding: 0 }}
          >
            Đã có {daCoCount}/{total}
          </Button>
        ) : (
          <Button
            size="small"
            type="link"
            icon={<PlusOutlined />}
            style={{ padding: 0, color: "#999" }}
          >
            —
          </Button>
        )}
      </Tooltip>
    </Popover>
  );
}
