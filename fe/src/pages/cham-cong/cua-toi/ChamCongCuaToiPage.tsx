import { useEffect } from "react";
import {
  ChamCongCuaToiHandlerProvider,
  useChamCongCuaToiHandler,
} from "./ChamCongCuaToiHandlerContext";
import { ShiftCard } from "./components/ShiftCard";
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
      <ShiftCard />
      <LichTuan />
      <BaOTrangThai />
      <NutCham />
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
