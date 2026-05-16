# Easy PRD Testing

[中文](README.md) | [English](README.en.md)

Easy PRD Testing is a Codex plugin for PRD / prototype-driven automation self-testing. It connects a module workflow from product material intake, requirement clarification, test planning, execution prerequisite confirmation, browser automation verification, evidence capture, result aggregation, and defect-fix regression verification.

## Use Cases

- You have a PRD, product specification, prototype image, or field baseline and want to generate test planning artifacts automatically.
- You want the workflow to confirm the test URL, account credentials, login mode, and execution scope before execution.
- You want task-list style progress during automation execution.
- You want P0-P3 priority-based multi-agent execution with consolidated defects and evidence.
- You want long-term regression coverage through Playwright Test scripts after defects are fixed.

## Installation

Use this repository as a complete Codex Plugin instead of copying a single skill. The complete plugin preserves parent orchestration, stage routing, artifact path contracts, and visible execution progress.

```bash
git clone git@github.com:dszblackmagic/easy-prd-testing.git
cd easy-prd-testing
scripts/validate-plugin.sh
```

Then reference this repository directory from your local Codex plugin configuration so Codex can read:

```text
.codex-plugin/plugin.json
skills/
```

If you only want to inspect one stage, read `skills/<skill-name>/SKILL.md` directly. For daily usage, start from the `easy-prd-testing` parent skill so the full workflow remains intact.

## Quick Start

In Codex, use a request like:

```text
Use easy-prd-testing to generate an automation test plan for the Order Management module from this PRD, and ask me step by step for the test environment, account, and execution scope before running tests.
```

You can provide:

- A PRD document path.
- Prototype images or screenshots.
- Product specification text.
- Existing test cases or field baselines.

The plugin first analyzes unclear parts in the material and asks clarification questions. It only proceeds to planning and execution preparation after the required information is confirmed.

## Full Usage Tutorial

### 1. Provide Product Material

Start with a PRD, prototype image, product specification, or existing testing material. `prd-intake` identifies module scope, key flows, fields, permissions, states, and exception scenarios, then turns unclear items into clarification questions.

### 2. Generate Test Planning Artifacts

`test-planning` first asks for the output root directory, then generates planning files under the fixed path:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

Planning artifacts include:

- `01-模块拆解.md`
- `02-测试用例.md`
- `03-执行清单.md`
- `04-测试数据与账号.md`

### 3. Confirm Execution Prerequisites

`execution-gate` confirms the following step by step:

- Test URL.
- Login mode.
- Whether account credentials are required.
- Test account and data preparation method.
- Execution scope and priority.
- Whether data mutation is allowed.
- Execution backend strategy.

Execution does not start when `01-04` files are missing, unconfirmed, or missing critical information.

### 4. Run Automation Execution

`test-execution` supports both single-agent execution and P0-P3 priority-based multi-agent execution. The full workflow shows task-list style progress so you can see completed stages and remaining work.

Browser automation defaults to a lighter execution method. Failed cases can escalate to Chrome DevTools CLI for diagnosis. Chrome DevTools MCP is reserved as the final fallback.

### 5. Aggregate Results

Execution results are written by priority:

```text
执行结果/P0/
执行结果/P1/
执行结果/P2/
执行结果/P3/
```

Each priority directory contains:

- `05-执行记录.md`
- `06-缺陷记录.md`
- `screenshots/`
- `videos/`
- `scripts/`

`result-aggregation` then creates root-level execution and defect summaries for overall pass rate, blockers, and defect distribution.

### 6. Run Regression Testing

After a defect is fixed, use `regression-testing` as a separate regression workflow. It runs existing Playwright Test scripts first. Only when script output is insufficient for classification does it escalate to `agent-browser`, and then to Chrome DevTools CLI or MCP when deeper diagnosis is required.

Regression artifacts are placed directly in the matching priority directory, at the same level as `05-执行记录.md` and `06-缺陷记录.md`:

```text
执行结果/P0/07-回归记录.md
执行结果/P0/08-回归缺陷状态.md
执行结果/P0/regression-screenshots/
执行结果/P0/regression-videos/
执行结果/P0/regression-traces/
执行结果/P0/regression-scripts/
```

## Built-In Skills

- `easy-prd-testing`: parent orchestration, stage routing, and task-list progress.
- `prd-intake`: PRD / prototype material analysis and clarification question generation.
- `test-planning`: planning artifact generation and output directory confirmation.
- `execution-gate`: pre-execution confirmation for URL, account, scope, and risk authorization.
- `test-execution`: page verification, evidence capture, and defect recording.
- `regression-testing`: script-first regression verification after defect fixes.
- `result-aggregation`: execution record, defect record, and regression status aggregation.

## Helper Scripts

Validate the plugin structure:

```bash
scripts/validate-plugin.sh
```

Create testing artifact directories:

```bash
scripts/scaffold-testing-docs.sh "/path/to/output-root" "订单管理"
```

Helper scripts only validate structure and create directories. They do not parse PRDs, open browsers, execute tests, or judge defects.

## Artifact Path Contract

All testing artifacts must live under:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

The fixed `easy-prd-testing` directory isolates this plugin's artifacts from the business project's own files.

## Documentation

- `docs/workflow.md`: complete stage flow, execution gates, and task-list rules.
- `docs/artifact-contract.md`: generated document, evidence directory, and regression artifact contracts.
- `docs/agent-protocol.md`: single-agent, multi-agent, browser execution, and diagnostic escalation rules.

## Contributing

Before committing, run:

```bash
scripts/validate-plugin.sh
bash -n scripts/validate-plugin.sh scripts/scaffold-testing-docs.sh
```

See `AGENTS.md` for contribution rules.

## License

MIT
