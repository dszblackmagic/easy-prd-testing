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

Assume the user has confirmed `01-04` when this skill is invoked after the planning stage. Check file existence; do not ask whether they are confirmed again.

## Confirmation Order

Ask only the earliest missing item:

1. Module artifact directory, if the `01-04` files cannot be located.
2. Test environment address and module test path.
3. Login mode: specified account, reuse current session, or no login.
4. For specified account: account, password retrieval method, and permission scope.
5. Execution mode: single agent or priority-based multi-agent.
6. High-risk action authorization: allow real submission, or verify only entry, display, validation, secondary confirmation, and messages.

## Final Execution Plan

When all prerequisites are confirmed, summarize:

- Module artifact directory.
- Test environment and path.
- Login mode and account handling.
- Execution mode.
- High-risk authorization boundary.
- Priority scope.
- Evidence directories.

Only after this summary may execution begin.
