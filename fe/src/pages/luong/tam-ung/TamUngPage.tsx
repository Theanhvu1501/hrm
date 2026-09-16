import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { apiErrorMessage } from "@/config/api";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { FieldLabel } from "@/components/form/FieldLabel";
import { employeeService, type Employee } from "@/services/employeeService";
import {
  tamUngService,
  TRANG_THAI_TAM_UNG_LABEL,
  type TamUngLuong,
} from "@/services/tamUngService";

const TONE: Record<string, PillTone> = {
  cho_duyet: "cho",
  da_duyet: "ok",
  tu_choi: "trung-tinh",
};

const tienVN = (v?: number) => (v ?? 0).toLocaleString("vi-VN");

/**
 * Tạm ứng lương (yêu cầu d30: "Đơn đề nghị tạm ứng -> Duyệt").
 *
 * Số tiền của các đơn ĐÃ DUYỆT trong kỳ được điền sẵn vào ô "Tạm ứng" của
 * bảng lương lúc Tổng hợp — kế toán vẫn sửa tay đè lên được, và lần tổng hợp
 * sau không ghi đè số đã sửa.
 */
export function TamUngPage() {
  const { canCreate, canEdit, canDelete } = usePagePermission("/luong/tam-ung");

  const [thang, setThang] = useState(() => dayjs().format("YYYY-MM"));
  const [trangThai, setTrangThai] = useState<string | undefined>();
  const [danhSach, setDanhSach] = useState<TamUngLuong[]>([]);
  const [nhanVien, setNhanVien] = useState<Employee[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);

  const [moForm, setMoForm] = useState(false);
  const [form, setForm] = useState({
    employeeId: undefined as string | undefined,
    soTien: undefined as number | undefined,
    lyDo: "",
  });

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      setDanhSach(await tamUngService.danhSach({ thang, trangThai }));
    } catch (err) {
      message.error(apiErrorMessage(err, "Không tải được danh sách tạm ứng"));
    } finally {
      setDangTai(false);
    }
  }, [thang, trangThai]);

  useEffect(() => {
    void nap();
  }, [nap]);

  useEffect(() => {
    employeeService
      .getList({ conTrongThang: thang })
      .then(setNhanVien)
      .catch(() => setNhanVien([]));
  }, [thang]);

  const nhanVienOptions = useMemo(
    () =>
      nhanVien.map((e) => ({
        value: e.id,
        label: `${e.hoTen} (${e.employeeId})`,
      })),
    [nhanVien],
  );

  const luu = async () => {
    if (!form.employeeId) {
      message.error("Chọn nhân viên");
      return;
    }
    if (!form.soTien || form.soTien <= 0) {
      message.error("Nhập số tiền tạm ứng");
      return;
    }
    if (!form.lyDo.trim()) {
      message.error("Nêu lý do tạm ứng");
      return;
    }
    setDangLuu(true);
    try {
      await tamUngService.tao({
        employeeId: form.employeeId,
        thang,
        ngayDeNghi: dayjs().format("YYYY-MM-DD"),
        soTien: form.soTien,
        lyDo: form.lyDo.trim(),
      });
      message.success("Đã lập đơn tạm ứng");
      setMoForm(false);
      setForm({ employeeId: undefined, soTien: undefined, lyDo: "" });
      await nap();
    } catch (err) {
      message.error(apiErrorMessage(err, "Lập đơn thất bại"));
    } finally {
      setDangLuu(false);
    }
  };

  const duyet = async (id: string, dongY: boolean) => {
    if (!dongY) {
      // Từ chối phải nêu lý do — BE cũng chặn, hỏi ở đây để khỏi mất một vòng.
      let lyDo = "";
      Modal.confirm({
        title: "Từ chối đơn tạm ứng",
        content: (
          <Input.TextArea
            rows={3}
            placeholder="Lý do từ chối"
            onChange={(e) => {
              lyDo = e.target.value;
            }}
          />
        ),
        okText: "Từ chối",
        cancelText: "Huỷ",
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await tamUngService.duyet(id, "tu_choi", lyDo);
            message.success("Đã từ chối đơn");
            await nap();
          } catch (err) {
            message.error(apiErrorMessage(err, "Từ chối thất bại"));
          }
        },
      });
      return;
    }
    try {
      await tamUngService.duyet(id, "da_duyet");
      message.success("Đã duyệt đơn — số tiền sẽ vào ô Tạm ứng của bảng lương");
      await nap();
    } catch (err) {
      message.error(apiErrorMessage(err, "Duyệt thất bại"));
    }
  };

  const huy = async (id: string) => {
    try {
      await tamUngService.huy(id);
      message.success("Đã huỷ đơn");
      await nap();
    } catch (err) {
      message.error(apiErrorMessage(err, "Huỷ đơn thất bại"));
    }
  };

  const tongDaDuyet = danhSach
    .filter((d) => d.trangThai === "da_duyet")
    .reduce((t, d) => t + (d.soTien ?? 0), 0);

  const columns: ColumnsType<TamUngLuong> = [
    { title: "Mã NV", dataIndex: "employeeCode", key: "employeeCode", width: 100 },
    { title: "Họ tên", dataIndex: "employeeName", key: "employeeName" },
    {
      title: "Ngày đề nghị",
      dataIndex: "ngayDeNghi",
      key: "ngayDeNghi",
      width: 120,
    },
    {
      title: "Số tiền",
      dataIndex: "soTien",
      key: "soTien",
      width: 130,
      align: "right",
      render: tienVN,
    },
    { title: "Lý do", dataIndex: "lyDo", key: "lyDo" },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 130,
      render: (v: string, r) => (
        <Tooltip title={r.lyDoTuChoi || (r.ngayDuyet ? `Duyệt ${r.ngayDuyet}` : "")}>
          <span>
            <StatusPill tone={TONE[v] ?? "trung-tinh"}>
              {TRANG_THAI_TAM_UNG_LABEL[v] ?? v}
            </StatusPill>
          </span>
        </Tooltip>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      align: "center",
      render: (_: unknown, r: TamUngLuong) =>
        r.trangThai === "cho_duyet" ? (
          <Space size="small">
            {canEdit && (
              <Tooltip title="Duyệt">
                <Button
                  type="text"
                  icon={<CheckOutlined />}
                  onClick={() => void duyet(r._id, true)}
                />
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip title="Từ chối">
                <Button
                  type="text"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => void duyet(r._id, false)}
                />
              </Tooltip>
            )}
            {canDelete && (
              <Popconfirm
                title="Huỷ đơn này?"
                onConfirm={() => huy(r._id)}
                okText="Huỷ đơn"
                cancelText="Thôi"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger>
                  Huỷ
                </Button>
              </Popconfirm>
            )}
          </Space>
        ) : null,
    },
  ];

  return (
    <Card>
      <FilterBar
        filters={
          <Space>
            <DatePicker
              picker="month"
              format="MM/YYYY"
              allowClear={false}
              value={dayjs(thang, "YYYY-MM")}
              onChange={(d) => d && setThang(d.format("YYYY-MM"))}
            />
            <Select
              allowClear
              placeholder="Tất cả trạng thái"
              style={{ width: 170 }}
              value={trangThai}
              onChange={setTrangThai}
              options={Object.entries(TRANG_THAI_TAM_UNG_LABEL).map(
                ([value, label]) => ({ value, label }),
              )}
            />
            <span className="text-[11px] text-[hsl(var(--ink-2))]">
              Đã duyệt trong kỳ: <b>{tienVN(tongDaDuyet)} ₫</b>
            </span>
          </Space>
        }
        actions={
          canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setMoForm(true)}
            >
              Lập đơn tạm ứng
            </Button>
          )
        }
      />

      <BangDuLieu<TamUngLuong>
        columns={columns}
        dataSource={danhSach}
        rowKey="_id"
        loading={dangTai}
        pagination={{ defaultPageSize: 50, showSizeChanger: true }}
      />

      <Modal
        title={`Lập đơn tạm ứng kỳ ${thang}`}
        open={moForm}
        onCancel={() => setMoForm(false)}
        onOk={luu}
        okText="Lập đơn"
        cancelText="Huỷ"
        confirmLoading={dangLuu}
      >
        <div className="space-y-2">
          <div>
            <FieldLabel required>Nhân viên</FieldLabel>
            <Select
              className="w-full"
              showSearch
              optionFilterProp="label"
              placeholder="Chọn nhân viên"
              value={form.employeeId}
              options={nhanVienOptions}
              onChange={(v) => setForm({ ...form, employeeId: v })}
            />
          </div>
          <div>
            <FieldLabel required>Số tiền (₫)</FieldLabel>
            <InputNumber
              className="w-full"
              min={1}
              step={100000}
              value={form.soTien}
              formatter={(v) =>
                `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(v) =>
                Number((v ?? "").replace(/,/g, "")) as unknown as number
              }
              onChange={(v) => setForm({ ...form, soTien: v ?? undefined })}
            />
          </div>
          <div>
            <FieldLabel required>Lý do</FieldLabel>
            <Input.TextArea
              rows={2}
              value={form.lyDo}
              onChange={(e) => setForm({ ...form, lyDo: e.target.value })}
            />
          </div>
          <div className="text-[10.5px] text-[hsl(var(--ink-2))]">
            Đơn được duyệt sẽ tự vào ô "Tạm ứng" của bảng lương kỳ {thang} khi
            bấm Tổng hợp. Kế toán vẫn sửa tay đè lên được.
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export default TamUngPage;
