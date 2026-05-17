---
name: execution-gate
description: Use after planning artifacts 01-04 are explicitly confirmed and before browser execution to collect environment, path, login, execution mode, and risk authorization.
---

# Execution Gate

## Goal

Confirm every prerequisite needed before page execution.

## Required Files

The module artifact directory must contain readable:

- `01-模块拆解.md`
- `02-测试用例.md`
- `03-执行清单.md`
- `04-测试数据与账号.md`

The conversation or visible task state must show explicit user confirmation of `01-04`. Invocation after planning is not enough. If explicit confirmation is absent, stop and ask the user to confirm `01-04` before collecting execution prerequisites.

Check file existence separately from confirmation.

## Confirmation Order

Ask only the earliest missing item:

1. Module artifact directory, if the `01-04` files cannot be located.
2. Explicit user confirmation of `01-04`, if not observable in conversation or visible task state.
3. Test environment address and module test path.
4. Login mode: specified account, reuse current session, or no login.
5. For specified account: account, password retrieval method, and permission scope.
6. Execution mode: single agent or priority-based multi-agent.
7. Execution backend policy: default `agent-browser`, diagnostic Chrome DevTools CLI, final fallback Chrome DevTools MCP.
8. Runtime dependency check: run `scripts/check-deps.sh` when available, or manually check the same dependency layers when this skill is installed without repository scripts.
9. Playwright Test policy: generate regression script drafts only when the user requests script persistence or when P0/P1 failures need future regression.
10. High-risk action authorization: allow real submission, or verify only entry, display, validation, secondary confirmation, and messages.

## Runtime Dependency Rules

- The dependency check is detection-only. Do not install anything during the check.
- If basic dependencies are missing, stop and ask whether the user permits installation or environment setup.
- If Playwright is missing and scripts, video, or trace are required, show the suggested command and ask for explicit user confirmation before installing.
- If Chrome or Chromium is missing, ask whether to install Playwright Chromium or configure a local browser.
- Chrome DevTools CLI and Chrome DevTools MCP are optional diagnostic enhancements. Missing optional diagnostics do not block ordinary execution, but the final execution plan must record the limitation.
- Child agents must not install dependencies.

## Final Execution Plan

When all prerequisites are confirmed, summarize:

- Module artifact directory.
- Test environment and path.
- Login mode and account handling.
- Execution mode.
- Execution backend policy.
- Runtime dependency check result.
- Missing dependencies and suggested install commands.
- User-confirmed install permissions, if any.
- Downgrade strategy for unavailable optional dependencies.
- Playwright Test policy.
- High-risk authorization boundary.
- Priority scope.
- Evidence directories.

Only after this summary may execution begin.
