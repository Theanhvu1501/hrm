import React from "react";
import BangKePage from "../components/BangKePage";
import { bangKeBanRaService } from "@/services/taxService";

const BangKeBanRaPage: React.FC = () => (
  <BangKePage
    variant="ban"
    service={bangKeBanRaService}
    routeKey="/thue/bang-ke-ban-ra"
    title="Bảng kê bán ra"
  />
);

export default BangKeBanRaPage;
