---
name: result-aggregation
description: Use after priority execution records exist and root execution and defect summaries need to be generated or updated.
---

# Result Aggregation

## Goal

Aggregate priority execution records and defect records into root summary files.

## Inputs

Read from:

```text
执行结果/P0/
执行结果/P1/
执行结果/P2/
执行结果/P3/
```

## Outputs

Generate or update at the module artifact root:

- `05-执行记录.md`
- `06-缺陷记录.md`

## Regression Inputs

When present, also read priority-owned regression artifacts:

- `执行结果/Px/07-回归记录.md`
- `执行结果/Px/08-回归缺陷状态.md`
- `执行结果/Px/regression-screenshots/`
- `执行结果/Px/regression-videos/`
- `执行结果/Px/regression-traces/`
- `执行结果/Px/regression-scripts/`

Root summaries must keep first-run results and regression results distinguishable. Do not overwrite original first-run defects; record regression status as a status update.

## Rules

- Root summaries are owned by the main agent.
- Read priority-level `05-执行记录.md` and `06-缺陷记录.md`.
- Summarize total, passed, failed, blocked, untested, and pending-confirmation cases.
- Preserve evidence paths.
- Mark child-agent write boundary violations.
- Do not convert blockers into defects without user confirmation.
