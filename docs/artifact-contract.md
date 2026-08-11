# Artifact Contract

All generated module artifacts use this path:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

## Planning Artifacts

```text
01-模块拆解.md
02-测试用例.md
03-执行清单.md
04-测试数据与账号.md
```

Rules:

- Feature IDs use `F-xxx`.
- Test case IDs use `<module-code>-P<priority>-NNN`.
- Each test case links back to at least one `F-xxx` defined in `01-模块拆解.md`.
- Each field baseline records its source: PRD, prototype, or user supplement.
- Fields inferred only from prototypes are marked as pending user confirmation.

## Optional Derived Planning Artifact

```text
02-测试用例.xmind
```

Rules:

- Generate it only after the user opts in.
- Treat `02-测试用例.md` as the only authoritative source; XMind edits do not flow back.
- Keep it beside its Markdown source and use modern XMind Zen / 2020+ format. Standalone export may use a source outside the standard planning artifact path.
- Accept canonical or legacy Markdown tables, merge multiple case tables, and keep normalization in XMind without rewriting Markdown.
- Treat `01-模块拆解.md` and `F-xxx` coverage as optional; report missing or unknown references as warnings.
- Preserve all four `P0`-`P3` branches, including zero-count priorities, and add `未分级` when priority cannot be inferred.
- Represent missing row data with generated IDs, `待补充` values, and warnings rather than failing the whole export.
- Record the source Markdown SHA-256 in root notes, update managed output atomically, and back up unknown same-name files.
- Validate the generated archive before replacement and never make this artifact part of the `01-04` execution gate.

## Execution Artifacts

```text
执行结果/P0/05-执行记录.md
执行结果/P0/06-缺陷记录.md
执行结果/P0/screenshots/
执行结果/P0/videos/
执行结果/P0/scripts/
```

The same structure exists for `P1`, `P2`, and `P3`.

Root summary files:

```text
05-执行记录.md
06-缺陷记录.md
```

Rules:

- Priority records use exactly five first-run statuses: `通过`, `失败`, `阻塞`, `未测`, and `待确认`. Root totals must equal the sum of these statuses; blank or unknown values require correction rather than implicit mapping.
- Each priority execution batch records application type, service status and ownership, default page-readiness basis, observation capabilities, and browser session/temporary-service cleanup strategy. Per-case records preserve the actual page-readiness basis, locator type, Console/Network observation, evidence paths, and cleanup outcome.
- Passing cases need an actual result summary and do not require screenshots or diagnostic artifacts.
- Field differences require screenshots.
- Operation failures require screenshots when feasible. Console, Network, video, Trace, and HAR are recorded only when the execution tool actually produced them; otherwise record `未产生（原因）` and do not infer a clean observation from missing material.
- Actual result summaries and diagnostic evidence are separate: a result describes what happened, while evidence records only captured output. Failure evidence and the reason for unavailable evidence must remain visible in the priority record and root summary.
- Priority agents write only under their assigned `执行结果/Px/` directory. The main agent alone aggregates those records into root `05-执行记录.md` and `06-缺陷记录.md`, preserving priority-owned relative evidence paths.
- Blockers are not defects unless the user confirms they are product or implementation issues.

## Regression Artifacts

Regression artifacts are priority-owned and stay flat under the same priority directory:

```text
执行结果/P0/07-回归记录.md
执行结果/P0/08-回归缺陷状态.md
执行结果/P0/regression-screenshots/
执行结果/P0/regression-videos/
执行结果/P0/regression-traces/
执行结果/P0/regression-scripts/
```

Rules:

- `07-回归记录.md` records script-first regression execution.
- `08-回归缺陷状态.md` records fixed, unfixed, blocked, script-drift, and unclear statuses.
- `regression-traces/` stores Playwright trace zip files, DevTools trace files, HAR files, and short trace summaries.
- Do not copy full trace or HAR content into Markdown records.
- Do not mix first-run `screenshots/`, `videos/`, and `scripts/` with regression evidence.
