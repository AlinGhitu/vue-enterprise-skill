#!/bin/bash
# Usage: run.sh <arm-dir>. Round 1 and round 2 in fresh sessions, a commit after each.
# The agent may edit files in the app folder and run only pnpm/npx/node and read-only git.
d=/tmp/bench/$1; mkdir -p /tmp/bench/logs
TOOLS='Read Edit Write Glob Grep TodoWrite Skill Bash(pnpm:*) Bash(npx:*) Bash(node:*) Bash(git status:*) Bash(git diff:*) Bash(ls:*) Bash(cat:*) Bash(curl:*) Bash(sleep:*) Bash(kill:*)'
for r in 1 2; do
  /tmp/bench/cleanenv.sh $d claude -p "$(cat /tmp/bench/prompt$r.md)" --model sonnet --permission-mode acceptEdits \
    --allowedTools $TOOLS --output-format stream-json --verbose > /tmp/bench/logs/$1-r$r.jsonl 2> /tmp/bench/logs/$1-r$r.err
  cd $d && git add -A && git -c user.name=bench -c user.email=b@x.invalid commit -qm "round $r" ; cd /tmp/bench
done
echo done > /tmp/bench/logs/$1.done
