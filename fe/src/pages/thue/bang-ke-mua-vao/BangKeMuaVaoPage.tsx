import React from "react";
import BangKePage from "../components/BangKePage";
import { bangKeMuaVaoService } from "@/services/taxService";

const BangKeMuaVaoPage: React.FC = () => (
  <BangKePage
    variant="mua"
    service={bangKeMuaVaoService}
    routeKey="/thue/bang-ke-mua-vao"
    title="Bảng kê mua vào"
  />
);

export default BangKeMuaVaoPage;
