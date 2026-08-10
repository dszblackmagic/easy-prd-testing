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

sha256_file() {
  local file="$1"

  if command -v node >/dev/null 2>&1; then
    node -e "
const fs = require('fs');
const crypto = require('crypto');
process.stdout.write(crypto.createHash('sha256').update(fs.readFileSync(process.argv[1])).digest('hex'));
" "$file"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$file" <<'PY'
import hashlib
import sys

with open(sys.argv[1], "rb") as handle:
    print(hashlib.sha256(handle.read()).hexdigest(), end="")
PY
    return
  fi

  fail "node or python3 is required to hash vendored files"
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
if (!Array.isArray(prompts) || prompts.length === 0 || prompts.length > 3) process.exit(2);
if (!prompts.every((prompt) => typeof prompt === 'string' && prompt.length > 0 && prompt.length <= 128)) process.exit(2);
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
if not isinstance(prompts, list) or not prompts or len(prompts) > 3:
    raise SystemExit(2)

if not all(isinstance(prompt, str) and prompt and len(prompt) <= 128 for prompt in prompts):
    raise SystemExit(2)
PY
    return
  fi

  fail "node or python3 is required to parse plugin.json"
}

validate_skill_frontmatter() {
  local file="$1"
  local expected_name="$2"

  if command -v node >/dev/null 2>&1; then
    node -e "
const fs = require('fs');
const text = fs.readFileSync(process.argv[1], 'utf8');
const match = text.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---/);
if (!match) process.exit(2);
const name = match[1].match(/^name:\\s*(.+)$/m)?.[1]?.trim();
const description = match[1].match(/^description:\\s*(.+)$/m)?.[1]?.trim();
if (name !== process.argv[2]) process.exit(2);
if (!description || description.includes('TODO')) process.exit(2);
" "$file" "$expected_name"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$file" "$expected_name" <<'PY'
import re
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    text = handle.read()

match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", text)
if not match:
    raise SystemExit(2)

name_match = re.search(r"^name:\s*(.+)$", match.group(1), re.MULTILINE)
description_match = re.search(r"^description:\s*(.+)$", match.group(1), re.MULTILINE)
if not name_match or name_match.group(1).strip() != sys.argv[2]:
    raise SystemExit(2)
if not description_match or not description_match.group(1).strip() or "TODO" in description_match.group(1):
    raise SystemExit(2)
PY
    return
  fi

  fail "node or python3 is required to validate skill frontmatter"
}

PLUGIN_JSON=".codex-plugin/plugin.json"
require_file "SKILL.md"
require_file "$PLUGIN_JSON"
validate_skill_frontmatter "SKILL.md" "easy-prd-testing" || fail "invalid root SKILL.md frontmatter"

skills_path="$(json_value "$PLUGIN_JSON" "skills")" || fail "invalid JSON or missing string field: skills"
[[ "$skills_path" == "./skills/" ]] || fail "plugin.json skills must be ./skills/"
validate_default_prompt "$PLUGIN_JSON" || fail "plugin.json interface.defaultPrompt must contain 1-3 strings of at most 128 characters"

skills=(
  "easy-prd-testing"
  "execution-gate"
  "prd-intake"
  "regression-testing"
  "result-aggregation"
  "test-execution"
  "test-planning"
  "xmind-export"
)

for skill in "${skills[@]}"; do
  require_dir "skills/$skill"
  require_file "skills/$skill/SKILL.md"
  validate_skill_frontmatter "skills/$skill/SKILL.md" "$skill" || fail "invalid frontmatter: skills/$skill/SKILL.md"
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
require_file "README.en.md"
require_file "CONTEXT.md"
require_file "THIRD_PARTY_NOTICES.md"
require_file "docs/agent-protocol.md"
require_file "docs/artifact-contract.md"
require_file "docs/workflow.md"
require_file "scripts/check-deps.sh"
require_file "scripts/test-xmind-export.mjs"
require_file "skills/xmind-export/agents/openai.yaml"
require_file "skills/xmind-export/scripts/create_xmind.mjs"
require_file "skills/xmind-export/scripts/export_test_cases.mjs"
bash -n "scripts/check-deps.sh" || fail "invalid shell syntax: scripts/check-deps.sh"

expected_xmind_creator_sha="4f8bffbe4590d60a16b53ee428f87882bb99d798b781967fc35d4a467613c427"
actual_xmind_creator_sha="$(sha256_file "skills/xmind-export/scripts/create_xmind.mjs")"
[[ "$actual_xmind_creator_sha" == "$expected_xmind_creator_sha" ]] || fail "vendored create_xmind.mjs differs from the pinned upstream snapshot"

if command -v node >/dev/null 2>&1; then
  node --check "skills/xmind-export/scripts/create_xmind.mjs"
  node --check "skills/xmind-export/scripts/export_test_cases.mjs"
  node --check "scripts/test-xmind-export.mjs"
  node "scripts/test-xmind-export.mjs"
else
  printf 'Plugin validation warning: node not found; skipped optional XMind runtime tests.\n' >&2
fi

printf 'Plugin validation passed.\n'
