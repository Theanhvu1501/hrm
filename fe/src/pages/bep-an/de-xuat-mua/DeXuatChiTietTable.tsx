import { useEffect, useState } from 'react';
import { Table, Select, InputNumber, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ChiTietDeXuat, HangHoaVatTu } from '@/types';
import { hangHoaVatTuService } from '@/services/hangHoaVatTuService';
import { formatCurrency } from '@/pages/chung-tu/phieu/lib/format';

interface Props {
  value: ChiTietDeXuat[];
  onChange: (rows: ChiTietDeXuat[]) => void;
  disabled?: boolean;
}

function emptyRow(stt: number): ChiTietDeXuat {
  return {
    stt,
    hangHoaMa: '',
    hangHoaTen: '',
    donViTinh: '',
    soLuong: 0,
    donGia: 0,
    thanhTien: 0,
  };
}

function calcThanhTien(row: ChiTietDeXuat): number {
  return (row.soLuong || 0) * (row.donGia || 0);
}

export function DeXuatChiTietTable({ value, onChange, disabled }: Props) {
  const [hangHoaList, setHangHoaList] = useState<HangHoaVatTu[]>([]);
  const [loadingHH, setLoadingHH] = useState(false);

  useEffect(() => {
    setLoadingHH(true);
    hangHoaVatTuService
      .getAll()
      .then(setHangHoaList)
      .finally(() => setLoadingHH(false));
  }, []);

  const updateRow = (index: number, patch: Partial<ChiTietDeXuat>) => {
    const updated = value.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, ...patch };
      next.thanhTien = calcThanhTien(next);
      return next;
    });
    onChange(updated);
  };

  const addRow = () => {
    onChange([...value, emptyRow(value.length + 1)]);
  };

  const deleteRow = (index: number) => {
    const filtered = value.filter((_, i) => i !== index);
    // Re-number stt from 1
    const renumbered = filtered.map((row, i) => ({ ...row, stt: i + 1 }));
    onChange(renumbered);
  };

  const handleHangHoaSelect = (index: number, ma: string) => {
    const item = hangHoaList.find((h) => h.ma === ma);
    if (!item) return;
    updateRow(index, {
      hangHoaMa: item.ma,
      hangHoaTen: item.ten,
      donViTinh: item.donViTinhTen || '',
      donGia: item.donGia || 0,
    });
  };

  const tongTien = value.reduce((sum, row) => sum + (row.thanhTien || 0), 0);

  const hangHoaOptions = hangHoaList.map((h) => ({
    value: h.ma,
    label: `${h.ma} - ${h.ten}`,
  }));

  const columns: ColumnsType<ChiTietDeXuat> = [
    {
      title: '#',
      dataIndex: 'stt',
      width: 40,
      align: 'center',
      render: (_: unknown, __: ChiTietDeXuat, index: number) => index + 1,
    },
    {
      title: 'Mã hàng',
      dataIndex: 'hangHoaMa',
      width: 180,
      render: (_: unknown, _row: ChiTietDeXuat, index: number) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          showSearch
          loading={loadingHH}
          optionFilterProp="label"
          placeholder="-- Chọn hàng hóa --"
          value={value[index]?.hangHoaMa || undefined}
          options={hangHoaOptions}
          disabled={disabled}
          onChange={(ma: string) => handleHangHoaSelect(index, ma)}
          allowClear
          onClear={() =>
            updateRow(index, {
              hangHoaMa: '',
              hangHoaTen: '',
              donViTinh: '',
              donGia: 0,
              thanhTien: 0,
            })
          }
        />
      ),
    },
    {
      title: 'Tên hàng',
      dataIndex: 'hangHoaTen',
      width: 200,
      render: (_: unknown, _row: ChiTietDeXuat, index: number) => (
        <span style={{ fontSize: 13 }}>{value[index]?.hangHoaTen || ''}</span>
      ),
    },
    {
      title: 'ĐVT',
      dataIndex: 'donViTinh',
      width: 80,
      render: (_: unknown, _row: ChiTietDeXuat, index: number) => (
        <span style={{ fontSize: 13 }}>{value[index]?.donViTinh || ''}</span>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'soLuong',
      width: 100,
      align: 'right',
      render: (_: unknown, _row: ChiTietDeXuat, index: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          disabled={disabled}
          value={value[index]?.soLuong ?? 0}
          onChange={(v) => updateRow(index, { soLuong: v ?? 0 })}
        />
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'donGia',
      width: 120,
      align: 'right',
      render: (_: unknown, _row: ChiTietDeXuat, index: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          disabled={disabled}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0)}
          value={value[index]?.donGia ?? 0}
          onChange={(v) => updateRow(index, { donGia: v ?? 0 })}
        />
      ),
    },
    {
      title: 'Thành tiền',
      dataIndex: 'thanhTien',
      width: 130,
      align: 'right',
      render: (_: unknown, _row: ChiTietDeXuat, index: number) => (
        <span style={{ fontSize: 13 }}>{formatCurrency(value[index]?.thanhTien || 0)}</span>
      ),
    },
    ...(disabled
      ? []
      : [
          {
            title: '',
            key: 'action',
            width: 40,
            align: 'center' as const,
            render: (_: unknown, _row: ChiTietDeXuat, index: number) => (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => deleteRow(index)}
              />
            ),
          } as ColumnsType<ChiTietDeXuat>[number],
        ]),
  ];

  return (
    <div>
      <Table<ChiTietDeXuat>
        dataSource={value}
        columns={columns}
        rowKey={(_, index) => String(index)}
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={6} align="right">
              <strong>Tổng cộng</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <strong>{formatCurrency(tongTien)}</strong>
            </Table.Summary.Cell>
            {!disabled && <Table.Summary.Cell index={2} />}
          </Table.Summary.Row>
        )}
      />
      {!disabled && (
        <Space style={{ marginTop: 8 }}>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            size="small"
            onClick={addRow}
          >
            Thêm dòng
          </Button>
        </Space>
      )}
    </div>
  );
}
