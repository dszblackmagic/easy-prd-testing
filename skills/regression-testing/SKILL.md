---
name: regression-testing
description: Use after defects are fixed or regression verification is requested to run existing Playwright Test scripts first, classify failures, optionally use agent-browser for page recheck, and record flat priority-owned regression artifacts.
---

# Regression Testing

## Goal

Verify fixed defects and stable high-value flows with script-first regression while keeping evidence under the owning priority directory.

## Required Inputs

- Confirmed module artifact directory.
- Existing `06-缺陷记录.md` or priority-owned `执行结果/Px/06-缺陷记录.md`.
- Regression target: defect ID, test case ID, priority, or user-confirmed scope.
- Confirmed environment address, login mode, account handling, and risk boundary.

## Stop Conditions

Stop and ask only for the earliest missing input when any required input is absent. Do not infer which defect or case should be regressed if the target is unclear.

## Execution Order

1. Read the related defect records and test cases.
2. Confirm the regression target if it is ambiguous.
3. Check `执行结果/Px/regression-scripts/` and `执行结果/Px/scripts/` for related Playwright Test scripts.
4. Run available Playwright Test scripts first.
5. Record pass, failure, or blocker in `执行结果/Px/07-回归记录.md`.
6. Classify failures as product issue, script drift, environment/data blocker, or unclear.
7. Use `agent-browser` only when the script result is not enough to classify the failure.
8. Escalate to Chrome DevTools CLI only when browser evidence is insufficient.
9. Escalate to Chrome DevTools MCP only when CLI diagnostics are unavailable, insufficient, or require interactive DevTools analysis.
10. Update `执行结果/Px/08-回归缺陷状态.md`.

## Write Boundaries

- Write only inside the priority directory that owns the regressed case or defect.
- Do not modify `01-04` planning artifacts.
- Do not overwrite first-run `05-执行记录.md` or `06-缺陷记录.md`.
- Store regression screenshots in `regression-screenshots/`.
- Store regression videos in `regression-videos/`.
- Store Playwright trace, DevTools trace, HAR files, and trace summaries in `regression-traces/`.
- Store regression Playwright Test scripts in `regression-scripts/`.

## Failure Classification

- Product issue: the repaired behavior still fails against the confirmed expected result.
- Script drift: selectors, assertions, or page flow changed while the product behavior appears correct.
- Environment/data blocker: account, permission, seed data, service availability, or environment configuration prevents verification.
- Unclear: current evidence is insufficient and requires `agent-browser`, Chrome DevTools CLI, or MCP escalation.

## Evidence Rules

- Passing script runs need command summary and report path.
- Failed script runs need failure summary, screenshot or trace path when available, and classification.
- Product issue rechecks need screenshot and actual result.
- Diagnostic escalation needs backend name, escalation reason, saved artifact paths, and concise conclusion.
