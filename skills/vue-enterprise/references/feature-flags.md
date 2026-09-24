# Feature flags

Source tags: [GL] GitLab feature-flag guide · [MO] Markus Oberlehner · [VS] Vue School.

## Lifecycle [GL]

- New flags default to **off**, live as briefly as possible, and are removed after the rollout finishes. Put the removal in the rollout plan.
- A permanent per-user or per-tenant toggle is a **setting**, not a flag. Model it as one.
- Name flags for what they enable (`invoiceBulkExport`), not their stage: no `_beta`/`_v2` suffixes, and no `disable…` names (double negatives).

## Safety [GL]

- A flag that hides UI must be matched by a server-side check on the same feature. Hiding a button doesn't protect an API.
- Never use flags for authorization. Permissions are a separate system.

## Delivery in the app [MO, GL, VS]

- Resolve flags once, at app init, behind the flag vendor's adapter (see [architecture](architecture.md)). Provide the resolved flags through a typed injection key or a small store.
- Identify flags with exported constants or a string-literal union type, never free-form strings at call sites. Typos become compile errors and removal is a find-references away.
- Decide in the controller component and pass the result to humble components as a plain prop (`:can-export="flags.invoiceBulkExport"`). Leaf components never read flags.
- Don't fork whole components or queries per flag. Parameterize the one place that differs, and keep the old path deletable in one change.
- Match the machinery to the count: a few short-lived flags can be a typed config object; dozens need the provider approach.

## Testing [GL, MO]

- Test flagged code with the flag both on and off. Supply flags in tests through the same `provide` the app uses.
- Browser tests set flags explicitly; don't rely on an environment's defaults.
