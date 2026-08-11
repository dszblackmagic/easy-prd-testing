# Agent Protocol

## Execution Preflight Ownership

The main agent completes `execution-gate` and publishes the final execution plan before any priority agent opens a page.

- Infer target type, service state and ownership, observable readiness, and cleanup responsibility from read-only evidence before asking the user.
- Ask only when execution needs information that cannot be derived reliably or an action requires authorization.
- Leave an already-running local service running by default. A service started for this run requires explicit authorization and is owned by this run for cleanup unless the user states otherwise.
- Treat remote services as externally owned. No agent starts, restarts, stops, or cleans them up.
- Pass the resolved backend, readiness, observation, risk, and cleanup boundaries to every dispatched priority agent.

## Single-Agent Mode

The main agent executes priorities in this order:

```text
P0 -> P1 -> P2 -> P3
```

Each priority still writes to its own `执行结果/Px/` directory.

## Multi-Agent Mode

The first version only supports priority-based dispatch:

- Main agent: gates, final execution plan, dispatch, review, aggregation.
- P0 agent: executes only P0 and writes only `执行结果/P0/`.
- P1 agent: executes only P1 and writes only `执行结果/P1/`.
- P2 agent: executes only P2 and writes only `执行结果/P2/`.
- P3 agent: executes only P3 and writes only `执行结果/P3/`.

## Write Boundaries

- Child agents do not modify `01-04`.
- Child agents do not write root `05-执行记录.md` or root `06-缺陷记录.md`.
- Child agents do not modify another priority directory.
- Child agents record planning gaps as pending confirmation or blocker entries in their own priority `05-执行记录.md`.
- The main agent owns root summaries and decides whether a planning revision is required.

## First-Run Browser Loop

The default first-run backend remains `agent-browser` in both execution modes. For the first navigation to each page or key flow, and whenever a recheck reaches an unknown state, the assigned agent follows this sequence:

```text
enter -> readiness -> reconnaissance -> locator -> action -> assertion -> classification -> evidence -> cleanup
```

1. Enter the confirmed target and record the actual URL and redirects.
2. Wait for an observable, page-specific readiness condition or retrying assertion. `networkidle` is not mandatory and elapsed time alone is not a readiness signal.
3. Inspect the rendered DOM and visible state before acting; capture a reconnaissance screenshot when layout, overlays, canvas, or other visual state affects the action.
4. Prefer locators in this order: role and accessible name, label, stable test ID, stable visible text, then stable CSS. Record drift risk when a fragile locator is unavoidable.
5. Perform one meaningful action only after the target is actionable, then assert the user-visible result instead of treating a successful click as proof of success.
6. Classify the case as `通过`, `失败`, `阻塞`, `未测`, or `待确认`, preserving the distinction between a product mismatch and missing environment, account, permission, data, dependency, or evidence.
7. Preserve required evidence before cleanup, including the reason when an expected channel did not produce output.
8. Release only resources owned by this run and record the cleanup result.

## Runtime Observation And Cleanup

- Register supported Console, page-error, failed-request, key-response, URL, and redirect observation before the event that must be captured.
- Record Console, Network, screenshot, video, trace, HAR, or diagnostic evidence only when the tool actually produced it. Do not turn an unavailable or unused channel into a clean-result claim.
- Keep passing-case output concise. Preserve detailed evidence when required for a failure, field difference, blocker, or diagnosis.
- On failure or interruption, write evidence and Markdown references before closing run-owned pages, contexts, or priority-isolated sessions.
- Stop a temporary local service only when this run started it. Do not log out, clear storage, close a user-owned browser session, or stop a pre-existing or remote service.
- Escalate from `agent-browser` to Chrome DevTools CLI only when existing evidence is insufficient, and to Chrome DevTools MCP only when CLI diagnostics remain insufficient.

## Regression Mode

Regression execution is priority-owned and follows the same write boundary as first-run execution.

- P0 regression writes only under `执行结果/P0/`.
- P1 regression writes only under `执行结果/P1/`.
- P2 regression writes only under `执行结果/P2/`.
- P3 regression writes only under `执行结果/P3/`.
- Regression artifacts use `07-回归记录.md`, `08-回归缺陷状态.md`, and `regression-*` directories.
- Regression agents run Playwright Test first when scripts exist.
- Regression agents use `agent-browser` only when script output cannot classify the result.
- Regression agents do not start Chrome DevTools MCP by default.
