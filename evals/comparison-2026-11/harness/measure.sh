#!/bin/bash
# Static metrics for one app folder. Usage: measure.sh <dir>. Prints JSON-ish lines.
d=$1; cd $d
tc=$(pnpm -s type-check >/tmp/bench/tools/tc.$$ 2>&1 && echo pass || echo "fail($(grep -c 'error TS' /tmp/bench/tools/tc.$$))")
es=$(npx eslint . --format json 2>/dev/null | node -e 'let s=require("fs").readFileSync(0,"utf8");try{const r=JSON.parse(s);console.log(r.reduce((a,f)=>a+f.errorCount,0)+"e/"+r.reduce((a,f)=>a+f.warningCount,0)+"w")}catch{console.log("n/a")}')
ox=$(npx oxlint . 2>&1 | grep -oE 'Found [0-9]+ warnings? and [0-9]+ errors?' | tail -1)
ut=$(npx vitest run --reporter=json 2>/dev/null | node -e 'let s=require("fs").readFileSync(0,"utf8");const i=s.indexOf("{");try{const r=JSON.parse(s.slice(i));console.log(r.numPassedTests+"/"+r.numTotalTests+" in "+r.numTotalTestSuites+" suites")}catch{console.log("n/a")}')
src=$(find src -name '*.vue' -o -name '*.ts' | grep -v -E '__tests__|\.spec\.|\.test\.')
tests=$(find src -name '*.spec.ts' -o -name '*.test.ts' | wc -l)
loc=$(cat $src | grep -cv '^\s*$')
files=$(echo "$src" | wc -l)
any=$(grep -hoE '(:\s*any\b|as any\b|<any>|any\[\])' $src | wc -l)
casts=$(grep -hoE '\bas [A-Z][A-Za-z<>\[\]]*' $src | grep -v 'as const' | wc -l)
vhtml=$(grep -l 'v-html' $src | wc -l)
ls_token=$(grep -lE 'localStorage|sessionStorage' $src | wc -l)
deps=$(git diff $(git rev-list --max-parents=0 HEAD | tail -1)..HEAD -- package.json | grep -E '^\+\s+"' | grep -v '"version"' | sed 's/[+ ",]//g' | tr '\n' ' ')
echo "{\"dir\":\"$d\",\"typecheck\":\"$tc\",\"eslint\":\"$es\",\"oxlint\":\"$ox\",\"tests\":\"$ut\",\"testFiles\":$tests,\"srcFiles\":$files,\"loc\":$loc,\"any\":$any,\"casts\":$casts,\"vhtmlFiles\":$vhtml,\"webStorageFiles\":$ls_token,\"depsAdded\":\"$deps\"}"
rm -f /tmp/bench/tools/tc.$$
