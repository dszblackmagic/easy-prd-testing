---
name: easy-prd-testing
description: Use when PRD or prototype based module self-testing needs a complete Codex workflow for intake, clarification, planning documents, execution gates, priority-based execution, evidence, and aggregation.
---

# Easy PRD Testing

## Role

This is the parent entry point for the Easy PRD Testing plugin. It determines the current workflow stage and routes the work to the correct child skill.

## Stage Routing

- Source material analysis or unclear PRD/prototype input: use `prd-intake`.
- Planning artifact generation or updates: use `test-planning`.
- Execution prerequisite confirmation: use `execution-gate`.
- Browser verification, field comparison, evidence capture, or priority execution: use `test-execution`.
- Root execution or defect summary generation: use `result-aggregation`.

## Hard Gates

1. Do not generate planning artifacts without PRD, prototype, field baseline, or user-provided product notes.
2. Do not create a module artifact directory before the module name is known.
3. Do not create testing artifacts before the output root directory is confirmed.
4. Do not enter execution gates until `01-04` planning artifacts exist and the user explicitly confirms them.
5. Do not execute pages until environment address, test path, login mode, account handling, execution mode, and high-risk authorization are confirmed.
6. Do not let child agents write outside their assigned priority directory.

## Visible Task List

During a full workflow, maintain a user-visible task list.

Allowed statuses:

- `pending`: not started.
- `in_progress`: current active step.
- `blocked`: waiting for one user input, environment, account, permission, test data, or dependency.
- `completed`: actually completed.
- `skipped`: explicitly skipped by the user for this run.

Default tasks:

1. Collect PRD, prototype, field baseline, or product notes.
2. Confirm module name.
3. Confirm output root directory.
4. Analyze materials and collect clarification questions.
5. Generate `01-04` planning artifacts.
6. Wait for explicit user confirmation of `01-04`.
7. Confirm environment address and test path.
8. Confirm login mode, account, password retrieval, and permission scope.
9. Confirm execution mode and high-risk action authorization.
10. Execute P0/P1/P2/P3 cases.
11. Aggregate execution and defect records.
12. Report final conclusion and evidence index.

Update the task list whenever a stage starts, completes, becomes blocked, resumes, or is skipped. A task must not be marked `completed` until the related user confirmation, generated artifact, execution result, or summary exists.

## Output Path Contract

All generated module artifacts live under:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

The `easy-prd-testing` directory name is fixed.

## Stop Conditions

Stop and ask the user when the earliest required input is missing. Ask only for that one input. Record later information if the user volunteered it, but continue from the earliest missing gate.
