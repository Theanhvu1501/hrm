export interface DoiTuongBucket {
  ma: string;
  doiTuongMa: string | null;
  doiTuongTen: string | null;
  doiTuongLoai: string | null;
  priorNo: number;
  priorCo: number;
  periodNo: number;
  periodCo: number;
}

export interface RawNoGroup {
  _id: { ma: string; dt: string | null | undefined };
  doiTuongTen: string | null;
  doiTuongLoai: string | null;
  priorNo: number;
  periodNo: number;
}

export interface RawCoGroup {
  _id: { ma: string; dt: string | null | undefined };
  doiTuongTen: string | null;
  doiTuongLoai: string | null;
  priorCo: number;
  periodCo: number;
}

/** Gộp kết quả $facet (Nợ + Có) theo khóa (mã TK, mã đối tượng). */
export function mergeDoiTuongBuckets(
  noEntries: RawNoGroup[],
  coEntries: RawCoGroup[],
): DoiTuongBucket[] {
  const keyOf = (ma: string, dt: string | null) => `${ma}|${dt ?? ''}`;
  const map = new Map<string, DoiTuongBucket>();

  for (const e of noEntries) {
    const ma = e._id.ma;
    const dt = e._id.dt ?? null;
    map.set(keyOf(ma, dt), {
      ma,
      doiTuongMa: dt,
      doiTuongTen: e.doiTuongTen ?? null,
      doiTuongLoai: e.doiTuongLoai ?? null,
      priorNo: e.priorNo,
      priorCo: 0,
      periodNo: e.periodNo,
      periodCo: 0,
    });
  }

  for (const e of coEntries) {
    const ma = e._id.ma;
    const dt = e._id.dt ?? null;
    const k = keyOf(ma, dt);
    const existing: DoiTuongBucket = map.get(k) ?? {
      ma,
      doiTuongMa: dt,
      doiTuongTen: e.doiTuongTen ?? null,
      doiTuongLoai: e.doiTuongLoai ?? null,
      priorNo: 0,
      priorCo: 0,
      periodNo: 0,
      periodCo: 0,
    };
    existing.priorCo = e.priorCo;
    existing.periodCo = e.periodCo;
    if (existing.doiTuongTen === null) existing.doiTuongTen = e.doiTuongTen ?? null;
    if (existing.doiTuongLoai === null) existing.doiTuongLoai = e.doiTuongLoai ?? null;
    map.set(k, existing);
  }

  return Array.from(map.values());
}
