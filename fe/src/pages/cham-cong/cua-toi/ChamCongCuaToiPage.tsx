import { useEffect } from "react";
import {
  ChamCongCuaToiHandlerProvider,
  useChamCongCuaToiHandler,
} from "./ChamCongCuaToiHandlerContext";
import { NutCham } from "./components/NutCham";
import { LichSuHomNay } from "./components/LichSuHomNay";

function ChamCongCuaToiPageInner() {
  const handler = useChamCongCuaToiHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  // max-w-md: màn hình này dành cho điện thoại. Trên desktop nội dung giữ
  // nguyên bề ngang một cột và canh giữa, không trải rộng ra cả màn hình —
  // nút chấm công dài 1200px không giúp ai bấm nhanh hơn.
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <NutCham />
      <LichSuHomNay />
    </div>
  );
}

const ChamCongCuaToiPage: React.FC = () => (
  <ChamCongCuaToiHandlerProvider>
    <ChamCongCuaToiPageInner />
  </ChamCongCuaToiHandlerProvider>
);

export default ChamCongCuaToiPage;
