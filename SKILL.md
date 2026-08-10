---
name: easy-prd-testing
description: Use when PRD or prototype based module self-testing needs a complete Codex workflow for intake, clarification, planning documents, optional native XMind test-case export, execution gates, priority-based execution, evidence, aggregation, and regression testing.
---

# Easy PRD Testing

## Role

This root `SKILL.md` makes the repository installable as a standalone Codex skill from the repository root. The same repository also works as a Codex plugin through `.codex-plugin/plugin.json`.

When this skill is installed from the repository root, use the stage instructions under `skills/` as local references:

- Intake: `skills/prd-intake/SKILL.md`
- Planning: `skills/test-planning/SKILL.md`
- Optional XMind test-case export: `skills/xmind-export/SKILL.md`
- Execution gate: `skills/execution-gate/SKILL.md`
- Test execution: `skills/test-execution/SKILL.md`
- Regression testing: `skills/regression-testing/SKILL.md`
- Result aggregation: `skills/result-aggregation/SKILL.md`

Read the relevant stage file before executing that stage.

## Stage Routing

- Source material analysis or unclear PRD/prototype input: follow `skills/prd-intake/SKILL.md`.
- Planning artifact generation or updates: follow `skills/test-planning/SKILL.md`.
- Optional native XMind generation or refresh for `02-测试用例.md`: follow `skills/xmind-export/SKILL.md`.
- Execution prerequisite confirmation: follow `skills/execution-gate/SKILL.md`.
- Browser verification, field comparison, evidence capture, or priority execution: follow `skills/test-execution/SKILL.md`.
- Root execution or defect summary generation: follow `skills/result-aggregation/SKILL.md`.
- Defect fix verification, rerun after bug fix, regression script execution, or regression status update: follow `skills/regression-testing/SKILL.md`.

## Hard Gates

1. Do not generate planning artifacts without PRD, prototype, field baseline, or user-provided product notes.
2. Do not create a module artifact directory before the module name is known.
3. Do not create testing artifacts before the output root directory is confirmed.
4. Do not enter execution gates until `01-04` planning artifacts exist and the user explicitly confirms them.
5. Do not execute pages until environment address, test path, login mode, account handling, execution mode, and high-risk authorization are confirmed.
6. Do not let child agents write outside their assigned priority directory.
7. Do not start regression testing until a defect ID, test case ID, priority, or explicit user-confirmed regression scope is known.

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
6. Offer the optional XMind test-case export; add its task only after the user opts in.
7. Wait for explicit user confirmation of `01-04`.
8. Confirm environment address and test path.
9. Confirm login mode, account, password retrieval, and permission scope.
10. Confirm execution mode and high-risk action authorization.
11. Execute P0/P1/P2/P3 cases.
12. Aggregate execution and defect records.
13. Report final conclusion and evidence index.
14. Confirm regression target after defect fixes when requested.
15. Run Playwright Test regression scripts when available.
16. Recheck unclear regression failures with `agent-browser`.
17. Update regression records and defect statuses.

Update the task list whenever a stage starts, completes, becomes blocked, resumes, or is skipped. A task must not be marked `completed` until the related user confirmation, generated artifact, execution result, or summary exists.

## Output Path Contract

All generated module artifacts live under:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

The `easy-prd-testing` directory name is fixed.

`02-测试用例.xmind` is an optional one-way derivative of `02-测试用例.md`. It is never required by the `01-04` execution gate.

## Stop Conditions

Stop and ask the user when the earliest required input is missing. Ask only for that one input. Record later information if the user volunteered it, but continue from the earliest missing gate.
