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

## Rules

- Root summaries are owned by the main agent.
- Read priority-level `05-执行记录.md` and `06-缺陷记录.md`.
- Summarize total, passed, failed, blocked, untested, and pending-confirmation cases.
- Preserve evidence paths.
- Mark child-agent write boundary violations.
- Do not convert blockers into defects without user confirmation.
