export function buildDirectId(a: string, b: string): string {
  return [a, b].sort().join('_');
}