import { useEffect } from "react";
import {
  ChamCongCuaToiHandlerProvider,
  useChamCongCuaToiHandler,
} from "./ChamCongCuaToiHandlerContext";
import { LichTuan } from "./components/LichTuan";
import { BaOTrangThai } from "./components/BaOTrangThai";
import { NutCham } from "./components/NutCham";
import { ChiTietChamCong } from "./components/ChiTietChamCong";

function ChamCongCuaToiPageInner() {
  const handler = useChamCongCuaToiHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="w-full">
      {/*
        Thứ tự iOS: Hero (đồng hồ + ca + tiến trình + nút chấm, sống trong
        NutCham) lên đầu làm nhân vật chính; rồi ba ô trạng thái, lịch tuần,
        và chi tiết. NutCham tự lo các trạng thái tải/chặn/lỗi — khi đó các
        khối dưới (guard theo homNay) tự ẩn.
      */}
      <div className="mb-4">
        <NutCham />
      </div>
      <BaOTrangThai />
      <LichTuan />
      <ChiTietChamCong />
    </div>
  );
}

const ChamCongCuaToiPage: React.FC = () => (
  <ChamCongCuaToiHandlerProvider>
    <ChamCongCuaToiPageInner />
  </ChamCongCuaToiHandlerProvider>
);

export default ChamCongCuaToiPage;
