import { Table, Button, Input, Select, Checkbox, InputNumber, Space, Popconfirm } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useCauHinhLuongState } from "../CauHinhLuongHandlerContext";
import type { CauHinhLuong, KhoanLuong, LoaiCongThuc } from "@/services/cauHinhLuongService";
import "../CauHinhLuongPage.state";

export const LOAI_CONG_THUC_OPTIONS: { value: LoaiCongThuc; label: string }[] = [
  { value: "LUONG_THEO_CONG", label: "Lương theo công" },
  { value: "DINH_MUC_x_CONG", label: "Định mức x Công" },
  { value: "CO_DINH_THANG", label: "Cố định hàng tháng" },
  { value: "PHAN_TRAM_BASE", label: "% theo lương cơ sở" },
  { value: "NHAP_THEO_KY", label: "Nhập tay theo kỳ" },
  // Lấy thẳng tổng tiền từ bảng 03-LĐTL ĐÃ CHỐT của kỳ — không có tham số,
  // không tính lại công thức. Thiếu lựa chọn này thì không có đường nào bật
  // tiền làm thêm vào bảng lương từ giao diện.
  { value: "TIEN_OT", label: "Tiền làm thêm giờ (từ bảng 03-LĐTL)" },
];

function taoMaKhoanMoi(): string {
  return `KHOAN_${Date.now()}`;
}

function danhSoThuTu(list: KhoanLuong[]): KhoanLuong[] {
  return list.map((row, index) => ({ ...row, thuTu: index + 1 }));
}

interface KhoanLuongEditorProps {
  canEdit: boolean;
}

export function KhoanLuongEditor({ canEdit }: KhoanLuongEditorProps) {
  const [cauHinh, setCauHinh] = useCauHinhLuongState(
    "cauHinh",
    null as CauHinhLuong | null
  );

  const list = cauHinh?.khoanLuong ?? [];

  const capNhatDanhSach = (next: KhoanLuong[]) => {
    if (!cauHinh) return;
    setCauHinh({ ...cauHinh, khoanLuong: danhSoThuTu(next) });
  };

  const capNhatDong = (index: number, patch: Partial<KhoanLuong>) => {
    capNhatDanhSach(list.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const capNhatThamSo = (index: number, patch: Partial<KhoanLuong["thamSo"]>) => {
    capNhatDanhSach(
      list.map((row, i) =>
        i === index ? { ...row, thamSo: { ...row.thamSo, ...patch } } : row
      )
    );
  };

  const themDong = () => {
    const dongMoi: KhoanLuong = {
      ma: taoMaKhoanMoi(),
      ten: "",
      loaiCongThuc: "NHAP_THEO_KY",
      thamSo: {},
      chiuThue: true,
      tranMienThue: null,
      vaoTongThuNhap: true,
      vaoBHXH: false,
      thuTu: list.length + 1,
    };
    capNhatDanhSach([...list, dongMoi]);
  };

  const xoaDong = (index: number) => {
    capNhatDanhSach(list.filter((_, i) => i !== index));
  };

  const doiCho = (index: number, huong: -1 | 1) => {
    const target = index + huong;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    capNhatDanhSach(next);
  };

  const columns: ColumnsType<KhoanLuong> = [
    {
      title: "Thứ tự",
      key: "thuTu",
      width: 90,
      align: "center",
      render: (_: unknown, __: KhoanLuong, index: number) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={!canEdit || index === 0}
            onClick={() => doiCho(index, -1)}
          />
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={!canEdit || index === list.length - 1}
            onClick={() => doiCho(index, 1)}
          />
        </Space>
      ),
    },
    {
      title: "Tên khoản",
      key: "ten",
      width: 200,
      render: (_: unknown, record: KhoanLuong, index: number) => (
        <Input
          value={record.ten}
          placeholder="Ví dụ: Ăn ca"
          disabled={!canEdit}
          onChange={(e) => capNhatDong(index, { ten: e.target.value })}
        />
      ),
    },
    {
      title: "Loại công thức",
      key: "loaiCongThuc",
      width: 190,
      render: (_: unknown, record: KhoanLuong, index: number) => (
        <Select<LoaiCongThuc>
          className="w-full"
          value={record.loaiCongThuc}
          disabled={!canEdit}
          options={LOAI_CONG_THUC_OPTIONS}
          onChange={(value) => capNhatDong(index, { loaiCongThuc: value, thamSo: {} })}
        />
      ),
    },
    {
      title: "Tham số",
      key: "thamSo",
      width: 240,
      render: (_: unknown, record: KhoanLuong, index: number) => {
        switch (record.loaiCongThuc) {
          case "DINH_MUC_x_CONG":
            return (
              <InputNumber
                className="w-full"
                min={0}
                value={record.thamSo.dinhMuc}
                placeholder="Định mức / công"
                disabled={!canEdit}
                onChange={(v) => capNhatThamSo(index, { dinhMuc: v ?? 0 })}
              />
            );
          case "PHAN_TRAM_BASE":
            return (
              <InputNumber
                className="w-full"
                min={0}
                max={100}
                addonAfter="%"
                value={(record.thamSo.tyLe ?? 0) * 100}
                disabled={!canEdit}
                onChange={(v) => capNhatThamSo(index, { tyLe: (v ?? 0) / 100 })}
              />
            );
          case "CO_DINH_THANG": {
            const tuHoSo = record.thamSo.nguonHoSo === "phuCapCoDinh";
            return (
              <Space direction="vertical" size={4} className="w-full">
                <Checkbox
                  checked={tuHoSo}
                  disabled={!canEdit}
                  onChange={(e) =>
                    capNhatDong(index, {
                      thamSo: e.target.checked
                        ? { nguonHoSo: "phuCapCoDinh" }
                        : { soTien: record.thamSo.soTien ?? 0 },
                    })
                  }
                >
                  Lấy từ hồ sơ (phụ cấp cố định)
                </Checkbox>
                {!tuHoSo && (
                  <InputNumber
                    className="w-full"
                    min={0}
                    value={record.thamSo.soTien}
                    placeholder="Số tiền / tháng"
                    disabled={!canEdit}
                    onChange={(v) => capNhatThamSo(index, { soTien: v ?? 0 })}
                  />
                )}
              </Space>
            );
          }
          default:
            return <span className="text-muted-foreground text-xs">Không cần tham số</span>;
        }
      },
    },
    {
      title: "Chịu thuế",
      key: "chiuThue",
      width: 90,
      align: "center",
      render: (_: unknown, record: KhoanLuong, index: number) => (
        <Checkbox
          checked={record.chiuThue}
          disabled={!canEdit}
          onChange={(e) => capNhatDong(index, { chiuThue: e.target.checked })}
        />
      ),
    },
    {
      title: "Trần miễn thuế",
      key: "tranMienThue",
      width: 150,
      render: (_: unknown, record: KhoanLuong, index: number) => (
        <InputNumber
          className="w-full"
          min={0}
          value={record.tranMienThue ?? undefined}
          placeholder="Để trống = không có trần"
          disabled={!canEdit}
          onChange={(v) => capNhatDong(index, { tranMienThue: v ?? null })}
        />
      ),
    },
    {
      title: "Vào tổng thu nhập",
      key: "vaoTongThuNhap",
      width: 130,
      align: "center",
      render: (_: unknown, record: KhoanLuong, index: number) => (
        <Checkbox
          checked={record.vaoTongThuNhap}
          disabled={!canEdit}
          onChange={(e) => capNhatDong(index, { vaoTongThuNhap: e.target.checked })}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      align: "center",
      render: (_: unknown, __: KhoanLuong, index: number) =>
        canEdit && (
          <Popconfirm title="Xoá khoản lương này?" okText="Xoá" cancelText="Huỷ" onConfirm={() => xoaDong(index)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      {canEdit && (
        <Button type="dashed" icon={<PlusOutlined />} onClick={themDong}>
          Thêm khoản lương
        </Button>
      )}
      <Table<KhoanLuong>
        columns={columns}
        dataSource={list}
        rowKey="ma"
        pagination={false}
        bordered
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
