# Accessibility

Source tags: [docs] vuejs.org accessibility guide · [W3C] WCAG 2.2 · [APG] WAI-ARIA Authoring Practices · [GOV.UK] GOV.UK Design System · [VS] Vue School · [GL] GitLab · [MO] Markus Oberlehner · [CB] open-source codebases.

- Target WCAG 2.2 AA. It includes all of 2.1 AA, which is the level most accessibility laws currently cite. [GL, W3C]
- The WCAG 2.2 additions that component code most often misses: [W3C]
  - **Focus not obscured (2.4.11):** sticky headers, cookie banners and toasts must not hide the focused element. Add `scroll-padding-top` equal to the sticky header's height.
  - **Dragging movements (2.5.7):** everything done by dragging (reordering, sliders, drop zones, `useDraggable`, `useDropZone`) also works with single clicks or the keyboard: move up/down buttons, a file picker next to the drop zone.
  - **Target size (2.5.8):** pointer targets are at least 24×24 CSS px, or spaced so a 24 px circle around each doesn't overlap another.
  - **Accessible authentication (3.3.8):** no cognitive tests to log in. Allow paste and password managers, and offer passkeys or email links as alternatives to transcribing codes (see [security](security.md), login forms).
  - **Redundant entry (3.3.7):** don't ask for the same information twice in one flow; prefill it or offer "same as billing address".
  - **Consistent help (3.2.6):** help links and contact options appear in the same place on every page.
- Semantic HTML first: `<button>` for actions, `<a href>` for navigation, landmarks (`header`, `nav`, `main`, `footer`, `aside`), exactly one `<h1>` per page, and headings in order with no skipped levels. A `<div @click>` isn't keyboard-accessible.
- No ARIA is better than bad ARIA: no `role` on a `div` when a native element exists, no positive `tabindex`, no `tabindex` on already-interactive elements. [GL]
- Accessible names make sense out of context ("Delete invoice 1042", not "Delete"). Decorative images get `alt=""`; informative images a real `alt` (a required prop on image components). [GL, MO]
- Every `:hover` style has a matching `:focus-visible` style. If you remove the outline, replace it with another visible indicator. [GL]
- `<fieldset>` starts with `<legend>`, `<table>` with `<caption>`, `<figure>` with `<figcaption>`. [GL]
- Every input has a visible `<label for>` matching its `id` (`useId()` in reusable components). `aria-describedby` for hints and errors. Placeholders aren't labels.
- **Form errors on submit:** show an error summary at the top of the form, move focus to it, and link each entry to its field (`<a href="#email">`). Short forms may move focus to the first invalid field instead. Mark invalid fields with `aria-invalid="true"`. Never rely on color alone. [GOV.UK]
- **Data tables:** a `<caption>`, `<th scope="col">` headers, and sort controls as `<button>`s inside the header. `aria-sort="ascending"`/`"descending"` goes on the currently sorted column only; remove it from the previous one. Announce result counts after filtering through the live region. [APG]
- Icon-only buttons: `aria-hidden="true"` on the icon plus visually hidden text or an `aria-label`. Never put `aria-hidden` on a focusable element.
- Put a skip link first in `App.vue`, and move focus to it or to the main heading on route change.
- **Dialogs:** trap focus inside while open, close on Escape, return focus to the triggering element on close, and set `role="dialog"`, `aria-modal="true"` and a label. Render them through `<Teleport>` (with `defer` in 3.5 when Vue renders the target later in the same render) to escape stacking contexts. In SPAs `to="body"` is fine; in SSR apps teleport to a dedicated container (`#modals`), because the SSR guide says to avoid `body`. Prefer an accessible headless library (Reka UI, Headless UI) over hand-rolling focus management.
- Announce async results (saved, errors, search counts) with an `aria-live="polite"` region.
- Contrast at least 4.5:1 for body text and 3:1 for large text. Respect `prefers-reduced-motion` in transitions.
- Automate: axe-core on every component state in component tests and in browser flows after each structural change (see [testing](testing.md)). `eslint-plugin-vuejs-accessibility` or small custom lint rules (for example "icon-only buttons need an accessible name") catch issues while editing. Still test critical flows with a screen reader (NVDA or VoiceOver) and keyboard only.
- **Keyboard shortcuts:** register them in one central registry, not in scattered key handlers. Let users see, change and disable them; ship rarely used ones disabled; use a `mod` abstraction (Cmd on macOS, Ctrl elsewhere). Never fire single-character shortcuts while the user is typing in an input. [GL]
