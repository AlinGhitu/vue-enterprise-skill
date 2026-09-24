# Performance

Source tags: [docs] official docs · [MT] Michael Thiessen · [AF] Anthony Fu / VueUse · [VS] Vue School · [MO] Markus Oberlehner · [GL] GitLab · [CB] open-source codebases.

Get it working first, then measure, then optimize what measurement shows. Don't pre-optimize.

## Measure [docs, VS]

- Field data (Core Web Vitals at p75: LCP, INP, CLS) from real users beats a local Lighthouse run.
- For update performance: the Vue DevTools performance timeline, `app.config.performance = true` (dev), and the Chrome performance panel.
- Bundle size: `vite-bundle-visualizer` or `rollup-plugin-visualizer`; `npx nuxi analyze` in Nuxt. These only visualize.
- **Enforce a budget in CI** with `size-limit` (`@size-limit/file` for built assets): a `.size-limit.json` entry per entry chunk (`[{ "path": "dist/assets/index-*.js", "limit": "180 kB" }]`), set a little above today's size. A change that crosses it fails the build and must either shrink or raise the limit with a reason in the PR.

## Load performance [docs, VS]

- Lazy-load routes (see [routing](routing.md)) and components absent from the first render (modals, drawers, heavy editors) with `defineAsyncComponent`, rendered behind `v-if`. `v-show` would load them anyway.
- Give async components `loadingComponent`, `errorComponent` and a `timeout`.
- Import named members from ESM libraries (`lodash-es`, not `lodash`); check a dependency's size before adding it.
- Reserve space for late content (images, embeds, async panels) to avoid layout shift.
- SSR or SSG when first-load speed or SEO matters. With SSR, Vue 3.5 lazy hydration (`hydrateOnVisible`, `hydrateOnIdle`, `hydrateOnInteraction`, `hydrateOnMediaQuery`, or a custom strategy) defers the cost of below-the-fold components. It does nothing in a client-only SPA; in Nuxt use its lazy-hydration wrappers.
- Add nothing to the global entry (`main.ts`, globally registered plugins and components) unless every page needs it.
- Start critical first-view requests early (in parallel with the JS, not after mount), and prefetch the chunks and queries the user is likely to need next.
- Self-host fonts; if you need a web font, use WOFF2 and as few weights as possible.

## Update performance [docs]

- **Stable props:** pass derived values to list items (`:active="item.id === activeId"`) instead of shared state (`:active-id="activeId"`), so only the items that changed re-render.
- Large or immutable data: `shallowRef` and replace it wholesale instead of deep-proxying it.
- Vue ≥ 3.4: return `oldValue` from object-returning computeds when nothing changed, so dependents don't re-run.
- Lists of 100+ items: avoid wrapper or renderless components inside each item. Component instances cost far more than plain elements.
- Very long lists: virtualize (`vue-virtual-scroller`, VueUse `useVirtualList`).
- `v-once` for content that never changes after the first render. `v-memo="[deps]"` for large list items that re-render needlessly — use it only after profiling, since stale deps render stale UI.
- `v-show` for frequent toggles of expensive subtrees; `v-if` for rarely shown ones.
- Avoid deep watchers on large structures; watch the specific getter.
- `<KeepAlive :max="n">` for expensive views users switch between often. It trades memory for speed, so set `max`.
- Debounce input-driven work (search, resize) with `watchDebounced` or `useDebounceFn`.
- Animate only `opacity` and `transform` in transitions. Animating `top`, `height`, `margin` or `padding` forces layout on every frame; for layout changes use FLIP (`<TransitionGroup>` move classes do this).
- `v-memo` isn't supported in Vapor components (3.6).
- Instrument app-specific timings with `performance.mark`/`measure` under one naming convention (`invoices-list-start`, `invoices-list-end`), so they show up in field monitoring.
