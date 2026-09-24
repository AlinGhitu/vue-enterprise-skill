// GENERATED from references/errors.md by scripts/extract-snippets.mjs: edit the skill, not this file
// shared/lib/errors.ts
export function toError(value: unknown): Error {
  if (value instanceof Error) return value
  return new Error(typeof value === 'string' ? value : 'Non-Error value thrown', { cause: value })
}
