import { useMemo } from "react";
import { Table, Button, InputNumber, Popconfirm, Alert } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useCauHinhLuongState } from "../CauHinhLuongHandlerContext";
import type { BacThue, CauHinhLuong } from "@/services/cauHinhLuongService";
import "../CauHinhLuongPage.state";

interface BacThueEditorProps {
  canEdit: boolean;
}

export function BacThueEditor({ canEdit }: BacThueEditorProps) {
  const [cauHinh, setCauHinh] = useCauHinhLuongState(
    "cauHinh",
    null as CauHinhLuong | null
  );

  const list = cauHinh?.bacThue ?? [];

  const capNhatDanhSach = (next: BacThue[]) => {
    if (!cauHinh) return;
    setCauHinh({ ...cauHinh, bacThue: next });
  };

  const capNhatBac = (index: number, patch: Partial<BacThue>) => {
    capNhatDanhSach(list.map((bac, i) => (i === index ? { ...bac, ...patch } : bac)));
  };

  const themBac = () => {
    capNhatDanhSach([...list, { den: null, suat: 0 }]);
  };

  const xoaBac = (index: number) => {
    capNhatDanhSach(list.filter((_, i) => i !== index));
  };

  // `den` phải tăng dần; chỉ bậc cuối cùng được để trống (∞).
  const canhBaoKhongTangDan = useMemo(() => {
    for (let i = 0; i < list.length; i++) {
      const den = list[i].den;
      const laBacCuoi = i === list.length - 1;
      if (den === null && !laBacCuoi) return true;
      if (i > 0) {
        const denTruoc = list[i - 1].den;
        if (denTruoc !== null && den !== null && den <= denTruoc) return true;
      }
    }
    return false;
  }, [list]);

  const columns: ColumnsType<BacThue> = [
    {
      title: "Bậc",
      key: "bac",
      width: 70,
      align: "center",
      render: (_: unknown, __: BacThue, index: number) => index + 1,
    },
    {
      title: "Đến (thu nhập tính thuế)",
      key: "den",
      render: (_: unknown, record: BacThue, index: number) => (
        <InputNumber
          className="w-full"
          min={0}
          value={record.den ?? undefined}
          placeholder="∞ (bậc cuối, để trống)"
          disabled={!canEdit}
          onChange={(v) => capNhatBac(index, { den: v ?? null })}
        />
      ),
    },
    {
      title: "Thuế suất",
      key: "suat",
      width: 160,
      render: (_: unknown, record: BacThue, index: number) => (
        <InputNumber
          className="w-full"
          min={0}
          max={100}
          addonAfter="%"
          value={record.suat * 100}
          disabled={!canEdit}
          onChange={(v) => capNhatBac(index, { suat: (v ?? 0) / 100 })}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      align: "center",
      render: (_: unknown, __: BacThue, index: number) =>
        canEdit && (
          <Popconfirm title="Xoá bậc thuế này?" okText="Xoá" cancelText="Huỷ" onConfirm={() => xoaBac(index)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      {canhBaoKhongTangDan && (
        <Alert
          type="warning"
          showIcon
          message="Mức 'Đến' phải tăng dần theo từng bậc; chỉ bậc cuối cùng được để trống (∞)."
        />
      )}
      {canEdit && (
        <Button type="dashed" icon={<PlusOutlined />} onClick={themBac}>
          Thêm bậc thuế
        </Button>
      )}
      <Table<BacThue>
        columns={columns}
        dataSource={list}
        rowKey={(record) => `bac-${list.indexOf(record)}`}
        pagination={false}
        bordered
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
