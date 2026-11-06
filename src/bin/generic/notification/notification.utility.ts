export function normaliseOptionalString(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function uniqueStrings(values: (string | null | undefined)[]): string[] {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === 'string' && value.length > 0,
      ),
    ),
  );
}

export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    total,
    page,
    pageSize,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}
