import { useEffect, useState } from 'react';
import { Table, Select, InputNumber, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ChiTietCongThuc, CachXuatCongThuc, HangHoaVatTu } from '@/types';
import { hangHoaVatTuService } from '@/services/hangHoaVatTuService';

const CONTROL_HEIGHT = 28;

interface Props {
  value: ChiTietCongThuc[];
  onChange: (rows: ChiTietCongThuc[]) => void;
}

const cachXuatOptions: { value: CachXuatCongThuc; label: string }[] = [
  { value: 'DINH_LUONG', label: 'Định lượng' },
  { value: 'THEO_SUAT', label: 'Theo suất' },
];

function emptyRow(): ChiTietCongThuc {
  return {
    hangHoaMa: '',
    hangHoaTen: '',
    dinhLuong: 0,
    donViTinh: '',
    cachXuat: 'DINH_LUONG',
  };
}

export function CongThucChiTietTable({ value, onChange }: Props) {
  const [hangHoaList, setHangHoaList] = useState<HangHoaVatTu[]>([]);
  const [loadingHH, setLoadingHH] = useState(false);

  useEffect(() => {
    setLoadingHH(true);
    hangHoaVatTuService
      .getAll()
      .then(setHangHoaList)
      .finally(() => setLoadingHH(false));
  }, []);

  const updateRow = (index: number, patch: Partial<ChiTietCongThuc>) => {
    const updated = value.map((row, i) => (i !== index ? row : { ...row, ...patch }));
    onChange(updated);
  };

  const addRow = () => {
    onChange([...value, emptyRow()]);
  };

  const deleteRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleHangHoaSelect = (index: number, ma: string) => {
    const item = hangHoaList.find((h) => h.ma === ma);
    if (!item) return;
    updateRow(index, {
      hangHoaMa: item.ma,
      hangHoaTen: item.ten,
      donViTinh: item.donViTinhTen || '',
    });
  };

  const hangHoaOptions = hangHoaList.map((h) => ({
    value: h.ma,
    label: `${h.ma} - ${h.ten}`,
  }));

  const columns: ColumnsType<ChiTietCongThuc> = [
    {
      title: '#',
      width: 40,
      align: 'center',
      render: (_: unknown, __: ChiTietCongThuc, index: number) => index + 1,
    },
    {
      title: 'Mã hàng',
      dataIndex: 'hangHoaMa',
      width: 180,
      render: (_: unknown, _row: ChiTietCongThuc, index: number) => (
        <Select
          size="small"
          style={{ width: '100%', height: CONTROL_HEIGHT }}
          showSearch
          loading={loadingHH}
          optionFilterProp="label"
          placeholder="-- Chọn hàng hóa --"
          value={value[index]?.hangHoaMa || undefined}
          options={hangHoaOptions}
          onChange={(ma: string) => handleHangHoaSelect(index, ma)}
          allowClear
          onClear={() =>
            updateRow(index, { hangHoaMa: '', hangHoaTen: '', donViTinh: '' })
          }
        />
      ),
    },
    {
      title: 'Tên hàng',
      dataIndex: 'hangHoaTen',
      width: 180,
      render: (_: unknown, _row: ChiTietCongThuc, index: number) => (
        <span style={{ fontSize: 13 }}>{value[index]?.hangHoaTen || ''}</span>
      ),
    },
    {
      title: 'Định lượng/suất',
      dataIndex: 'dinhLuong',
      width: 130,
      align: 'right',
      render: (_: unknown, _row: ChiTietCongThuc, index: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          value={value[index]?.dinhLuong ?? 0}
          onChange={(v) => updateRow(index, { dinhLuong: v ?? 0 })}
        />
      ),
    },
    {
      title: 'ĐVT',
      dataIndex: 'donViTinh',
      width: 80,
      render: (_: unknown, _row: ChiTietCongThuc, index: number) => (
        <span style={{ fontSize: 13 }}>{value[index]?.donViTinh || ''}</span>
      ),
    },
    {
      title: 'Cách xuất',
      dataIndex: 'cachXuat',
      width: 140,
      render: (_: unknown, _row: ChiTietCongThuc, index: number) => (
        <Select<CachXuatCongThuc>
          size="small"
          style={{ width: '100%', height: CONTROL_HEIGHT }}
          value={value[index]?.cachXuat || 'DINH_LUONG'}
          options={cachXuatOptions}
          onChange={(v) => updateRow(index, { cachXuat: v })}
        />
      ),
    },
    {
      title: '',
      key: 'action',
      width: 40,
      align: 'center',
      render: (_: unknown, _row: ChiTietCongThuc, index: number) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => deleteRow(index)}
        />
      ),
    },
  ];

  return (
    <div>
      <Table<ChiTietCongThuc>
        dataSource={value}
        columns={columns}
        rowKey={(_, index) => String(index)}
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
      />
      <Space style={{ marginTop: 8 }}>
        <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={addRow}>
          Thêm nguyên liệu
        </Button>
      </Space>
    </div>
  );
}
