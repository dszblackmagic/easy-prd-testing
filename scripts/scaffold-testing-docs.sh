#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  printf 'Usage: %s <output-root> <module-name>\n' "$0" >&2
  exit 64
fi

OUTPUT_ROOT="$1"
MODULE_NAME="$2"

if [ -z "$OUTPUT_ROOT" ] || [ -z "$MODULE_NAME" ]; then
  printf 'Both <output-root> and <module-name> are required.\n' >&2
  exit 64
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$OUTPUT_ROOT/easy-prd-testing/testing/$MODULE_NAME"

copy_if_missing() {
  local src="$1"
  local dest="$2"

  if [ -f "$dest" ]; then
    printf '[SKIP] %s already exists\n' "$dest"
    return
  fi

  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  printf '[CREATE] %s\n' "$dest"
}

mkdir -p "$TARGET_DIR"

copy_if_missing "$ROOT_DIR/skills/prd-intake/templates/00-资料分析与待确认问题.md" "$TARGET_DIR/00-资料分析与待确认问题.md"
copy_if_missing "$ROOT_DIR/skills/test-planning/templates/01-模块拆解.md" "$TARGET_DIR/01-模块拆解.md"
copy_if_missing "$ROOT_DIR/skills/test-planning/templates/02-测试用例.md" "$TARGET_DIR/02-测试用例.md"
copy_if_missing "$ROOT_DIR/skills/test-planning/templates/03-执行清单.md" "$TARGET_DIR/03-执行清单.md"
copy_if_missing "$ROOT_DIR/skills/test-planning/templates/04-测试数据与账号.md" "$TARGET_DIR/04-测试数据与账号.md"

for priority in P0 P1 P2 P3; do
  PRIORITY_DIR="$TARGET_DIR/执行结果/$priority"
  mkdir -p "$PRIORITY_DIR/screenshots" "$PRIORITY_DIR/videos" "$PRIORITY_DIR/scripts"
  copy_if_missing "$ROOT_DIR/skills/test-execution/templates/执行结果/优先级/05-执行记录.md" "$PRIORITY_DIR/05-执行记录.md"
  copy_if_missing "$ROOT_DIR/skills/test-execution/templates/执行结果/优先级/06-缺陷记录.md" "$PRIORITY_DIR/06-缺陷记录.md"
done

copy_if_missing "$ROOT_DIR/skills/result-aggregation/templates/05-执行记录.md" "$TARGET_DIR/05-执行记录.md"
copy_if_missing "$ROOT_DIR/skills/result-aggregation/templates/06-缺陷记录.md" "$TARGET_DIR/06-缺陷记录.md"

printf 'Scaffold complete: %s\n' "$TARGET_DIR"
