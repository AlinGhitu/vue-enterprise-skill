# Components

Source tags: [docs] official docs · [MT] Michael Thiessen · [AF] Anthony Fu / VueUse · [VS] Vue School · [MO] Markus Oberlehner · [GL] GitLab · [CB] open-source codebases.

## Controller and humble components [MT, VS, MO]

- **Humble component:** props in, events out, renders. No fetching, no store access, no business rules. Trivial to test and reuse.
- **Controller component:** calls composables, queries and stores, owns state, composes humble children. Views (route components) are controllers and stay thin.
- Example: `UserProfileProvider` fetches and passes `user`, `loading`, `error` to a humble `UserProfileCard`.
- Resolve context decisions (feature flags, permissions, tenant settings) in the controller and pass the result down as a plain prop: `<InvoiceTable :can-export="canExport" />`. Leaf components stay free of flag and permission logic.
- One API style per component. When touching an Options API component to add Composition API code, convert the whole component (see [migration](migration.md)).

## Using the design system [MO, GL, CB]

- Use the design system's components first, through their documented props, slots and events. Check its catalogue (Storybook, docs site) before writing any new primitive.
- Never restyle a design-system component's internals: no `:deep()` selectors or overrides of its classes. If it can't do what's needed, compose it inside a feature component, or ask the design-system team for the change. Don't fork a copy into `shared/ui`.
- Style with the design system's tokens only (`--color-surface`, `text-muted`): no raw colors, spacing or font sizes. Enforce it with lint (Stylelint `declaration-strict-value`, or the utility framework's config).
- Wrap a design-system component only to add domain meaning (`InvoiceStatusBadge` around `Badge`), never just to rename its props.
- Accessibility behaviour (focus trap, keyboard navigation, ARIA) belongs to the design-system component. Report gaps to its owners instead of patching them per app.
- Upgrade the design system like any shared dependency: read its changelog, run the visual and a11y tests, and fix all consumers in the upgrade change.

## When to split [MT, docs]

Split when **any** of these holds:

- **Hidden components:** a root-level `v-if` switches between unrelated renderings, or props form groups that are never used together. Each group is its own component. To keep call sites unchanged, leave a thin wrapper that does the `v-if`.
- **Extract conditional:** a `v-if`/`v-else` branch is a sizeable block. Each branch becomes a named component (`ArticleCollapsed`, `ArticleExpanded`).
- **Lonely children:** a `v-for` or `v-if` wraps a large body. Extract the body into a child so the directive wraps one component. Keep the directive in the parent, not on the child's root: a child that loops on its own root can't render a single item, and a root `v-if` without `v-else` makes a component that sometimes renders nothing (`vue/no-root-v-if`).
- Template nesting passes ~4–5 levels, or the component has several independent sections.
- To find the seams: list props, state, computeds, watchers and methods, and map which interact. Clusters that don't interact are the split lines.
- **Undo over-splitting:** if parent and child only make sense together and pass everything back and forth, inline the child again.
- Length alone isn't a reason; being hard to understand is.

## Props [docs, MT, MO, CB]

- Type-based declaration: `defineProps<{ title: string; count?: number }>()`.
- Defaults, Vue ≥ 3.5: `const { count = 0, tags = ['new'] } = defineProps<Props>()` — array and object defaults are plain values here, **not** factories. Below 3.5: `withDefaults(defineProps<Props>(), { tags: () => ['new'] })`, where array and object defaults must be factories.
- A destructured prop passed to `watch()` or a composable loses reactivity **in every version, 3.5+ included**: the compiler rewrites `count` to `props.count` at the call site, so the function receives a value, not a source. Pass a getter: `watch(() => count, …)`, `useThing(() => count)`.
- Props are read-only. Never assign to a prop or mutate an object/array prop's contents; emit and let the owner change it.
- `ref(props.x)` copies once. Only do it for an explicit initial-value prop (`initialX`); otherwise read the prop or derive with `computed`. `vue/no-setup-props-reactivity-loss` flags the legitimate case too: disable it on that line with a reason.
- A prop's default can't depend on other props. Derive the fallback in a `computed`: `computed(() => props.label ?? defaultLabelFor(props.type))`.
- Three kinds of props: **configuration** (`variant`, `size`), **state** (data shown), **template** (text rendered as-is). If a template prop may ever need markup, make it a slot.
- **Preserve object:** pass `:user="user"` instead of five scalar props when the child is about that object.
- `Boolean` props with multiple types: `[Boolean, String]` makes a bare attribute `true`; `[String, Boolean]` makes it `""`.
- A missing `Boolean` prop is `false`, not `undefined`. When a prop should inherit from context (see below), declare its default as `undefined` explicitly.
- Declare as props every attribute callers rely on, including `disabled` and required a11y attributes (`alt` as a **required** prop). Anything left to fallthrough makes the root element part of the component's public API.

## Context-supplied defaults [MO, CB]

Components inside a group or form (a button in a button group, a field in a form) may take defaults such as `size` or `disabled` from an ancestor through `inject`. Resolve in a fixed order, and let the explicit prop always win:

```ts
// disabled defaults to undefined explicitly: a missing Boolean prop would otherwise be false and always win
const { disabled = undefined, size } = defineProps<{ disabled?: boolean; size?: 'sm' | 'md' }>()
const group = inject(ButtonGroupKey, undefined)   // optional context: no throw
const config = useUiConfig()                      // app-wide defaults (provided at bootstrap)
const isDisabled = computed(() => disabled ?? group?.disabled.value ?? false)
const resolvedSize = computed(() => size ?? group?.size.value ?? config.size ?? 'md')
```

Use this sparingly. Like nested CSS, it hides where values come from.

## Events and callbacks [docs, MO]

- Declare every event: `defineEmits<{ pick: [id: string]; close: [] }>()` (named tuples, 3.3+). Undeclared listeners fall through to the root as attrs.
- Emit one payload per event (an object when you need several values): an inline `$event` handler only receives the first argument (`vue/prefer-single-event-payload`).
- Don't declare native event names (`click`, `change`, `select`, `submit`, `toggle`) in `emits`: the parent's `@click` then fires **only** on `emit('click')`, never on native clicks (`vue/no-shadow-native-events`).
- Component events don't bubble. To reach a grandparent, re-emit at each level or move the state up.
- Events are the default output. When the parent **must** handle something, and forgetting would be a silent bug, use a **required** function prop instead: `onRemove: (item: LineItem) => void`. A missing or mistyped handler is then a compile error. Name events as facts (`remove`) and callback props as commands (`onRemove`, `removeFromCart`). Turn on `vueCompilerOptions.strictTemplates` so `vue-tsc` also rejects listeners for undeclared events.

## v-model [docs, MT]

- Vue ≥ 3.4: `const model = defineModel<string>()`; named: `defineModel<string>('title')` ↔ `v-model:title`; modifiers: `const [model, mods] = defineModel({ set(v) { … } })`.
- `defineModel({ default: x })` desyncs when the parent passes `undefined`. Prefer `required: true`, or no default. In TS projects turn off `vue/require-default-prop`, which demands defaults here.
- **Never mutate a model's inner value** (`model.value.name = 'x'`). It changes the parent's object directly and emits nothing, and `vue/no-mutating-props` doesn't catch it. Assign a new object: `model.value = { ...model.value, name: 'x' }`.
- Below 3.4: `modelValue` prop + `update:modelValue` emit, bridged with a writable `computed({ get, set })`.
- `defineModel` covers controlled/uncontrolled components: with no `v-model`, it keeps local state.
- Use `.number` on numeric inputs and `.lazy` to update on `change`.

## Slots and the reusability ladder [MT, docs]

Climb only as high as the use case needs:

1. **Templating:** wrap repeated markup in a component.
2. **Configuration:** props select variants.
3. **Adaptability:** a default slot accepts markup you didn't foresee.
4. **Inversion:** a scoped slot (`<slot :item="item" />`) hands data back and the parent decides the rendering.
5. **Extension:** named slots, each with fallback content, as override points.
6. **Nesting:** forward slots through wrapper layers so the override points survive.

- Contentless containers (buttons, cards, menus, dialogs) are slot-driven. Enum props force you to predict every variant; slots don't.
- Check slot presence in the template (`v-if="$slots.footer"`), never by calling `slots.footer()` in script, which renders the slot (with side effects under Vapor).
- When a **scoped** default slot is used alongside named slots, put the default content in an explicit `<template #default="…">`. With a non-scoped default slot, loose top-level content is fine.
- Declare every slot with `defineSlots<{ default(p: { item: Item }): unknown }>()` (3.3+; `vue/require-explicit-slots`). Slot functions return `unknown`: the docs write `any`, which `no-explicit-any` rejects.
- Scoped-slot values exist only in the template. When the logic is needed in `<script>`, use a composable instead of a renderless component.
- Reuse has a cost: the more a component is reused, the more damage its bugs do. Keep a one-off component rigid until a second use appears.

## Fallthrough attrs [docs, MO, GL]

- Undeclared attrs and listeners land on the single root; `class` and `style` merge; listeners both fire.
- Forward `$attrs` only in thin wrappers around a native element (inputs, buttons, links), where the native attribute set *is* the intended API: `defineOptions({ inheritAttrs: false })` (3.3+; below that, a plain `<script>` block with `export default { inheritAttrs: false }`) and `v-bind="$attrs"` on the element. Everywhere else, declare props. ⚖ Oberlehner and GitLab both avoid `$attrs` forwarding; consumers do legitimately need native attributes on native-element wrappers.
- Multi-root components get no automatic fallthrough; bind `$attrs` explicitly or Vue warns.
- `useAttrs()` is **not** reactive. Don't watch it; use `onUpdated` for side effects based on it.

## Public API [docs, CB]

- `<script setup>` components are closed. Expose a deliberate API with `defineExpose({ focus, reset })`; call it before any `await`.
- Parent calls through a template ref are an escape hatch (focus, scroll, imperative widgets), not a data channel.
- Never use `$parent`, and never reach into a child's state.
- Shared components export their public types from a plain `<script lang="ts">` block (or a sibling `.ts`): `export interface InvoiceTableProps`, `InvoiceTableEmits`. Wrappers can then `extends`/`Pick` them instead of re-declaring.

## Dialogs [CB, docs]

- Render dialogs through `<Teleport>` (see [accessibility](accessibility.md) for focus handling). With `<Teleport defer>` (3.5), the target may be rendered by Vue later in the same render.
- For confirmations and prompts, use a programmatic, awaitable dialog: `if (await confirm({ title, message })) remove(item)`. It keeps the flow linear instead of splitting it across open and close events. The dialog composable returns a promise that resolves with the user's choice.
- Detail modals that should be linkable and close on Back (an invoice opened from a list) are routes: the modal renders over the list route and closing it navigates back.
- Keep one modal stack controller (a store or composable holding the open dialogs) rather than scattered `isOpen` flags when dialogs can stack.

## Styling [docs, MT, CB]

- Scoped styling in every component (`<style scoped>`, CSS modules, or utility classes). *Essential* in the style guide.
- Don't style a child's internals from the parent. Give the child a configuration prop (`variant`) or CSS custom properties. `:deep()` is the last resort; `/deep/` and `>>>` are deprecated.
- Distinguish **layout slots** (no padding, the consumer controls layout) from **content slots** (styled defaults).
- Class selectors in scoped styles, not element selectors.
- `v-bind()` in CSS for reactive values: `color: v-bind(accent)`; quote expressions: `color: v-bind('theme.accent')`.
- Semantic tokens (`--color-surface`), never raw palette values. CSS logical properties (`margin-inline-start`, `ms-2`) instead of left/right, so RTL works (see [i18n](i18n.md)).
- Only bind user-controlled values to specific style properties (`:style="{ color }"`), never whole style strings.

## Keys and re-rendering [docs, MT]

- Key `v-for` with a stable unique id. Never the index when the list can insert, remove or reorder, or when items hold state.
- Never put `v-if` and `v-for` on the same element. Filter in a `computed`, or put the `v-for` on a `<template>`.
- To reset a component's state, change its `:key`. Only after ruling out a reactivity bug.
- `v-show` for cheap, frequent toggles; `v-if` for content not needed at first render or rarely toggled.

## Script setup structure [docs, AF]

- `<script setup lang="ts">` always (`vue/block-lang`, `vue/component-api-style`). A second plain `<script>` block only for named exports (keys, public types) or one-time module side effects.
- Macro order at the top: `defineOptions`, `defineModel`, `defineProps`, `defineEmits`, `defineSlots`; `defineExpose` last (`vue/define-macros-order`). Never import macros from `'vue'` (`vue/no-import-compiler-macros`).
- Macro options are hoisted to module scope: they can use imports but not local variables.
- **Inline composables** for logic too big for one component but reused nowhere: `function useFilters() { … }` in the same SFC. Promote it to a file when reused.
- Keep template expressions trivial; move logic into `computed`s.
