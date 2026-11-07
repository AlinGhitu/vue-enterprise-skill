# Security policy

## Supported versions

Only the latest release of `vue-enterprise` gets fixes. The version is at the bottom of `skills/vue-enterprise/SKILL.md`; releases are listed in [CHANGELOG.md](CHANGELOG.md).

## What to report

This repository ships guidance that coding agents follow, so a security problem here usually means advice that leads to vulnerable code. Please report privately:

- A rule, checklist item or code example that would make an agent write insecure code, for example unsafe HTML rendering, token storage, CSRF or redirect handling. Apps that already follow the skill may ship that code, so treat it like a vulnerability, not a typo.
- Instructions in the skill that an attacker could abuse through an agent, such as a step that runs or fetches something unsafe.
- A problem in this repository's CI workflow or release process.

Not in scope here:

- Vulnerabilities in Vue, Nuxt, Pinia or other libraries. Report those to the library itself.
- Advisories for the development dependencies in `checks/`. They never ship to users of the skill; Dependabot keeps them updated.

## How to report

Use GitHub's private vulnerability reporting: [open a draft advisory](https://github.com/AlinGhitu/vue-enterprise-skill/security/advisories/new). If that doesn't work for you, email <contact@ghitu.com>.

Please include the file and heading (or the workflow), what an agent would write because of it, and how that code could be exploited. Don't open a public issue or pull request until a fix is out.

## What happens next

This project has one maintainer, so these are targets, not guarantees:

- An acknowledgement within 7 days.
- An assessment and a plan within 14 days.
- A fixed release, with a `CHANGELOG.md` entry and a GitHub security advisory that credits you unless you'd rather stay anonymous.
