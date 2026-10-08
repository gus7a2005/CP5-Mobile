import { ApiError } from '../services/apiClient';

// Só mostramos ao usuário mensagens que a nossa API escreveu (em português).
// Qualquer outro erro vira a mensagem genérica, sem expor detalhes internos.
export function getErrorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}