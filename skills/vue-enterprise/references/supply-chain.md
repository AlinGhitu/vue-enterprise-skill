# Supply chain

Source tags: [docs] pnpm, npm, GitHub Actions and MDN docs · [OSSF] OpenSSF npm best practices · [CB] open-source codebases (Element Plus, n8n, Nuxt UI, Elk, Vikunja). Maps to OWASP Top 10:2025 A03 Software Supply Chain Failures and A08 Software or Data Integrity Failures.

Dependencies and CI run code with the developer's or the pipeline's credentials. Every control here limits what a compromised package or workflow can do.

## Installing [docs, OSSF, CB]

- **Block dependency lifecycle scripts.** pnpm ≥ 10 does this by default and fails the install on unreviewed scripts (`strictDepBuilds`, default `true`). Approve the few packages that really need a build step with `pnpm approve-builds`, which writes them to `allowBuilds` (pnpm ≥ 10.26; older pnpm 10 releases used `onlyBuiltDependencies`). Never set `dangerouslyAllowAllBuilds: true`. On npm or yarn, use `@lavamoat/allow-scripts`, or install with `--ignore-scripts` and run the vetted builds explicitly.
- **Wait before adopting a new version.** `minimumReleaseAge` (pnpm ≥ 10.16, minutes; default 1440 since v11) refuses versions published less than a day ago, so a compromised release usually gets pulled before it reaches you. Exempt your own scope with `minimumReleaseAgeExclude`. Renovate has `minimumReleaseAge`; Dependabot has `cooldown` (3 days by default).
- Install from the lockfile only: `pnpm install --frozen-lockfile` or `npm ci`. Commit the lockfile.
- Bind private scopes to your registry in `.npmrc` (`@myorg:registry=https://…`) so `@myorg/x` can never resolve from the public registry (dependency confusion).
- `trustPolicy: no-downgrade` (pnpm ≥ 10.21) fails an install when a package's trust signals regress between releases.

```yaml
# pnpm-workspace.yaml (pnpm ≥ 10.26) — https://pnpm.io/settings/build, /settings/dependency-resolution
strictDepBuilds: true            # default; fail on unreviewed build scripts
allowBuilds:                     # populated by `pnpm approve-builds`
  esbuild: true
minimumReleaseAge: 1440          # minutes; default since v11
minimumReleaseAgeExclude:
  - "@myorg/*"
trustPolicy: no-downgrade
```

## Adding a dependency [docs, OSSF]

- Check the package before merging: `pnpm audit` / `npm audit`, and a scanner that catches typosquats and install-time scripts (Socket.dev has a free GitHub app; Snyk has a free tier). Look at the repo's OpenSSF Scorecard for branch protection, pinned CI and signed releases.
- A new build-script request from a dependency is reviewed once, explicitly, in the `approve-builds` prompt. Read the script.
- Prefer packages with provenance attestations (`npm audit signatures` verifies them).

## Updating [docs, CB]

- A dependency bot (Renovate is the common choice in Vue repos; Dependabot works too) with a cooldown, grouped by type, and CI running on every bump.
- `pnpm audit --audit-level=high --prod` (or `npm audit --audit-level=high`) in CI. Without a level, pnpm fails on `low` and npm fails on any finding, which teams then learn to ignore.
- Force a patched transitive version with `overrides` (a one-line, reviewable change) before reaching for `pnpm patch`. Remove the override once upstream updates.
- Review the whole tree at least yearly even with no findings; run `pnpm licenses list --prod` against a licence allow-list.

## CI [docs, CB]

- Pin every third-party GitHub Action to a full commit SHA with a version comment (`uses: actions/checkout@<40-char sha> # v6`). A tag can be moved; a SHA can't. Let the dependency bot bump the SHAs.
- Workflow-level `permissions: { contents: read }`; grant more per job only where needed.
- Never run a fork's code under `pull_request_target` with secrets or write access in scope.
- Lint the lockfile (`lockfile-lint --allowed-hosts npm --validate-https`) so nothing resolves off-registry or over HTTP.
- Attest build provenance for deployed artifacts (`actions/attest-build-provenance`) and verify it where the artifact is consumed.
- Scan for secrets in the repo history and in the built `dist/` (gitleaks or trufflehog), and turn on GitHub push protection. A `VITE_` variable holding a real secret shows up in `dist/`.
- Fail the build if `dist/` contains `.map` files unless the deploy step strips them (see [security](security.md)).

## Publishing internal packages [docs]

- Publish from CI with npm trusted publishing (OIDC), not a long-lived `NPM_TOKEN`. If a token is unavoidable, use a granular access token scoped to the package; classic tokens no longer exist. Require 2FA on every maintainer account.
- Publish with provenance so consumers can verify which workflow built the package.
- ESM-only, no `0.x` for stable packages (see [tooling](tooling.md)).

## Runtime [docs]

- Self-host scripts, styles and fonts. When a CDN is unavoidable, pin the exact asset and add `integrity="sha384-…" crossorigin="anonymous"`; regenerate the hash whenever the pinned version changes. An unpinned CDN URL defeats SRI.
- Third-party widgets (chat, ads, embeds) run in a sandboxed cross-origin `<iframe>` with `postMessage`, not as scripts in the app's origin (see [security](security.md)).
