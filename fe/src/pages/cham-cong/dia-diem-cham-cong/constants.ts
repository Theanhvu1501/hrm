export const LOAI_DIA_DIEM_OPTIONS = [
  { value: "gps", label: "GPS" },
  { value: "wifi", label: "Wifi" },
  { value: "qr", label: "QR" },
] as const;

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "-");
}
