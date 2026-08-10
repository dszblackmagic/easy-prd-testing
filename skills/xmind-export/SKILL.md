---
name: xmind-export
description: Convert standard or legacy Markdown test-case tables into an optional native XMind file. Use when the user asks to generate, supplement, refresh, or overwrite an XMind view of Easy PRD Testing or other existing Markdown test cases. Supports arbitrary directories, relative paths, non-standard filenames, multiple tables, legacy columns, and incomplete rows. Do not use for generic mind maps or arbitrary XMind editing.
---

# XMind Test-Case Export

## Goal

Create a native XMind 2020+ review view while keeping the source Markdown authoritative and read-only.

## Locate the source

Accept any of these as `--input`:

- An absolute or relative Markdown file path.
- A module directory containing `02-测试用例.md`.
- A directory containing exactly one recognizable test-case Markdown file.

Prefer `02-测试用例.md` when present. If a directory contains multiple recognizable candidates, ask the user to select one. Write the XMind beside the selected source with the same basename.

## Export

Require Node.js 18 or newer. If it is missing, ask the user to install it; never install it automatically.

Run:

```bash
node <skill-dir>/scripts/export_test_cases.mjs \
  --input "/path/or/module-directory"
```

Interpret the JSON status:

- `created`: report the output path, case count, and warnings.
- `updated`: report the output path, update reason, optional backup path, and warnings.
- `up-to-date`: report that the existing XMind already matches the source.
- `error`: report the actionable errors. Do not claim an output was generated.

Do not ask for overwrite confirmation. Managed XMind files update atomically when the source changes. Before replacing an unknown same-name XMind, the exporter preserves it as `.bak`, `.bak.1`, and so on. `--force` remains accepted only for backward compatibility.

## Compatibility behavior

- Scan and merge all recognizable Markdown test-case tables.
- Recognize canonical and legacy aliases such as `用例ID`, `操作/校验`, `校验点`, and `预期`.
- Infer priority from the explicit column, then section heading, then case ID.
- Keep `P0`-`P3` branches and add `未分级` only when needed.
- Generate missing IDs, fill missing content with `待补充`, default yes/no flags to `否`, and label affected cases `待补充`.
- Treat `01-模块拆解.md` and `F-xxx` traceability as optional enhancements.
- Return skipped tables, defaults, conflicts, and unmatched feature references as warnings without blocking export.

Stop only when the input cannot be resolved uniquely, Node.js is unavailable, no recognizable Markdown test-case table exists, or the generated XMind fails structural validation.

## Workflow rules

- Never rewrite the source Markdown during export.
- Treat the XMind as an optional one-way derivative.
- Do not accept XMind edits as source updates; update Markdown and regenerate.
- Do not add XMind to the `01-04` execution gate.
- Do not auto-open XMind.
- Respond in the user's language.

## Parent planning integration

After `test-planning` generates `01-04`, offer the optional XMind view before requesting final planning confirmation. Add the export task only after opt-in. Skipping or warning-heavy export never blocks planning confirmation.
