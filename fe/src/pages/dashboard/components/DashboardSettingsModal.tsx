import React, { useEffect, useState } from 'react';
import { Modal, Checkbox, Row, Col } from 'antd';
import {
  ComposedChart, Bar, Line, PieChart, Pie, Cell, LineChart,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';

const TEAL = '#2BC4A8';
const GRAY = '#C9CDD4';
const ORANGE = '#F2994A';
const NAVY = '#1F3864';
const GOLD = '#C9A227';
const RED = '#D6453B';

// Kích thước cố định cho preview (không dùng ResponsiveContainer — trong Modal nó
// hay đo width=0 lúc vừa mở khiến chart cột/đường vẽ trắng).
const PW = 200;
const PH = 84;

/** Tất cả khối báo cáo của dashboard (key + nhãn). Thứ tự = thứ tự hiển thị. */
export const DASHBOARD_BLOCKS: { key: string; label: string }[] = [
  { key: 'kqkd', label: 'Kết quả kinh doanh' },
  { key: 'dongTien', label: 'Dòng tiền' },
  { key: 'tinhHinhThucHien', label: 'Tình hình thực hiện' },
  { key: 'tyTrong', label: 'Tỷ trọng' },
  { key: 'congNo', label: 'Công nợ' },
  { key: 'canDoi', label: 'Cân đối tài chính' },
  { key: 'nghiaVuChinhSach', label: 'Nghĩa vụ chính sách' },
];

export const ALL_BLOCK_KEYS = DASHBOARD_BLOCKS.map((b) => b.key);

const comboData = [
  { x: 1, a: 23, b: 10, c: 13 },
  { x: 2, a: 12, b: 6, c: 6 },
  { x: 3, a: 25, b: 9, c: 16 },
  { x: 4, a: 25, b: 8, c: 17 },
];
const donutData = [{ v: 55 }, { v: 25 }, { v: 12 }, { v: 8 }];
const lineData = [
  { x: 1, a: 30, b: 18 }, { x: 2, a: 34, b: 22 }, { x: 3, a: 28, b: 26 }, { x: 4, a: 40, b: 24 },
];

const PreviewKQKD: React.FC = () => (
  <ComposedChart width={PW} height={PH} data={comboData} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
    <Bar dataKey="a" fill={TEAL} maxBarSize={12} />
    <Bar dataKey="b" fill={GRAY} maxBarSize={12} />
    <Line dataKey="c" stroke={ORANGE} strokeWidth={2} dot={false} />
  </ComposedChart>
);

const PreviewDongTien: React.FC = () => (
  <ComposedChart width={PW} height={PH} data={comboData.map((d) => ({ ...d, b: -d.b }))} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
    <Bar dataKey="a" fill={TEAL} maxBarSize={12} />
    <Bar dataKey="b" fill={GRAY} maxBarSize={12} />
    <Line dataKey="c" stroke={ORANGE} strokeWidth={2} dot={false} />
  </ComposedChart>
);

const PreviewGauge: React.FC = () => (
  <RadialBarChart width={PW} height={PH} cy={PH - 6} innerRadius="120%" outerRadius="160%" startAngle={180} endAngle={0} data={[{ value: 65 }]} barSize={9}>
    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
    <RadialBar dataKey="value" background fill={TEAL} cornerRadius={6} />
  </RadialBarChart>
);

const PreviewDonut: React.FC = () => (
  <PieChart width={PW} height={PH}>
    <Pie data={donutData} dataKey="v" cx="50%" cy="50%" innerRadius={18} outerRadius={36} paddingAngle={2}>
      {donutData.map((_, i) => (
        <Cell key={i} fill={[NAVY, GOLD, '#2F5597', '#8497B0'][i % 4]} />
      ))}
    </Pie>
  </PieChart>
);

const PreviewCongNo: React.FC = () => (
  <LineChart width={PW} height={PH} data={lineData} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
    <Line dataKey="a" stroke={TEAL} strokeWidth={2} dot={false} />
    <Line dataKey="b" stroke={RED} strokeWidth={2} dot={false} />
  </LineChart>
);

const PreviewCanDoi: React.FC = () => (
  <div className="flex gap-1" style={{ width: PW, height: PH }}>
    <div className="flex-1 flex flex-col">
      <div style={{ flex: 6, background: ORANGE }} />
      <div style={{ flex: 4, background: GOLD }} />
    </div>
    <div className="flex-1 flex flex-col">
      <div style={{ flex: 3, background: '#2AC8E8' }} />
      <div style={{ flex: 7, background: '#7B3FBF' }} />
    </div>
  </div>
);

const PreviewNvcs: React.FC = () => (
  <div className="flex flex-col gap-[3px]" style={{ width: PW, height: PH, padding: 4 }}>
    <div style={{ height: 12, background: GRAY, opacity: 0.6, borderRadius: 2 }} />
    {[NAVY, TEAL, GOLD].map((c, i) => (
      <div key={i} className="flex gap-[3px]" style={{ flex: 1 }}>
        <div style={{ width: 56, background: c, opacity: 0.25, borderRadius: 2 }} />
        <div style={{ flex: 1, background: c, opacity: 0.45, borderRadius: 2 }} />
        <div style={{ flex: 1, background: c, opacity: 0.45, borderRadius: 2 }} />
      </div>
    ))}
  </div>
);

const PREVIEWS: Record<string, React.FC> = {
  kqkd: PreviewKQKD,
  dongTien: PreviewDongTien,
  tinhHinhThucHien: PreviewGauge,
  tyTrong: PreviewDonut,
  congNo: PreviewCongNo,
  canDoi: PreviewCanDoi,
  nghiaVuChinhSach: PreviewNvcs,
};

interface Props {
  open: boolean;
  value: string[];
  saving?: boolean;
  onSave: (blocks: string[]) => void;
  onClose: () => void;
}

const DashboardSettingsModal: React.FC<Props> = ({ open, value, saving, onSave, onClose }) => {
  const [selected, setSelected] = useState<string[]>(value);

  useEffect(() => {
    if (open) setSelected(value);
  }, [open, value]);

  const toggle = (key: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...new Set([...prev, key])] : prev.filter((k) => k !== key)));
  };

  return (
    <Modal
      title="Chọn báo cáo hiển thị"
      open={open}
      onCancel={onClose}
      onOk={() => onSave(selected)}
      okText="Lưu"
      cancelText="Huỷ"
      confirmLoading={saving}
      width={760}
    >
      <div className="text-xs text-muted-foreground mb-2">Tick vào báo cáo muốn hiển thị trên Tổng quan (tab Tài chính).</div>
      <Row gutter={[12, 12]}>
        {DASHBOARD_BLOCKS.map((b) => {
          const Preview = PREVIEWS[b.key];
          const checked = selected.includes(b.key);
          return (
            <Col xs={24} sm={12} md={8} key={b.key}>
              <div
                onClick={() => toggle(b.key, !checked)}
                className="rounded-md border p-2 cursor-pointer h-full transition-colors"
                style={{ borderColor: checked ? 'hsl(var(--primary))' : 'hsl(var(--border))', background: checked ? 'hsl(var(--primary) / 0.04)' : undefined }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold truncate">{b.label}</span>
                  <Checkbox checked={checked} onChange={(e) => toggle(b.key, e.target.checked)} onClick={(e) => e.stopPropagation()} />
                </div>
                <div className="bg-muted/30 rounded flex items-center justify-center overflow-hidden" style={{ height: PH }}>
                  {Preview && <Preview />}
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </Modal>
  );
};

export default DashboardSettingsModal;
