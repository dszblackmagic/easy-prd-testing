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
8. Playwright Test policy: generate regression script drafts only when the user requests script persistence or when P0/P1 failures need future regression.
9. High-risk action authorization: allow real submission, or verify only entry, display, validation, secondary confirmation, and messages.

## Final Execution Plan

When all prerequisites are confirmed, summarize:

- Module artifact directory.
- Test environment and path.
- Login mode and account handling.
- Execution mode.
- Execution backend policy.
- Playwright Test policy.
- High-risk authorization boundary.
- Priority scope.
- Evidence directories.

Only after this summary may execution begin.
