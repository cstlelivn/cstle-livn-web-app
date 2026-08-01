export function mergeEntityById<T extends { id: string | number }>(
  rows: T[],
  incoming: T,
  sort?: (a: T, b: T) => number
) {
  const next = new Map(rows.map((row) => [String(row.id), row]));
  next.set(String(incoming.id), { ...next.get(String(incoming.id)), ...incoming });
  const result = [...next.values()];
  return sort ? result.sort(sort) : result;
}

export function removeEntityById<T extends { id: string | number }>(
  rows: T[],
  id: string | number
) {
  return rows.filter((row) => String(row.id) !== String(id));
}
