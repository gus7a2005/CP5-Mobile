export function isValidEmail(v: string): boolean { return /^\S+@\S+\.\S+$/.test(v.trim()); }
export function isValidBirthDate(v: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return false;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d < new Date();
}
export function toIsoDate(v: string): string { const [d, m, y] = v.split('/'); return `${y}-${m}-${d}`; }