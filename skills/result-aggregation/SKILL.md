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
- Treat `通过`, `失败`, `阻塞`, `未测`, and `待确认` as the only valid first-run case statuses. Do not silently map unknown or blank values; flag them for correction in the priority record.
- Summarize total, passed, failed, blocked, untested, and pending-confirmation cases from those five statuses. The total must equal their sum.
- Preserve the priority directory boundary and relative evidence paths. Priority agents own `执行结果/Px/`; only the main agent writes root `05-执行记录.md` and `06-缺陷记录.md`.
- Carry application type, service status and ownership, page-readiness basis, locator type, Console/Network observation, and session/temporary-service cleanup outcomes into the root summary or its priority index. Do not erase a priority-level exception by replacing it with a batch-wide default.
- Keep an actual-result summary separate from diagnostic evidence. Passing cases need a concrete result summary but do not require screenshots or diagnostic artifacts.
- Include Console, Network, video, Trace, and HAR entries only when the execution tool actually produced them. Preserve `未产生（原因）` when a priority record reports that material was not generated; never infer evidence from a backend's capabilities.
- For failed cases, preserve available failure evidence and any stated reason that expected evidence was not produced. Do not turn a missing optional diagnostic artifact into a successful observation.
- Mark child-agent write boundary violations.
- Do not convert blockers into defects without user confirmation.
