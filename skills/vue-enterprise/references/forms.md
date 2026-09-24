# Forms

Source tags: [docs] official docs · [MT] Michael Thiessen · [AF] Anthony Fu / VueUse · [VS] Vue School · [MO] Markus Oberlehner · [GL] GitLab · [CB] open-source codebases.

## The form component pattern [VS]

- Each non-trivial form is its own component (`InvoiceForm.vue`) with `defineModel<Invoice>()` for the committed value.
- Edit a **local copy**, never the model directly. Keystrokes then don't leak into the source until the user submits, and cancel is free.

```ts
const model = defineModel<Invoice>({ required: true })
// eslint-disable-next-line vue/no-ref-object-reactivity-loss -- one-time snapshot; the watch below resyncs it
const form = ref(structuredClone(toRaw(model.value)))
watch(model, (v) => { form.value = structuredClone(toRaw(v)) }, { deep: true })   // parent changes, incl. in-place, reset the draft
function submit() { model.value = structuredClone(toRaw(form.value)) }
```

- `structuredClone` throws on a reactive Proxy. Call `toRaw` first, and make sure the data is plain (no functions or class instances).
- Split out a `useInvoiceForm()` composable once the form logic (validation, dirty tracking, submission) outgrows the component.
- Show a submitting state: disable the submit button and prevent double submits. Pass that state to parent-provided buttons through a scoped slot if the form uses slots for its actions.

## Validation [VS, docs]

- Start with native constraints (`required`, `type="email"`, `min`, `maxlength`, `pattern`): free, accessible, and they work without JS.
- For anything beyond that, validate against a Standard Schema library (Zod 4, Valibot 1, ArkType 2). Share the schema with the API layer (and the server, in a full-stack repo) so client and server enforce the same rules, and infer the form's TS type from it (input vs output types → [typescript](typescript.md)).
- A form library (VeeValidate, FormKit, Formwerk) is worth it for large or dynamic forms. Use the one the project already has; don't mix several. VeeValidate 4.15 (last stable release June 2025) needs `toTypedSchema` from `@vee-validate/zod`/`-valibot`; the v5 beta drops those adapters and takes any Standard Schema directly, so keep the adapter call in one place. Formwerk is pre-1.0.
- Show errors after a field is touched or after a submit attempt, not on the first keystroke. Tie each message to its input with `aria-describedby` and set `aria-invalid`. On a failed submit, move focus to the error summary or the first invalid field ([accessibility](accessibility.md)).
- The server stays the source of truth. Map validation errors from the API response back onto the fields they belong to, so the user sees "email already taken" next to the email input, not in a toast. [CB]
- Client validation is UX, never security: every rule the server must hold is enforced on the server. [MO]

## Inputs [docs, VS]

- Use `v-model.number` for numeric inputs (inputs yield strings), `.trim` for free text, and `.lazy` to update on `change`.
- Every input has a `<label for>` pointing at its `id`. Generate the id with `useId()` (3.5) in reusable field components.
- Placeholders are not labels.
- Buttons get an explicit `type` (`submit` or `button`); a bare `<button>` inside a form submits it.
- Add `autocomplete` attributes to identity, address and payment fields.

## Payloads and values [MO, GL, CB]

- Derive create and update payload types from the entity instead of loosening it: `type InvoiceNew = Omit<Invoice, 'id'>`, `type InvoicePatch = Partial<Omit<Invoice, 'id'>>`. Never make `id` optional on `Invoice`.
- Send date-only values as `YYYY-MM-DD` strings, never serialized `Date` objects, which shift a day across time zones (see [i18n](i18n.md)).
- Long free-text input (comments, descriptions, editors) persists its draft to storage (`useLocalStorage`) so it survives reloads and crashes. Clear the draft on successful submit.
