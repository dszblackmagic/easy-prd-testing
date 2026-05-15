---
name: test-execution
description: Use when confirmed planning artifacts and final execution plan are available and page verification, field comparison, evidence capture, or priority execution is requested.
---

# Test Execution

## Goal

Execute confirmed test cases and record evidence by priority.

## Required Inputs

- Confirmed module artifact directory.
- Readable `01-04` planning artifacts.
- Final execution plan from `execution-gate`.
- Confirmed risk boundary.

## Execution Modes

Single-agent mode:

- Execute `P0 -> P1 -> P2 -> P3`.
- Write each priority result to its own `执行结果/Px/` directory.

Multi-agent mode:

- Dispatch by priority only.
- A child agent writes only its assigned `执行结果/Px/` directory.
- Child agents do not modify `01-04`.
- Child agents do not write root `05-执行记录.md` or `06-缺陷记录.md`.

## Evidence Rules

- Passing cases need a result summary and do not require screenshots.
- Field differences require screenshots.
- Operation failures require screenshots, Console summary, Network summary, and Playwright CLI video when available.
- Missing account, permission, data, environment, or dependency is recorded as `阻塞`.
- Blockers are not defects unless the user confirms they are product or implementation issues.

## Dependency Rules

Check whether Chrome DevTools MCP and Playwright CLI are available before execution. If a dependency is unavailable, record the downgrade strategy. Do not install dependencies automatically.

## Progress Output

Report progress at priority start, meaningful checkpoints, failures, blockers, and priority completion. Keep updates concise and include evidence paths.
