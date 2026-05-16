# Workflow

Easy PRD Testing runs as a gated workflow:

1. Collect PRD, prototype images, field baselines, or user-provided product notes.
2. Confirm the module name.
3. Confirm the output root directory.
4. Analyze source materials and ask clarification questions one at a time.
5. Generate `01-04` planning artifacts.
6. Wait for explicit user confirmation of the planning artifacts.
7. Confirm execution prerequisites one item at a time.
8. Execute tests in single-agent mode or priority-based multi-agent mode.
9. Aggregate execution records, defects, blockers, and evidence indexes.

## Optional Regression Workflow

After a defect is fixed or the user requests regression:

1. Confirm the defect ID, test case ID, priority, or regression scope.
2. Run existing Playwright Test scripts first.
3. Classify failures as product issue, script drift, environment/data blocker, or unclear.
4. Use `agent-browser` only when script output is insufficient.
5. Use Chrome DevTools CLI or MCP only for deeper diagnosis.
6. Write `07-回归记录.md` and `08-回归缺陷状态.md` under the owning priority directory.
7. Re-run result aggregation to update the root summary.

## Visible Task List

During the full workflow, the parent skill keeps a user-visible task list with these statuses:

- `pending`: not started.
- `in_progress`: actively being handled.
- `blocked`: waiting for one user input, environment condition, account, permission, data, or dependency.
- `completed`: actually completed.
- `skipped`: explicitly skipped by the user for this run.

The task list must not replace gates. A task can only become `completed` after the related artifact exists, user confirmation is received, or execution result is recorded.

## Gate Rules

- No PRD or prototype: ask for source material.
- No module name: ask for the module name.
- No output root: ask where automation testing artifacts should be written.
- Planning artifacts generated: stop until the user explicitly confirms them.
- Missing execution prerequisite: ask only the earliest missing prerequisite.
- High-risk action without authorization: verify only entry, display, validation, secondary confirmation, and messages.
