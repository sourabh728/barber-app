const LOWERCASE_WORDS = new Set(['and', 'da', 'de', 'of']);

/** Trim, collapse spaces and title-case so "pune" / "PUNE" / "Pune " all become "Pune". */
export function normalizeLocationName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((word, index) =>
      index > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

/** Case-insensitive de-duplication that returns normalized, sorted names. */
export function uniqueLocationNames(values: (string | null | undefined)[]) {
  const names = new Set<string>();
  for (const value of values) {
    const name = value ? normalizeLocationName(value) : '';
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Normalizes city/state on a shop payload; leaves other fields untouched. */
export function withNormalizedLocation<
  T extends { city?: string; state?: string },
>(data: T): T {
  return {
    ...data,
    ...(typeof data.city === 'string'
      ? { city: normalizeLocationName(data.city) }
      : {}),
    ...(typeof data.state === 'string'
      ? { state: normalizeLocationName(data.state) }
      : {}),
  };
}
