// GENERATED from references/routing.md by scripts/extract-snippets.mjs: edit the skill, not this file
// features/invoices/route-params.ts: adapt the pattern to your id format
export function parseInvoiceId(param: string | string[] | undefined): string | null {
  return typeof param === 'string' && /^[0-9a-f-]{36}$/i.test(param) ? param : null
}
