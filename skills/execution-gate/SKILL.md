---
name: execution-gate
description: Use after planning artifacts 01-04 are explicitly confirmed and before browser execution to collect environment, path, login, execution mode, and risk authorization.
---

# Execution Gate

## Goal

Confirm every prerequisite needed before page execution, including target and service lifecycle ownership.

## Required Files

The module artifact directory must contain readable:

- `01-模块拆解.md`
- `02-测试用例.md`
- `03-执行清单.md`
- `04-测试数据与账号.md`

The conversation or visible task state must show explicit user confirmation of `01-04`. Invocation after planning is not enough. If explicit confirmation is absent, stop and ask the user to confirm `01-04` before collecting execution prerequisites.

Check file existence separately from confirmation.

## Confirmation Order

Resolve prerequisites in this order. Before asking, use the input path or URL, read-only port or reachability probes, the existing execution plan, and `01-04` to infer what can be recorded safely. Ask only for the earliest item that still requires user information or authorization:

1. Module artifact directory, if the `01-04` files cannot be located.
2. Explicit user confirmation of `01-04`, if not observable in conversation or visible task state.
3. Test environment address and module test path, only if they cannot be derived reliably.
4. Target preflight, using the rules below. Do not ask the user to confirm target type, service state, safe ownership defaults, readiness basis, or cleanup responsibility when they can be derived reliably. Ask only when:
   - A stopped local service must be started for this run: collect its startup command and responsibility, then request one explicit startup authorization.
   - Resource ownership cannot be determined safely and would affect start, stop, or cleanup behavior.
   - No observable page-readiness basis can be derived from the test cases, target, or available page information.
5. Login mode: specified account, reuse current session, or no login.
6. For specified account: account, password retrieval method, and permission scope.
7. Execution mode: single agent or priority-based multi-agent.
8. Execution backend policy: default `agent-browser`, diagnostic Chrome DevTools CLI, final fallback Chrome DevTools MCP.
9. Runtime dependency check: run `scripts/check-deps.sh` when available, or manually check the same dependency layers when this skill is installed without repository scripts.
10. Playwright Test policy: generate regression script drafts only when the user requests script persistence or when P0/P1 failures need future regression.
11. High-risk action authorization: allow real submission, or verify only entry, display, validation, secondary confirmation, and messages.

At every turn, ask only for the earliest genuinely unresolved item in this order. Do not turn reliably inferred preflight details into confirmation gates or combine unrelated later questions into the same prompt.

## Target Preflight Rules

- Infer and record the target type, service state, ownership, readiness basis, and cleanup responsibility from read-only evidence before asking the user. Record whether each conclusion was inferred or user-confirmed.
- For static HTML, use the file or served address to classify the target, set service state and ownership to not applicable when no managed service is involved, derive an observable DOM or visual readiness basis, and record that no service cleanup is required.
- For a local dynamic application, use a read-only port or reachability probe to determine service state. Treat an already-running service as pre-existing and leave it running by default. If a stopped service must be started for this run, obtain the startup command and responsibility and one explicit authorization before starting it; record this run as the cleanup owner unless the user specifies another owner.
- For a remote test environment, use only read-only reachability checks and treat the service as externally owned. Never start, restart, stop, or otherwise manage the remote service; service cleanup is always out of scope.
- When ownership is ambiguous, choose the safe default of not managing the resource. Ask only if execution cannot proceed without resolving who may start, stop, or clean it up.
- Derive readiness from an observable state such as a stable heading or key control becoming visible, a loading indicator disappearing, or a required response completing. Do not accept elapsed time or `networkidle` alone. Ask only when no reliable condition can be identified from the available artifacts or target information.
- Stop only when the target cannot become ready within the inferred or confirmed ownership and authorization boundary. Do not bypass the gate with automatic service management.

## Runtime Dependency Rules

- The dependency check is detection-only. Do not install anything during the check.
- If basic dependencies are missing, stop and ask whether the user permits installation or environment setup.
- If Playwright is missing and scripts, video, or trace are required, show the suggested command and ask for explicit user confirmation before installing.
- If Chrome or Chromium is missing, ask whether to install Playwright Chromium or configure a local browser.
- Chrome DevTools CLI and Chrome DevTools MCP are optional diagnostic enhancements. Missing optional diagnostics do not block ordinary execution, but the final execution plan must record the limitation.
- Child agents must not install dependencies.

## Final Execution Plan

When all prerequisites are resolved through reliable inference or explicit confirmation, summarize:

- Module artifact directory.
- Test environment and path.
- Target type and the evidence used to infer it.
- Service state, ownership, and whether each conclusion was inferred or user-confirmed.
- Startup responsibility, command, and explicit authorization when required, or why startup is not applicable.
- Observable page-readiness basis and its source.
- Cleanup responsibility, safe defaults, and remote-service management boundary.
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
