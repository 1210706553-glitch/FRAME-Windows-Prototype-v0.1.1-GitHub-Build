export function mergeApplicationNames(current: string[], selected: string[]): string[] {
  const seen = new Set<string>();
  return [...current, ...selected]
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0 && !seen.has(name) && Boolean(seen.add(name)));
}
