/**
 * Sanitize update DTO: convert empty strings to null
 * so that optional fields can be properly cleared.
 *
 * When FE sends empty string for an optional field,
 * we want to store null in DB (clearing the value),
 * not skip the field entirely.
 */
export function sanitizeUpdateDto<T extends object>(dto: T): T {
  const sanitized: Record<string, unknown> = {};
  for (const key of Object.keys(dto)) {
    const value = (dto as Record<string, unknown>)[key];
    sanitized[key] = value === '' ? null : value;
  }
  return sanitized as T;
}
