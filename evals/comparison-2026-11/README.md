# Vue skill comparison (2026-11-07)

The raw material behind the blog post "One Vue app, built by AI three times". Use it to check the numbers or to rerun the test with another skill.

One Support Desk app built by Claude Code (headless, same model and settings) with three setups, 2 runs each, then a change request in a fresh session.

| Arm | Folder | Skill installed |
|---|---|---|
| No skill | none-1, none-2 | none |
| vuejs-ai/skills @ 198f0cd | vueai-1, vueai-2 | all 8 skills in .claude/skills |
| vue-enterprise 1.1.0 | ent-1, ent-2 | skill + always-on rules (CLAUDE.md import) |

## Results

| | none-1 | none-2 | vueai-1 | vueai-2 | ent-1 | ent-2 |
|---|---|---|---|---|---|---|
| type-check / lint / unit tests | pass | pass | pass | pass | pass | pass |
| Unit tests (after round 2) | 24 | 21 | 15 | 18 | 34 | 41 |
| Browser feature checks | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 |
| Harder checks | 7/8 (no 401 redirect) | 8/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| Edit -> New stale form bug | yes | yes | n/a | no | n/a | n/a |
| Reload keeps session | yes | yes | yes | yes | no (token in memory) | no |
| Blind review 1 / 2 (of 60) | 36 / 40 | 28 / 30 | 39 / 38 | 44 / 45 | 54 / 56 | 57 / 57 |
| Round 1 minutes / cost | 3.1 / $0.55 | 3.0 / $0.57 | 2.7 / $0.54 | 3.3 / $0.60 | 4.9 / $0.91 | 4.8 / $0.87 |
| Round 2 minutes / cost | 1.9 / $0.31 | 1.6 / $0.25 | 1.2 / $0.27 | 0.8 / $0.19 | 1.4 / $0.28 | 1.7 / $0.31 |
| Non-blank lines in src | 877 | 817 | 1143 | 1090 | 1268 | 1401 |

Arm averages of the blind review: no skill 33.5, vuejs-ai 41.5, vue-enterprise 56.

## Files

- prompt1.md, prompt2.md, API.md: what every run got
- harness/: fake API, clean-environment runner, Playwright checks (smoke, stress, verify), static metrics
- apps/: each app as a git repo (baseline, skill install, round 1, round 2 commits), without node_modules
- transcripts/: full agent transcripts (stream-json)
- reviews/: both blind reviews and the letter-to-app mappings
- results/: raw JSON of every browser check and run stats
- review-prompt.md: the rubric the blind reviewer got

## Rerunning it

The scripts were written for a throwaway Linux container and use absolute paths under `/tmp/bench` (`run.sh`, `smoke-all.sh`, `cleanenv.sh`). To rerun: scaffold with `npm create vue@latest -- --ts --router --pinia --vitest --playwright --eslint --prettier`, add `harness/fake-api-server.mjs` as `server/index.mjs` with a `pnpm api` script and a Vite proxy for `/api`, copy one skill into `.claude/skills/`, then run `harness/run.sh` per app and `harness/smoke-all.sh` with `TEST=smoke`, `stress` or `verify`. `cleanenv.sh` starts Claude Code with no user settings, plugins or skills, so the only difference between runs is the project folder.

To open an app: `tar -xzf apps/ent-2.tar.gz && cd ent-2 && git log --oneline && pnpm install`.
