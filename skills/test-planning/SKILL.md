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
- Every test case links to at least one `F-xxx` feature ID defined in `01-模块拆解.md`.
- Test case IDs use `<module-code>-P<priority>-NNN`.
- Priorities are `P0`, `P1`, `P2`, and `P3`.
- Each case records its execution directory: `执行结果/P0/`, `执行结果/P1/`, `执行结果/P2/`, or `执行结果/P3/`.
- Field baselines record their source.
- Prototype-only fields are marked pending user confirmation.

## Optional XMind Review Artifact

After generating or updating `01-04`, ask whether the user wants the optional native `02-测试用例.xmind` review artifact. If the user opts in, use `xmind-export` before requesting final planning confirmation.

- Do not generate the XMind without user opt-in.
- Do not treat the XMind as an authoritative source or gate requirement.
- Do not block confirmation of valid `01-04` files when the export is skipped or fails.

## Stop Condition

After offering or completing the optional XMind export, stop and ask the user to explicitly confirm the `01-04` planning artifacts. Do not enter execution gates automatically.
