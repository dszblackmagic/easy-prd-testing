#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'Plugin validation failed: %s\n' "$1" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "missing file: $path"
}

require_dir() {
  local path="$1"
  [[ -d "$path" ]] || fail "missing directory: $path"
}

json_value() {
  local file="$1"
  local key="$2"

  if command -v node >/dev/null 2>&1; then
    node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const value = data[process.argv[2]];
if (typeof value !== 'string') process.exit(2);
process.stdout.write(value);
" "$file" "$key"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$file" "$key" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    data = json.load(handle)

value = data.get(sys.argv[2])
if not isinstance(value, str):
    raise SystemExit(2)

print(value, end="")
PY
    return
  fi

  fail "node or python3 is required to parse plugin.json"
}

validate_default_prompt() {
  local file="$1"

  if command -v node >/dev/null 2>&1; then
    node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const prompts = data.interface && data.interface.defaultPrompt;
if (!Array.isArray(prompts) || prompts.length === 0) process.exit(2);
if (!prompts.every((prompt) => typeof prompt === 'string' && prompt.length > 0)) process.exit(2);
" "$file"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$file" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    data = json.load(handle)

prompts = data.get("interface", {}).get("defaultPrompt")
if not isinstance(prompts, list) or not prompts:
    raise SystemExit(2)

if not all(isinstance(prompt, str) and prompt for prompt in prompts):
    raise SystemExit(2)
PY
    return
  fi

  fail "node or python3 is required to parse plugin.json"
}

PLUGIN_JSON=".codex-plugin/plugin.json"
require_file "SKILL.md"
require_file "$PLUGIN_JSON"

skills_path="$(json_value "$PLUGIN_JSON" "skills")" || fail "invalid JSON or missing string field: skills"
[[ "$skills_path" == "./skills/" ]] || fail "plugin.json skills must be ./skills/"
validate_default_prompt "$PLUGIN_JSON" || fail "plugin.json interface.defaultPrompt must be a non-empty string array"

skills=(
  "easy-prd-testing"
  "execution-gate"
  "prd-intake"
  "regression-testing"
  "result-aggregation"
  "test-execution"
  "test-planning"
)

for skill in "${skills[@]}"; do
  require_dir "skills/$skill"
  require_file "skills/$skill/SKILL.md"
done

templates=(
  "skills/execution-gate/templates/执行前确认.md"
  "skills/prd-intake/templates/00-资料分析与待确认问题.md"
  "skills/regression-testing/templates/07-回归记录.md"
  "skills/regression-testing/templates/08-回归缺陷状态.md"
  "skills/result-aggregation/templates/05-执行记录.md"
  "skills/result-aggregation/templates/06-缺陷记录.md"
  "skills/test-execution/templates/执行结果/优先级/05-执行记录.md"
  "skills/test-execution/templates/执行结果/优先级/06-缺陷记录.md"
  "skills/test-planning/templates/01-模块拆解.md"
  "skills/test-planning/templates/02-测试用例.md"
  "skills/test-planning/templates/03-执行清单.md"
  "skills/test-planning/templates/04-测试数据与账号.md"
)

for template in "${templates[@]}"; do
  require_file "$template"
done

require_file "README.md"
require_file "docs/agent-protocol.md"
require_file "docs/artifact-contract.md"
require_file "docs/workflow.md"
require_file "scripts/check-deps.sh"
bash -n "scripts/check-deps.sh" || fail "invalid shell syntax: scripts/check-deps.sh"

printf 'Plugin validation passed.\n'
