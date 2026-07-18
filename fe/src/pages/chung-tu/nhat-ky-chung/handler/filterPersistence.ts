import dayjs from "dayjs";

// Persist the "Dữ liệu tổng hợp" filter state across page remounts
// (e.g. when the user opens a voucher to edit and navigates back).
// Stored in sessionStorage so it lives for the browser tab session only.
const STORAGE_KEY = "nkc:filters";

// Simple string/undefined filter keys handled generically
const SCALAR_FILTER_KEYS = [
  "searchText",
  "filterAccount",
  "filterLoaiChungTu",
  "filterDoiTuong",
  "filterDuAn",
  "filterBoPhan",
  "filterTaiKhoanCo",
] as const;

interface StateAccessor {
  getState: (key: string) => unknown;
  setState: (key: string, value: unknown) => void;
}

export function saveFilters(handler: StateAccessor): void {
  try {
    const dateRange = handler.getState("dateRange") as
      | [dayjs.Dayjs, dayjs.Dayjs]
      | null;

    const payload: Record<string, unknown> = {
      dateRange:
        dateRange && dateRange[0] && dateRange[1]
          ? [dateRange[0].toISOString(), dateRange[1].toISOString()]
          : null,
    };

    for (const key of SCALAR_FILTER_KEYS) {
      payload[key] = handler.getState(key) ?? null;
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Error saving filters:", error);
  }
}

export function restoreFilters(handler: StateAccessor): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const payload = JSON.parse(raw) as Record<string, unknown>;

    for (const key of SCALAR_FILTER_KEYS) {
      const value = payload[key];
      handler.setState(key, value == null ? (key === "searchText" ? "" : undefined) : value);
    }

    const dr = payload.dateRange as [string, string] | null;
    if (dr && dr[0] && dr[1]) {
      handler.setState("dateRange", [dayjs(dr[0]), dayjs(dr[1])]);
    } else {
      handler.setState("dateRange", null);
    }
  } catch (error) {
    console.error("Error restoring filters:", error);
  }
}
