#!/bin/bash
# Starts each app's API and dev server, runs the smoke test, stops them.
i=0
for a in none-1 vueai-1 ent-1 none-2 vueai-2 ent-2; do i=$((i+1)); d=/tmp/bench/$a
  (cd $d && git checkout -q main && setsid node server/index.mjs > /tmp/bench/logs/$a-api.log 2>&1 &)
  (cd $d && setsid npx vite --port $((5180+i)) --strictPort > /tmp/bench/logs/$a-vite.log 2>&1 &)
  sleep 6
  node /tmp/bench/tools/${TEST:-smoke}.mjs http://localhost:$((5180+i)) $a /tmp/bench/shots > /tmp/bench/logs/$a-${TEST:-smoke}.json 2>/tmp/bench/logs/$a-${TEST:-smoke}.err
  pkill -f "server/index.mjs"; pkill -f "vite --port"; sleep 2
done
