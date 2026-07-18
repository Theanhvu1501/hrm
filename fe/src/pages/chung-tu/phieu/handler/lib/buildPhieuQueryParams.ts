import { PhieuQueryParams } from "@/services/phieuService";

type StateGetter = (key: string) => unknown;

export function buildPhieuQueryParams(getState: StateGetter): PhieuQueryParams {
  const searchText = (getState("searchText") as string) || "";
  const dateRange = getState("dateRange") as
    | [{ format: (f: string) => string }, { format: (f: string) => string }]
    | null;
  const filterDoiTuong = getState("filterDoiTuong") as string | undefined;
  const filterDuAn = getState("filterDuAn") as string | undefined;
  const filterBoPhan = getState("filterBoPhan") as string | undefined;
  const filterTaiKhoanNo = getState("filterTaiKhoanNo") as string | undefined;
  const filterTaiKhoanCo = getState("filterTaiKhoanCo") as string | undefined;

  const params: PhieuQueryParams = {};
  if (searchText) params.search = searchText;
  if (dateRange && dateRange[0] && dateRange[1]) {
    params.startDate = dateRange[0].format("YYYY-MM-DD");
    params.endDate = dateRange[1].format("YYYY-MM-DD");
  }
  if (filterDoiTuong) params.doiTuong = filterDoiTuong;
  if (filterDuAn) params.duAn = filterDuAn;
  if (filterBoPhan) params.boPhan = filterBoPhan;
  if (filterTaiKhoanNo) params.taiKhoanNo = filterTaiKhoanNo;
  if (filterTaiKhoanCo) params.taiKhoanCo = filterTaiKhoanCo;
  return params;
}
