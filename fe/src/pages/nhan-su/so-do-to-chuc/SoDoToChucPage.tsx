import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tree,
  Typography,
  message,
} from "antd";
import type { DataNode } from "antd/es/tree";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { apiErrorMessage } from "@/config/api";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FieldLabel } from "@/components/form/FieldLabel";
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
import {
  soDoToChucService,
  LOAI_DON_VI_OPTIONS,
  type LoaiDonVi,
  type NutToChuc,
} from "@/services/soDoToChucService";
import {
  vaiTroService,
  type VaiTroResponse,
} from "@/services/vaiTroService";

const { Text } = Typography;

interface FormDonVi {
  ten: string;
  loai: LoaiDonVi;
  parentId: string | null;
  thuTu: number;
  vaiTro?: string;
  departmentId?: string | null;
  moTa?: string;
}

const RONG: FormDonVi = {
  ten: "",
  loai: "phong_ban",
  parentId: null,
  thuTu: 0,
  vaiTro: undefined,
  departmentId: null,
  moTa: "",
};

/** Nhãn cấp — để nhìn cây là biết nút nào là chức danh (lá được xếp người vào). */
const NHAN_LOAI: Record<LoaiDonVi, string> = {
  khoi: "Khối",
  phong_ban: "Phòng ban",
  bo_phan: "Bộ phận",
  chuc_danh: "Chức danh",
};

function sangTreeData(ds: NutToChuc[]): DataNode[] {
  return ds.map((n) => ({
    key: n.id,
    title: (
      <span>
        {n.ten}{" "}
        <Text className="text-[10.5px] text-[hsl(var(--ink-2))]">
          · {NHAN_LOAI[n.loai]}
          {n.vaiTro ? ` · vai trò: ${n.vaiTro}` : ""}
        </Text>
      </span>
    ),
    children: n.con.length ? sangTreeData(n.con) : undefined,
  }));
}

/** Tìm một nút trong cây theo id — để đổ form khi chọn trên cây. */
function timNut(ds: NutToChuc[], id: string): NutToChuc | undefined {
  for (const n of ds) {
    if (n.id === id) return n;
    const trong = timNut(n.con, id);
    if (trong) return trong;
  }
  return undefined;
}

/** Danh sách phẳng (id + đường dẫn) để đổ ô chọn "Trực thuộc". */
function phang(
  ds: NutToChuc[],
  tienTo = "",
): { value: string; label: string; loai: LoaiDonVi }[] {
  return ds.flatMap((n) => {
    const nhan = tienTo ? `${tienTo} / ${n.ten}` : n.ten;
    return [
      { value: n.id, label: nhan, loai: n.loai },
      ...phang(n.con, nhan),
    ];
  });
}

/**
 * Sơ đồ tổ chức (yêu cầu d13). Cây Khối → Phòng ban → Bộ phận → Chức danh;
 * chức danh là LÁ và là thứ hồ sơ nhân viên / quá trình công tác chọn vào.
 *
 * Ô "Vai trò" nối sang Phân quyền — nhưng chỉ là GỢI Ý: xếp một người vào
 * chức danh KHÔNG tự cấp quyền cho họ. Cấp quyền im lặng theo sơ đồ tổ chức
 * là loại thay đổi không ai rà soát được.
 */
export function SoDoToChucPage() {
  const { canCreate, canEdit, canDelete } = usePagePermission(
    "/nhan-su/so-do-to-chuc",
  );
  const { options: phongBanOptions } = usePhongBanOptions();

  const [cay, setCay] = useState<NutToChuc[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dangChon, setDangChon] = useState<string | null>(null);
  const [form, setForm] = useState<FormDonVi>(RONG);
  const [vaiTro, setVaiTro] = useState<VaiTroResponse[]>([]);

  const nap = useCallback(async (giuId?: string) => {
    setLoading(true);
    try {
      const ds = await soDoToChucService.cay();
      setCay(ds);
      if (giuId) {
        const nut = timNut(ds, giuId);
        if (nut) {
          setDangChon(nut.id);
          setForm({
            ten: nut.ten,
            loai: nut.loai,
            parentId: nut.parentId,
            thuTu: nut.thuTu,
            vaiTro: nut.vaiTro,
            departmentId: nut.departmentId ?? null,
            moTa: nut.moTa ?? "",
          });
        }
      }
    } catch (err) {
      message.error(apiErrorMessage(err, "Không tải được sơ đồ tổ chức"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void nap();
    // Vai trò chỉ để gợi ý ở ô "Vai trò tương ứng" — không có quyền xem vai
    // trò thì vẫn dùng được màn này, chỉ là ô đó rỗng.
    vaiTroService
      .getAll()
      .then(setVaiTro)
      .catch(() => setVaiTro([]));
  }, [nap]);

  const dsPhang = useMemo(() => phang(cay), [cay]);

  const chonNut = (id: string) => {
    const nut = timNut(cay, id);
    if (!nut) return;
    setDangChon(id);
    setForm({
      ten: nut.ten,
      loai: nut.loai,
      parentId: nut.parentId,
      thuTu: nut.thuTu,
      vaiTro: nut.vaiTro,
      departmentId: nut.departmentId ?? null,
      moTa: nut.moTa ?? "",
    });
  };

  const themMoi = () => {
    setDangChon(null);
    // Giữ nguyên "Trực thuộc" đang chọn: thêm 5 chức danh vào cùng một phòng
    // là thao tác thường gặp nhất, bắt chọn lại cha mỗi lần là phí.
    setForm({ ...RONG, parentId: dangChon ?? null, loai: "chuc_danh" });
  };

  const luu = async () => {
    if (!form.ten.trim()) {
      message.error("Nhập tên đơn vị trước khi lưu");
      return;
    }
    setSaving(true);
    try {
      const dto = {
        ...form,
        ten: form.ten.trim(),
        // Chuỗi rỗng chứ không `undefined`: BE dùng Object.assign nên
        // `undefined` mang nghĩa "giữ nguyên", không phải "gỡ cha".
        parentId: form.parentId ?? "",
        departmentId: form.departmentId ?? "",
        vaiTro: form.vaiTro ?? "",
        moTa: form.moTa ?? "",
      };
      const luuXong = dangChon
        ? await soDoToChucService.sua(dangChon, dto)
        : await soDoToChucService.them(dto);
      message.success(dangChon ? "Đã lưu đơn vị" : "Đã thêm đơn vị");
      await nap(luuXong.id ?? dangChon ?? undefined);
    } catch (err) {
      message.error(apiErrorMessage(err, "Lưu thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const xoa = async () => {
    if (!dangChon) return;
    setSaving(true);
    try {
      await soDoToChucService.xoa(dangChon);
      message.success("Đã xoá đơn vị");
      setDangChon(null);
      setForm(RONG);
      await nap();
    } catch (err) {
      // BE chặn khi còn đơn vị con hoặc còn người giữ chức danh — câu đó phải
      // hiện nguyên văn, "Xoá thất bại" chung chung không cho biết vướng gì.
      message.error(apiErrorMessage(err, "Xoá thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 lg:flex-row">
        <Card
          size="small"
          className="lg:w-96 lg:shrink-0"
          title="Cây tổ chức"
          extra={
            canCreate && (
              <Button size="small" icon={<PlusOutlined />} onClick={themMoi}>
                Thêm đơn vị
              </Button>
            )
          }
        >
          <Spin spinning={loading}>
            {cay.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa dựng sơ đồ tổ chức"
              />
            ) : (
              <Tree
                treeData={sangTreeData(cay)}
                defaultExpandAll
                selectedKeys={dangChon ? [dangChon] : []}
                onSelect={(keys) => {
                  const id = keys[0];
                  if (typeof id === "string") chonNut(id);
                }}
              />
            )}
          </Spin>
        </Card>

        <Card
          size="small"
          className="flex-1"
          title={dangChon ? "Sửa đơn vị" : "Thêm đơn vị"}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <FieldLabel required>Tên đơn vị / chức danh</FieldLabel>
              <Input
                value={form.ten}
                disabled={!canEdit && !canCreate}
                placeholder="VD: Phòng Kinh doanh, Trưởng phòng…"
                onChange={(e) => setForm({ ...form, ten: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Cấp</FieldLabel>
              <Select
                className="w-full"
                value={form.loai}
                options={LOAI_DON_VI_OPTIONS}
                disabled={!canEdit && !canCreate}
                onChange={(loai) => setForm({ ...form, loai })}
              />
              <div className="mt-[2px] text-[10.5px] text-[hsl(var(--ink-2))]">
                "Chức danh" là cấp cuối — đây là thứ hồ sơ nhân viên chọn.
              </div>
            </div>
            <div>
              <FieldLabel>Trực thuộc</FieldLabel>
              <Select
                className="w-full"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Không có (đơn vị gốc)"
                value={form.parentId ?? undefined}
                disabled={!canEdit && !canCreate}
                // Không cho treo nút dưới một chức danh: BE cũng chặn, nhưng
                // ẩn khỏi danh sách thì người dùng không phải thử rồi ăn lỗi.
                options={dsPhang
                  .filter((o) => o.loai !== "chuc_danh" && o.value !== dangChon)
                  .map((o) => ({ value: o.value, label: o.label }))}
                onChange={(parentId) =>
                  setForm({ ...form, parentId: parentId ?? null })
                }
              />
            </div>
            <div>
              <FieldLabel>Thứ tự hiển thị</FieldLabel>
              <InputNumber
                className="w-full"
                min={0}
                value={form.thuTu}
                disabled={!canEdit && !canCreate}
                onChange={(v) => setForm({ ...form, thuTu: v ?? 0 })}
              />
            </div>
            <div>
              <FieldLabel>Vai trò tương ứng (Phân quyền)</FieldLabel>
              <Select
                className="w-full"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Chưa gắn vai trò"
                value={form.vaiTro || undefined}
                disabled={!canEdit && !canCreate}
                options={vaiTro.map((v) => ({ value: v.ten, label: v.ten }))}
                onChange={(v) => setForm({ ...form, vaiTro: v })}
              />
              <div className="mt-[2px] text-[10.5px] text-[hsl(var(--ink-2))]">
                Chỉ là gợi ý khi cấp quyền — xếp người vào chức danh KHÔNG tự
                cấp quyền cho họ.
              </div>
            </div>
            <div>
              <FieldLabel>Phòng ban (danh mục dùng chung)</FieldLabel>
              <Select
                className="w-full"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Không gắn"
                value={form.departmentId ?? undefined}
                disabled={!canEdit && !canCreate}
                options={phongBanOptions}
                onChange={(v) => setForm({ ...form, departmentId: v ?? null })}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Mô tả</FieldLabel>
              <Input.TextArea
                rows={2}
                value={form.moTa}
                disabled={!canEdit && !canCreate}
                onChange={(e) => setForm({ ...form, moTa: e.target.value })}
              />
            </div>
          </div>

          <Space className="mt-3">
            {(dangChon ? canEdit : canCreate) && (
              <Button type="primary" loading={saving} onClick={luu}>
                {dangChon ? "Lưu" : "Thêm"}
              </Button>
            )}
            {dangChon && canDelete && (
              <Popconfirm
                title="Xoá đơn vị này?"
                description="Không xoá được nếu còn đơn vị con hoặc còn người đang giữ chức danh."
                okText="Xoá"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={xoa}
              >
                <Button danger icon={<DeleteOutlined />} loading={saving}>
                  Xoá
                </Button>
              </Popconfirm>
            )}
            {dangChon && (
              <Button
                type="text"
                onClick={() => {
                  setDangChon(null);
                  setForm(RONG);
                }}
              >
                Bỏ chọn
              </Button>
            )}
          </Space>
        </Card>
      </div>
    </Card>
  );
}

export default SoDoToChucPage;
