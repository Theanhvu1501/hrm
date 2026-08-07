import { Collapse, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { BieuDo, DiemBieuDo } from '../baoCao.types';
import { dinhDangGiaTri, dinhDangNhanBieuDo } from '../dinhDang';
import { MAU_LUOI } from '../mauSac';

/**
 * Một biểu đồ của báo cáo, kèm bảng số liệu gập được.
 *
 * Bảng không phải phần thừa: nó là đường đọc thay cho người không phân biệt
 * được màu và là thứ khách hàng copy số ra khi họp. Cùng với nhãn số in thẳng
 * trên mark, danh tính chuỗi không bao giờ chỉ dựa vào màu.
 *
 * Mỗi biểu đồ chỉ có MỘT trục giá trị và mọi chuỗi trong đó cùng đơn vị —
 * muốn vẽ hai đại lượng khác thang đo thì tách thành hai biểu đồ, đừng thêm
 * trục phải.
 */
export default function BieuDoNhom({ bieuDo }: { bieuDo: BieuDo }) {
  const nhieuChuoi = bieuDo.chuoi.length > 1;

  return (
    <div className="border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 text-[13px] font-semibold text-gray-700 dark:text-gray-200">
        {bieuDo.tieuDe}
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          {bieuDo.loai === 'cot' ? (
            <BarChart data={bieuDo.duLieu} margin={{ top: 18, right: 8, left: -8, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke={MAU_LUOI} vertical={false} />
              <XAxis dataKey="nhan" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <Tooltip
                cursor={{ fill: MAU_LUOI }}
                content={<NoiDungTooltip bieuDo={bieuDo} />}
              />
              {nhieuChuoi && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
              {bieuDo.chuoi.map((c) => (
                <Bar key={c.khoa} dataKey={c.khoa} name={c.ten} fill={c.mau} radius={[4, 4, 0, 0]} maxBarSize={26}>
                  <LabelList
                    dataKey={c.khoa}
                    position="top"
                    formatter={(v: number) => dinhDangNhanBieuDo(v, bieuDo.donVi)}
                  />
                </Bar>
              ))}
            </BarChart>
          ) : (
            <LineChart data={bieuDo.duLieu} margin={{ top: 18, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={MAU_LUOI} vertical={false} />
              <XAxis dataKey="nhan" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={44} domain={['dataMin - 4', 'dataMax + 4']} />
              <Tooltip content={<NoiDungTooltip bieuDo={bieuDo} />} />
              {nhieuChuoi && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
              {bieuDo.chuoi.map((c) => (
                <Line
                  key={c.khoa}
                  type="monotone"
                  dataKey={c.khoa}
                  name={c.ten}
                  stroke={c.mau}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 0, fill: c.mau }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList
                    dataKey={c.khoa}
                    position="top"
                    formatter={(v: number) => dinhDangNhanBieuDo(v, bieuDo.donVi)}
                  />
                </Line>
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <Collapse
        ghost
        size="small"
        items={[
          {
            key: 'bang',
            label: <span className="text-[11px] text-gray-500">Xem số liệu dạng bảng</span>,
            children: <BangSoLieu bieuDo={bieuDo} />,
          },
        ]}
      />
    </div>
  );
}

function NoiDungTooltip({
  bieuDo,
  active,
  payload,
  label,
}: TooltipProps<number, string> & { bieuDo: BieuDo }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md dark:border-gray-600 dark:bg-gray-900">
      <div className="mb-1 font-semibold text-gray-700 dark:text-gray-200">{label}</div>
      {payload.map((m) => (
        <div key={String(m.dataKey)} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <span className="inline-block h-2 w-2 shrink-0" style={{ background: m.color }} />
          <span>{m.name}:</span>
          <span className="font-semibold">
            {dinhDangGiaTri(Number(m.value), bieuDo.donVi)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BangSoLieu({ bieuDo }: { bieuDo: BieuDo }) {
  const cot: ColumnsType<DiemBieuDo> = [
    { title: 'Kỳ', dataIndex: 'nhan', key: 'nhan', width: 60 },
    ...bieuDo.chuoi.map((c) => ({
      title: c.ten,
      dataIndex: c.khoa,
      key: c.khoa,
      align: 'right' as const,
      render: (v: number) => dinhDangGiaTri(v, bieuDo.donVi),
    })),
  ];

  return (
    <Table
      rowKey="nhan"
      size="small"
      pagination={false}
      columns={cot}
      dataSource={bieuDo.duLieu}
      className="text-[11px]"
    />
  );
}
