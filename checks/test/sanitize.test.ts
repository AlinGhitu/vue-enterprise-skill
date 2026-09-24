import { describe, expect, it } from 'vitest'
import { renderMarkdown, sanitizeHtml, sanitizeHtmlTrusted } from '@/shared/lib/sanitize'

const attack = [
  '<a href="javascript:alert(1)">x</a>',
  '<img src="ftp://evil.example/pixel.png">',
  '<a href="tel:+100">call</a>',
  '<script>alert(1)</script>',
].join('')

// Both entry points must apply the same policy (the Trusted Types one once skipped the URI allow-list).
describe.each([
  ['sanitizeHtml', (dirty: string): string => sanitizeHtml(dirty)],
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- jsdom has no Trusted Types, so DOMPurify returns a plain string
  ['sanitizeHtmlTrusted', (dirty: string): string => String(sanitizeHtmlTrusted(dirty))],
])('%s', (_name, sanitize) => {
  it('drops scripts, javascript: URLs and schemes outside the allow-list', () => {
    const out = sanitize(attack)
    expect(out).not.toContain('<script')
    expect(out).not.toContain('javascript:')
    expect(out).not.toContain('ftp:')
    expect(out).not.toContain('tel:')
  })

  it('forces rel and target on allowed links', () => {
    expect(sanitize('<a href="https://example.com">x</a>')).toBe(
      '<a href="https://example.com" rel="noopener noreferrer" target="_blank">x</a>',
    )
  })
})

describe('renderMarkdown', () => {
  it('sanitizes what marked produces', () => {
    expect(renderMarkdown('[x](javascript:alert(1)) **bold**')).not.toContain('javascript:')
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>')
  })
})
