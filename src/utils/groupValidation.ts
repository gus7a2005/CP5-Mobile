export function validateGroupForm(name: string, limit: number, selectedCount: number): string | null {
  if (name.trim().length < 3) return 'O nome precisa ter ao menos 3 caracteres.';
  if (!Number.isInteger(limit) || limit < 2) return 'O limite deve ser um inteiro maior ou igual a 2.';
  if (selectedCount < 2) return 'O grupo precisa de ao menos 2 integrantes (você + 1).';
  if (selectedCount > limit) return `Você selecionou ${selectedCount} pessoas, mas o limite é ${limit}.`;
  return null;
}
export const slotsLeft = (limit: number, count: number): number => Math.max(limit - count, 0);