import { useEffect, useState } from 'react';
import { Table, Select, InputNumber, Input, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ChiTietPhieuKho, HangHoaVatTu, Kho, LoaiPhieuKho } from '@/types';
import { hangHoaVatTuService } from '@/services/hangHoaVatTuService';
import { khoService } from '@/services/khoService';
import { formatCurrency } from '@/pages/chung-tu/phieu/lib/format';

const CONTROL_HEIGHT = 28;

interface Props {
  value: ChiTietPhieuKho[];
  onChange: (rows: ChiTietPhieuKho[]) => void;
  loaiPhieu: LoaiPhieuKho;
}

function emptyRow(stt: number): ChiTietPhieuKho {
  return {
    stt,
    hangHoaMa: '',
    hangHoaTen: '',
    donViTinh: '',
    khoMa: '',
    khoTen: '',
    tkNo: '',
    tkCo: '',
    soLuong: 0,
    donGia: 0,
    thanhTien: 0,
  };
}

function calcThanhTien(row: ChiTietPhieuKho): number {
  return (row.soLuong || 0) * (row.donGia || 0);
}

export function ChiTietTable({ value, onChange, loaiPhieu }: Props) {
  const [hangHoaList, setHangHoaList] = useState<HangHoaVatTu[]>([]);
  const [khoList, setKhoList] = useState<Kho[]>([]);
  const [loadingHH, setLoadingHH] = useState(false);
  const [loadingKho, setLoadingKho] = useState(false);

  useEffect(() => {
    setLoadingHH(true);
    hangHoaVatTuService
      .getAll()
      .then(setHangHoaList)
      .finally(() => setLoadingHH(false));

    setLoadingKho(true);
    khoService
      .getAll()
      .then(setKhoList)
      .finally(() => setLoadingKho(false));
  }, []);

  const updateRow = (index: number, patch: Partial<ChiTietPhieuKho>) => {
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
      // Gợi ý tkNo/tkCo từ tkKho của hàng hóa
      tkNo: loaiPhieu === 'NHAP' ? (item.tkKho || '') : '',
      tkCo: loaiPhieu === 'XUAT' ? (item.tkKho || '') : '',
    });
  };

  const tongTien = value.reduce((sum, row) => sum + (row.thanhTien || 0), 0);

  const hangHoaOptions = hangHoaList.map((h) => ({
    value: h.ma,
    label: `${h.ma} - ${h.ten}`,
  }));

  const khoOptions = khoList.map((k) => ({
    value: k.ma,
    label: `${k.ma} - ${k.ten}`,
  }));

  const columns: ColumnsType<ChiTietPhieuKho> = [
    {
      title: '#',
      dataIndex: 'stt',
      width: 40,
      align: 'center',
      render: (_: unknown, __: ChiTietPhieuKho, index: number) => index + 1,
    },
    {
      title: 'Mã hàng',
      dataIndex: 'hangHoaMa',
      width: 160,
      render: (_: unknown, _row: ChiTietPhieuKho, index: number) => (
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
      width: 180,
      render: (_: unknown, _row: ChiTietPhieuKho, index: number) => (
        <span style={{ fontSize: 13 }}>{value[index]?.hangHoaTen || ''}</span>
      ),
    },
    ...(loaiPhieu !== 'CHUYEN'
      ? [
          {
            title: 'Kho',
            dataIndex: 'khoMa',
            width: 140,
            render: (_: unknown, _row: ChiTietPhieuKho, index: number) => (
              <Select
                size="small"
                style={{ width: '100%', height: CONTROL_HEIGHT }}
                showSearch
                loading={loadingKho}
                optionFilterProp="label"
                placeholder="-- Chọn kho --"
                value={value[index]?.khoMa || undefined}
                options={khoOptions}
                allowClear
                onChange={(ma: string) => {
                  const kho = khoList.find((k) => k.ma === ma);
                  updateRow(index, { khoMa: ma || '', khoTen: kho?.ten || '' });
                }}
                onClear={() => updateRow(index, { khoMa: '', khoTen: '' })}
              />
            ),
          } as ColumnsType<ChiTietPhieuKho>[number],
        ]
      : []),
    {
      title: 'TK Nợ',
      dataIndex: 'tkNo',
      width: 100,
      render: (_: unknown, _row: ChiTietPhieuKho, index: number) => (
        <Input
          size="small"
          style={{ width: '100%' }}
          value={value[index]?.tkNo || ''}
          onChange={(e) => updateRow(index, { tkNo: e.target.value })}
          placeholder="TK Nợ"
        />
      ),
    },
    {
      title: 'TK Có',
      dataIndex: 'tkCo',
      width: 100,
      render: (_: unknown, _row: ChiTietPhieuKho, index: number) => (
        <Input
          size="small"
          style={{ width: '100%' }}
          value={value[index]?.tkCo || ''}
          onChange={(e) => updateRow(index, { tkCo: e.target.value })}
          placeholder="TK Có"
        />
      ),
    },
    {
      title: 'ĐVT',
      dataIndex: 'donViTinh',
      width: 70,
      render: (_: unknown, _row: ChiTietPhieuKho, index: number) => (
        <span style={{ fontSize: 13 }}>{value[index]?.donViTinh || ''}</span>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'soLuong',
      width: 90,
      align: 'right',
      render: (_: unknown, _row: ChiTietPhieuKho, index: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          value={value[index]?.soLuong ?? 0}
          onChange={(v) => updateRow(index, { soLuong: v ?? 0 })}
        />
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'donGia',
      width: 110,
      align: 'right',
      render: (_: unknown, _row: ChiTietPhieuKho, index: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
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
      width: 120,
      align: 'right',
      render: (_: unknown, _row: ChiTietPhieuKho, index: number) => (
        <span style={{ fontSize: 13 }}>{formatCurrency(value[index]?.thanhTien || 0)}</span>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 40,
      align: 'center',
      render: (_: unknown, _row: ChiTietPhieuKho, index: number) => (
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
      <Table<ChiTietPhieuKho>
        dataSource={value}
        columns={columns}
        rowKey={(_, index) => String(index)}
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={loaiPhieu !== 'CHUYEN' ? 9 : 8} align="right">
              <strong>Tổng cộng</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <strong>{formatCurrency(tongTien)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} />
          </Table.Summary.Row>
        )}
      />
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
    </div>
  );
}
