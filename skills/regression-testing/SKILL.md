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
- Runtime dependency check result, or permission to rerun `scripts/check-deps.sh` before script-first regression.

## Stop Conditions

Stop and ask only for the earliest missing input when any required input is absent. Do not infer which defect or case should be regressed if the target is unclear.

## Execution Order

1. Read the related defect records and test cases.
2. Confirm the regression target if it is ambiguous.
3. Reuse the dependency check result, or rerun `scripts/check-deps.sh` when the previous result is absent or stale.
4. Check `执行结果/Px/regression-scripts/` and `执行结果/Px/scripts/` for related Playwright Test scripts.
5. If scripts exist but Playwright is unavailable, show the suggested install command and ask for explicit user confirmation before installing.
6. Run available Playwright Test scripts first when dependencies are available.
7. Record pass, failure, or blocker in `执行结果/Px/07-回归记录.md`.
8. Classify failures as product issue, script drift, environment/data blocker, dependency blocker, or unclear.
9. Use `agent-browser` only when the script result is not enough to classify the failure, or when Playwright is unavailable and the user declines installation.
10. Escalate to Chrome DevTools CLI only when browser evidence is insufficient and the dependency check shows CLI is available.
11. Escalate to Chrome DevTools MCP only when CLI diagnostics are unavailable or insufficient and MCP is configured.
12. Update `执行结果/Px/08-回归缺陷状态.md`.

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
- Dependency blocker: Playwright, browser runtime, account-side tool access, or diagnostic dependency is missing and the user has not approved installation or configuration.
- Unclear: current evidence is insufficient and requires `agent-browser`, Chrome DevTools CLI, or MCP escalation.

## Evidence Rules

- Passing script runs need command summary and report path.
- Failed script runs need failure summary, screenshot or trace path when available, and classification.
- Product issue rechecks need screenshot and actual result.
- Diagnostic escalation needs backend name, escalation reason, saved artifact paths, and concise conclusion.
