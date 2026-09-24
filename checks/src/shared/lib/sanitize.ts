// GENERATED from references/security.md by scripts/extract-snippets.mjs: edit the skill, not this file
// shared/lib/sanitize.ts — the only file that imports DOMPurify or marked
import type { TrustedHTML } from 'trusted-types/lib'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    if (!/^(https?:|mailto:)/i.test(node.getAttribute('href') ?? '')) node.removeAttribute('href')
    node.setAttribute('rel', 'noopener noreferrer')   // force it; ADD_ATTR alone can leave a bare target=_blank
    node.setAttribute('target', '_blank')
  }
})
const CONFIG = { USE_PROFILES: { html: true }, ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i }   // one policy for every entry point

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, CONFIG)
}
export function sanitizeHtmlTrusted(dirty: string): TrustedHTML {   // under require-trusted-types-for 'script'
  return DOMPurify.sanitize(dirty, { ...CONFIG, RETURN_TRUSTED_TYPE: true })
}
export function renderMarkdown(raw: string): string {
  return sanitizeHtml(marked.parse(raw, { async: false }))          // marked does not sanitize
}
