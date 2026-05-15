# Easy PRD Testing

Easy PRD Testing is a Codex plugin for PRD/prototype-driven automation self-testing.

It guides a module from product material intake to test planning, execution prerequisite confirmation, browser-based verification, evidence capture, and final result aggregation.

## What It Provides

- PRD or prototype intake with clarification questions.
- Planning artifacts: `01-模块拆解.md`, `02-测试用例.md`, `03-执行清单.md`, `04-测试数据与账号.md`.
- Execution gates for environment URL, test path, login mode, account handling, execution mode, and risk authorization.
- Single-agent execution or priority-based multi-agent execution.
- Execution artifacts: priority-level `05-执行记录.md` and `06-缺陷记录.md`, plus root summary files.
- Visible task-list progress during the full workflow.
- Lightweight scripts for plugin validation and testing artifact scaffolding.

## Artifact Path

During `test-planning`, the user must confirm an output root directory. All generated testing artifacts live under:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

The fixed `easy-prd-testing` directory keeps this plugin's artifacts separate from other project files.

## Skills

- `easy-prd-testing`: parent orchestration and task-list progress.
- `prd-intake`: PRD/prototype analysis and clarification.
- `test-planning`: planning documents and output directory gate.
- `execution-gate`: execution prerequisite confirmation.
- `test-execution`: page verification and evidence capture.
- `result-aggregation`: root execution and defect summaries.

## Helper Scripts

Validate the plugin:

```bash
scripts/validate-plugin.sh
```

Create testing artifact directories:

```bash
scripts/scaffold-testing-docs.sh "/path/to/output-root" "订单管理"
```

The scripts do not parse PRDs, design tests, open browsers, install dependencies, or judge defects.

## Documentation

- `docs/workflow.md`: staged workflow, gates, and task-list rules.
- `docs/artifact-contract.md`: generated document and evidence contract.
- `docs/agent-protocol.md`: single-agent and multi-agent execution rules.
