---
name: test-planning
description: Use after PRD/prototype intake when generating or updating module testing planning artifacts 01-04 before any browser execution.
---

# Test Planning

## Goal

Generate executable automation self-testing planning artifacts from confirmed PRD/prototype understanding.

## Required Inputs

- Module name.
- PRD/prototype/field baseline/product notes, or an intake summary from `prd-intake`.
- Output root directory confirmed by the user.

## Output Directory Gate

Before creating files, ask where automation testing results and planning artifacts should be written.

All files must be placed under:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

Do not default to the repository `docs/` directory unless the user explicitly chooses it as the output root.

## Generated Artifacts

Create or update:

- `01-模块拆解.md`
- `02-测试用例.md`
- `03-执行清单.md`
- `04-测试数据与账号.md`

## Planning Rules

- Feature IDs use `F-xxx`.
- Test cases link to feature IDs.
- Test case IDs use `<module-code>-P<priority>-NNN`.
- Priorities are `P0`, `P1`, `P2`, and `P3`.
- Each case records its execution directory: `执行结果/P0/`, `执行结果/P1/`, `执行结果/P2/`, or `执行结果/P3/`.
- Field baselines record their source.
- Prototype-only fields are marked pending user confirmation.

## Stop Condition

After generating `01-04`, stop and ask the user to explicitly confirm the planning artifacts. Do not enter execution gates automatically.
