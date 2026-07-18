export interface NhatKyChungStats {
  tongSo: number;
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
}

export interface NhatKyChungStatsResponse {
  success: boolean;
  data: NhatKyChungStats;
}
