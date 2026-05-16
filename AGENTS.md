# Repository Guidelines

## Project Structure & Module Organization

This repository is a Codex plugin for PRD/prototype-driven automation testing.

- `.codex-plugin/plugin.json` defines plugin metadata and points Codex to `./skills/`.
- `skills/` contains the runnable skill modules. Keep each `SKILL.md` focused on one workflow stage.
- `skills/*/templates/` contains stage-specific Markdown templates used by the helper scripts and agents.
- `scripts/` contains local validation and scaffolding helpers.
- `docs/` contains public contributor-facing workflow, artifact, and agent protocol docs for this project only.
- `docs/superpowers/` and `docs/external-plugins/` are intentionally ignored and must not be committed.

## Build, Test, and Development Commands

Run these from the repository root:

```bash
scripts/validate-plugin.sh
```

Validates plugin metadata, skill files, templates, and public docs.

```bash
bash -n scripts/validate-plugin.sh scripts/scaffold-testing-docs.sh
```

Checks shell syntax.

```bash
scripts/scaffold-testing-docs.sh "/tmp/easy-prd-output" "订单管理"
```

Generates a sample testing artifact tree under `<output-root>/easy-prd-testing/testing/<module-name>/`.

## Coding Style & Naming Conventions

Use Markdown for skills, templates, and docs. Keep headings descriptive and action-oriented. Shell scripts should use `#!/usr/bin/env bash` and `set -euo pipefail` when they perform filesystem operations. Prefer explicit paths and stable filenames such as `01-模块拆解.md`, `05-执行记录.md`, and `06-缺陷记录.md`.

## Testing Guidelines

There is no separate unit test framework. Treat `scripts/validate-plugin.sh` as the baseline test. For scaffold changes, verify missing-argument handling, directory creation, and no-overwrite behavior. Do not use browser, MCP, or Playwright during repository validation unless a future task explicitly requires it.

## Commit & Pull Request Guidelines

Follow Conventional Commits, as in the existing history:

- `feat: add testing artifact scaffold script`
- `fix: align plugin default prompts with manifest schema`
- `docs: align artifact templates with workflow contract`
- `chore: ignore superpowers planning docs`

Pull requests should include a short summary, changed files or areas, validation commands run, and any known limitations. If template behavior changes, mention the affected artifact path or filename.

## Agent-Specific Instructions

Do not commit generated `docs/superpowers/` content or documentation produced for external plugins. Keep Git history scoped to this repository's plugin, docs, templates, and scripts. Preserve the output path contract: `<output-root>/easy-prd-testing/testing/<module-name>/`. Keep execution gates strict: `01-04` files must exist and be explicitly confirmed before execution.
