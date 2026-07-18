import React from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { balanceSheetService } from '@/services/balanceSheetService';
import { formatCurrency } from './format';

const COL = {
  taiSan: '#82B366',
  nguonVon: '#D9909A',
  nganHan: '#ED9C3C',
  daiHan: '#F2D14B',
  noPhaiTra: '#2AC8E8',
  vonCSH: '#7B3FBF',
  tong: '#D6453B',
};

const trieu = (v: number) => Math.round((v || 0) / 1e6).toLocaleString('vi-VN');

const Segment: React.FC<{
  grow: number; bg: string; text: string; label: string; pct: number; value: number;
}> = ({ grow, bg, text, label, pct, value }) => (
  <div
    style={{ flexGrow: grow, flexBasis: 0, minHeight: grow > 0 ? 28 : 0, background: bg, color: text }}
    className="flex flex-col items-center justify-center px-1 text-center overflow-hidden border-t border-white/40"
  >
    {grow > 0 && (
      <>
        <span className="text-[11px] sm:text-xs font-semibold leading-tight">{label}</span>
        <span className="text-[10px] sm:text-[11px] opacity-90">{pct.toFixed(0)}% · {trieu(value)} tr</span>
      </>
    )}
  </div>
);

const Header: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => (
  <div style={{ background: bg }} className="text-center text-xs sm:text-sm font-bold py-1.5 text-[#333]">
    {children}
  </div>
);

const BalanceStructureChart: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dash-balance-structure'],
    queryFn: () => balanceSheetService.getStats(),
  });

  const tsNH = data?.taiSanNganHan ?? 0;
  const tsDH = data?.taiSanDaiHan ?? 0;
  const npt = data?.noPhaiTra ?? 0;
  const vcsh = data?.vonChuSoHuu ?? 0;
  const tongTS = tsNH + tsDH;
  const tongNV = npt + vcsh;
  const pct = (v: number, t: number) => (t > 0 ? (v / t) * 100 : 0);
  const hasData = tongTS > 0 || tongNV > 0;
  const COL_H = 320;

  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">CÂN ĐỐI TÀI CHÍNH</span>} bodyStyle={{ padding: 12 }}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: COL_H }} className="flex flex-col items-center justify-center" />
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-px bg-white/40">
            <div className="flex flex-col">
              <Header bg={COL.taiSan}>TÀI SẢN</Header>
              <div className="flex flex-col" style={{ height: COL_H }}>
                <Segment grow={tsNH} bg={COL.nganHan} text="#3a2a00" label="TÀI SẢN NGẮN HẠN" pct={pct(tsNH, tongTS)} value={tsNH} />
                <Segment grow={tsDH} bg={COL.daiHan} text="#3a2a00" label="TÀI SẢN DÀI HẠN" pct={pct(tsDH, tongTS)} value={tsDH} />
              </div>
            </div>
            <div className="flex flex-col">
              <Header bg={COL.nguonVon}>NGUỒN VỐN</Header>
              <div className="flex flex-col" style={{ height: COL_H }}>
                <Segment grow={npt} bg={COL.noPhaiTra} text="#063b45" label="NỢ PHẢI TRẢ" pct={pct(npt, tongNV)} value={npt} />
                <Segment grow={vcsh} bg={COL.vonCSH} text="#fff" label="VỐN CHỦ SỞ HỮU" pct={pct(vcsh, tongNV)} value={vcsh} />
              </div>
            </div>
          </div>
          <div style={{ background: COL.tong }} className="text-center text-white font-bold text-xs sm:text-sm py-2 mt-px">
            TỔNG GIÁ TRỊ: {formatCurrency(tongTS)}
          </div>
        </div>
      )}
    </Card>
  );
};

export default BalanceStructureChart;
