# Workflow

Easy PRD Testing runs as a gated workflow:

1. Collect PRD, prototype images, field baselines, or user-provided product notes.
2. Confirm the module name.
3. Confirm the output root directory.
4. Analyze source materials and ask clarification questions one at a time.
5. Generate `01-04` planning artifacts.
6. Offer the optional native XMind test-case view; export it only after user opt-in.
7. Wait for explicit user confirmation of the `01-04` planning artifacts.
8. Infer target and service preflight details from read-only evidence, then confirm only the earliest execution prerequisite that still needs user information or authorization.
9. Execute tests in single-agent mode or priority-based multi-agent mode, applying the first-run browser loop to each new page or key flow.
10. Aggregate execution records, defects, blockers, and evidence indexes.

Version maintenance is independent from this testing sequence. Route Easy PRD Testing update intent to `self-update`; never insert an update into an active execution, aggregation, or regression stage.

## Complete Skill-Suite Update

When the user asks to check or upgrade the Easy PRD Testing version:

1. Run the read-only updater check and show the current installation, target stable Release, and release highlights.
2. Ask once before changing files. Explain irreversible overwrite when a managed copy contains local modifications.
3. Keep dirty Git worktrees, symlink installations, incomplete copies, and incompatible update protocols unchanged.
4. Install only the exact version and SHA-256 digest the user confirmed.
5. Validate the Release in a temporary directory before switching the installation.
6. Leave the original installation in place when any pre-switch step fails; restore it when a switch-stage check fails.
7. After success, tell the user to reload the current AI tool's Skills or Plugin or start a new session.

Do not check for updates at tool startup or during ordinary testing work. Do not scan or update copies belonging to other AI tools.

## Optional XMind Export

`xmind-export` creates `02-测试用例.xmind` as a one-way derivative of the authoritative `02-测试用例.md`.

- Offer it after `01-04` generation and before final planning confirmation.
- Keep it optional and outside the execution gate.
- Accept standard or legacy Markdown tables from any directory without rewriting the source.
- Merge recognizable case tables, normalize legacy columns, and represent incomplete rows with warnings and `待补充` markers.
- Treat `01-模块拆解.md` and `F-xxx` coverage as optional enhancements rather than export gates.
- Update managed XMind output atomically; back up an unknown same-name file before replacement.
- Keep a skipped or failed export separate from valid `01-04` planning confirmation.

## Execution Preflight

After the user explicitly confirms `01-04`, `execution-gate` resolves the target and service lifecycle before browser execution:

1. Infer the target type, service state and ownership, observable readiness basis, and cleanup responsibility from the input path or URL, existing execution plan, planning artifacts, and read-only reachability or port probes.
2. Ask only when required information cannot be derived reliably or an action needs authorization. Starting a stopped local service requires its command, responsibility, and one explicit authorization.
3. Treat an already-running local service as pre-existing and leave it running by default. Treat a remote environment as externally owned and never start, restart, stop, or otherwise manage its service.
4. Complete the remaining login, account, execution-mode, dependency, regression-script, and high-risk authorization gates in order, asking only for the earliest unresolved item.
5. Record all inferred and user-confirmed conclusions in the final execution plan before dispatching any priority.

## First-Run Browser Execution

`test-execution` keeps `agent-browser` as the default first-run backend. For every new page or key flow, and for any recheck that reaches an unknown page state, execute this loop:

```text
enter -> readiness -> reconnaissance -> locator -> action -> assertion -> classification -> evidence -> cleanup
```

- Use an observable product condition or retrying assertion for readiness, such as a stable heading, enabled control, rendered data, completed key response, or disappeared loading indicator. Do not require `networkidle` or treat elapsed time alone as proof of readiness.
- Inspect the rendered state before acting, choose the most stable available locator, and avoid blind retries that could duplicate a side effect.
- Enable Console, page-error, Network, redirect, video, trace, or HAR observation only when the confirmed backend supports and needs it. Record only output that the tool actually produced; missing output is an evidence gap, not proof that no error occurred.
- Preserve failure or blocker evidence before cleanup. Close only pages, sessions, or temporary services owned by this run, and never stop an existing local or remote service.
- In multi-agent mode, keep priority-isolated browser sessions and existing write boundaries. Diagnostic escalation remains `agent-browser` to Chrome DevTools CLI, then Chrome DevTools MCP only when the preceding evidence is insufficient.

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
- Planning artifacts generated: offer the optional XMind view, then stop until the user explicitly confirms `01-04`.
- Missing or warning-heavy XMind: do not weaken or block the `01-04` confirmation gate.
- Missing execution prerequisite: first attempt safe read-only inference, then ask only the earliest prerequisite that genuinely requires user information or authorization.
- High-risk action without authorization: verify only entry, display, validation, secondary confirmation, and messages.
