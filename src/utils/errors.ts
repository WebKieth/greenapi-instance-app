/** Достает человекочитаемый текст из unknown-ошибки. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
