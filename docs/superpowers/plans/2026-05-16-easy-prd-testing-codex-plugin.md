# Easy PRD Testing Codex Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild this repository as a Codex plugin for PRD/prototype-driven automation testing with staged intake, planning, execution gates, priority-based multi-agent execution, result aggregation, visible task-list progress, and lightweight helper scripts.

**Architecture:** The plugin uses `.codex-plugin/plugin.json` as the entry point and `skills/` as the skill root. `skills/easy-prd-testing` orchestrates the workflow, while five focused child skills own intake, planning, execution gate confirmation, browser execution, and result aggregation. Shell scripts only validate plugin structure and scaffold testing artifact directories under `<output-root>/easy-prd-testing/testing/<module-name>/`.

**Tech Stack:** Codex plugin metadata, Codex `SKILL.md` files, Markdown templates and docs, POSIX shell scripts, `python3 -m json.tool` for JSON validation.

---

## File Structure

Create or modify these files:

- Create: `.codex-plugin/plugin.json` — Codex plugin metadata pointing to `./skills/`.
- Create: `skills/easy-prd-testing/SKILL.md` — parent orchestration skill and visible task-list workflow.
- Create: `skills/prd-intake/SKILL.md` — PRD/prototype intake and clarification skill.
- Create: `skills/prd-intake/templates/00-资料分析与待确认问题.md` — intake findings template.
- Create: `skills/test-planning/SKILL.md` — planning skill that asks for output root and generates `01-04`.
- Create: `skills/test-planning/templates/01-模块拆解.md`
- Create: `skills/test-planning/templates/02-测试用例.md`
- Create: `skills/test-planning/templates/03-执行清单.md`
- Create: `skills/test-planning/templates/04-测试数据与账号.md`
- Create: `skills/execution-gate/SKILL.md` — execution prerequisite confirmation skill.
- Create: `skills/execution-gate/templates/执行前确认.md`
- Create: `skills/test-execution/SKILL.md` — browser execution and evidence skill.
- Create: `skills/test-execution/templates/执行结果/优先级/05-执行记录.md`
- Create: `skills/test-execution/templates/执行结果/优先级/06-缺陷记录.md`
- Create: `skills/result-aggregation/SKILL.md` — root summary generation skill.
- Create: `skills/result-aggregation/templates/05-执行记录.md`
- Create: `skills/result-aggregation/templates/06-缺陷记录.md`
- Create: `scripts/validate-plugin.sh` — plugin structure validator.
- Create: `scripts/scaffold-testing-docs.sh` — artifact directory scaffolder.
- Modify: `README.md` — plugin overview, install/use flow, commands.
- Create: `docs/workflow.md` — staged workflow, gates, and task-list rules.
- Create: `docs/artifact-contract.md` — `00-06` artifact contract and path rules.
- Create: `docs/agent-protocol.md` — single-agent and multi-agent execution protocol.
- Delete after migration: root `SKILL.md`, `agents/openai.yaml`, `prd-test-planning/`, `prd-test-execution/`.

Do not modify the approved design spec except to fix a conflict discovered during implementation.

---

### Task 1: Add Codex Plugin Metadata And Public Docs

**Files:**
- Create: `.codex-plugin/plugin.json`
- Modify: `README.md`
- Create: `docs/workflow.md`
- Create: `docs/artifact-contract.md`
- Create: `docs/agent-protocol.md`

- [ ] **Step 1: Verify plugin metadata is absent**

Run:

```bash
test ! -f .codex-plugin/plugin.json
```

Expected: command exits with status `0`.

- [ ] **Step 2: Add plugin metadata**

Create `.codex-plugin/plugin.json` with this content:

```json
{
  "name": "easy-prd-testing",
  "version": "0.1.0",
  "description": "PRD and prototype driven automation self-testing workflow for Codex.",
  "license": "MIT",
  "keywords": [
    "prd",
    "testing",
    "automation",
    "codex",
    "playwright",
    "skills"
  ],
  "skills": "./skills/",
  "interface": {
    "displayName": "Easy PRD Testing",
    "shortDescription": "Plan and execute PRD based automation tests with gates, evidence, and aggregation.",
    "category": "Testing",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "defaultPrompt": "Use PRD documents, prototype images, or confirmed testing artifacts to run the Easy PRD Testing workflow. Start with clarification, generate 01-04 planning documents, require explicit confirmation, confirm execution prerequisites step by step, then execute and aggregate evidence."
  }
}
```

- [ ] **Step 3: Validate JSON parsing**

Run:

```bash
python3 -m json.tool .codex-plugin/plugin.json >/dev/null
```

Expected: command exits with status `0`.

- [ ] **Step 4: Replace README content**

Write `README.md` with:

```markdown
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
```

- [ ] **Step 5: Add workflow documentation**

Create `docs/workflow.md` with:

```markdown
# Workflow

Easy PRD Testing runs as a gated workflow:

1. Collect PRD, prototype images, field baselines, or user-provided product notes.
2. Confirm the module name.
3. Confirm the output root directory.
4. Analyze source materials and ask clarification questions one at a time.
5. Generate `01-04` planning artifacts.
6. Wait for explicit user confirmation of the planning artifacts.
7. Confirm execution prerequisites one item at a time.
8. Execute tests in single-agent mode or priority-based multi-agent mode.
9. Aggregate execution records, defects, blockers, and evidence indexes.

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
- Planning artifacts generated: stop until the user explicitly confirms them.
- Missing execution prerequisite: ask only the earliest missing prerequisite.
- High-risk action without authorization: verify only entry, display, validation, secondary confirmation, and messages.
```

- [ ] **Step 6: Add artifact contract documentation**

Create `docs/artifact-contract.md` with:

```markdown
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
- Each test case links back to a feature ID.
- Each field baseline records its source: PRD, prototype, or user supplement.
- Fields inferred only from prototypes are marked as pending user confirmation.

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

- Passing cases need an actual result summary and do not require screenshots.
- Field differences require screenshots.
- Operation failures require screenshots, Console summary, Network summary, and Playwright video when available.
- Blockers are not defects unless the user confirms they are product or implementation issues.
```

- [ ] **Step 7: Add agent protocol documentation**

Create `docs/agent-protocol.md` with:

```markdown
# Agent Protocol

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
```

- [ ] **Step 8: Commit documentation and metadata**

Run:

```bash
git add .codex-plugin/plugin.json README.md docs/workflow.md docs/artifact-contract.md docs/agent-protocol.md
git commit -m "feat: add codex plugin metadata and docs"
```

Expected: commit succeeds.

---

### Task 2: Add Orchestration And Child Skills

**Files:**
- Create: `skills/easy-prd-testing/SKILL.md`
- Create: `skills/prd-intake/SKILL.md`
- Create: `skills/test-planning/SKILL.md`
- Create: `skills/execution-gate/SKILL.md`
- Create: `skills/test-execution/SKILL.md`
- Create: `skills/result-aggregation/SKILL.md`

- [ ] **Step 1: Verify skill directories are absent**

Run:

```bash
test ! -d skills/easy-prd-testing && test ! -d skills/prd-intake && test ! -d skills/test-planning && test ! -d skills/execution-gate && test ! -d skills/test-execution && test ! -d skills/result-aggregation
```

Expected: command exits with status `0`.

- [ ] **Step 2: Create parent orchestration skill**

Create `skills/easy-prd-testing/SKILL.md` with:

```markdown
---
name: easy-prd-testing
description: Use when PRD or prototype based module self-testing needs a complete Codex workflow for intake, clarification, planning documents, execution gates, priority-based execution, evidence, and aggregation.
---

# Easy PRD Testing

## Role

This is the parent entry point for the Easy PRD Testing plugin. It determines the current workflow stage and routes the work to the correct child skill.

## Stage Routing

- Source material analysis or unclear PRD/prototype input: use `prd-intake`.
- Planning artifact generation or updates: use `test-planning`.
- Execution prerequisite confirmation: use `execution-gate`.
- Browser verification, field comparison, evidence capture, or priority execution: use `test-execution`.
- Root execution or defect summary generation: use `result-aggregation`.

## Hard Gates

1. Do not generate planning artifacts without PRD, prototype, field baseline, or user-provided product notes.
2. Do not create a module artifact directory before the module name is known.
3. Do not create testing artifacts before the output root directory is confirmed.
4. Do not enter execution gates until `01-04` planning artifacts exist and the user explicitly confirms them.
5. Do not execute pages until environment address, test path, login mode, account handling, execution mode, and high-risk authorization are confirmed.
6. Do not let child agents write outside their assigned priority directory.

## Visible Task List

During a full workflow, maintain a user-visible task list.

Allowed statuses:

- `pending`: not started.
- `in_progress`: current active step.
- `blocked`: waiting for one user input, environment, account, permission, test data, or dependency.
- `completed`: actually completed.
- `skipped`: explicitly skipped by the user for this run.

Default tasks:

1. Collect PRD, prototype, field baseline, or product notes.
2. Confirm module name.
3. Confirm output root directory.
4. Analyze materials and collect clarification questions.
5. Generate `01-04` planning artifacts.
6. Wait for explicit user confirmation of `01-04`.
7. Confirm environment address and test path.
8. Confirm login mode, account, password retrieval, and permission scope.
9. Confirm execution mode and high-risk action authorization.
10. Execute P0/P1/P2/P3 cases.
11. Aggregate execution and defect records.
12. Report final conclusion and evidence index.

Update the task list whenever a stage starts, completes, becomes blocked, resumes, or is skipped. A task must not be marked `completed` until the related user confirmation, generated artifact, execution result, or summary exists.

## Output Path Contract

All generated module artifacts live under:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

The `easy-prd-testing` directory name is fixed.

## Stop Conditions

Stop and ask the user when the earliest required input is missing. Ask only for that one input. Record later information if the user volunteered it, but continue from the earliest missing gate.
```

- [ ] **Step 3: Create PRD intake skill**

Create `skills/prd-intake/SKILL.md` with:

```markdown
---
name: prd-intake
description: Use when the user provides PRD documents, prototype images, field baselines, or product notes that need analysis and clarification before test planning.
---

# PRD Intake

## Goal

Convert PRD, prototype, field baseline, or product notes into a clarified source understanding for test planning.

## Input Gate

At least one of these inputs is required:

- PRD document.
- Prototype image or prototype link.
- Field baseline.
- User-provided product notes.

If none is available, ask for the source material and stop.

If the module name is missing, ask for the module name and do not create directories.

## Analysis Rules

Extract:

- Module boundary.
- Dependent modules.
- External jumps.
- Feature points.
- Query fields.
- List fields.
- Detail fields.
- Buttons.
- Dialog fields.
- Permission requirements.
- High-risk actions.
- Test data assumptions.

Mark each extracted item with its source: `PRD`, `prototype`, `field baseline`, or `user supplement`.

When PRD and prototype conflict, treat the PRD as the default source and list the conflict as pending confirmation.

Anything inferred only from a prototype must be marked as pending user confirmation.

## Clarification Rules

Ask one clarification question at a time. Do not combine unrelated missing information in one message.

Prefer asking about the earliest blocker:

1. Module name.
2. Module boundary.
3. Field meaning or missing field source.
4. Permission or role requirement.
5. High-risk action behavior.
6. Test data assumption.

## Output

When enough information exists for planning, produce a concise intake summary and, if useful, create `00-资料分析与待确认问题.md` under the confirmed module artifact directory.

Do not generate `01-04`; that belongs to `test-planning`.
```

- [ ] **Step 4: Create test planning skill**

Create `skills/test-planning/SKILL.md` with:

```markdown
---
name: test-planning
description: Use after PRD/prototype intake when generating or updating module testing planning artifacts 01-04 before any browser execution.
---

# Test Planning

## Goal

Generate executable automation self-testing planning artifacts from confirmed PRD/prototype understanding.

## Required Inputs

- Module name.
- PRD/prototype/field baseline/product notes, or an intake summary from `prd-intake`.
- Output root directory confirmed by the user.

## Output Directory Gate

Before creating files, ask where automation testing results and planning artifacts should be written.

All files must be placed under:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

Do not default to the repository `docs/` directory unless the user explicitly chooses it as the output root.

## Generated Artifacts

Create or update:

- `01-模块拆解.md`
- `02-测试用例.md`
- `03-执行清单.md`
- `04-测试数据与账号.md`

## Planning Rules

- Feature IDs use `F-xxx`.
- Test cases link to feature IDs.
- Test case IDs use `<module-code>-P<priority>-NNN`.
- Priorities are `P0`, `P1`, `P2`, and `P3`.
- Each case records its execution directory: `执行结果/P0/`, `执行结果/P1/`, `执行结果/P2/`, or `执行结果/P3/`.
- Field baselines record their source.
- Prototype-only fields are marked pending user confirmation.

## Stop Condition

After generating `01-04`, stop and ask the user to explicitly confirm the planning artifacts. Do not enter execution gates automatically.
```

- [ ] **Step 5: Create execution gate skill**

Create `skills/execution-gate/SKILL.md` with:

```markdown
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
```

- [ ] **Step 6: Create test execution skill**

Create `skills/test-execution/SKILL.md` with:

```markdown
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
```

- [ ] **Step 7: Create result aggregation skill**

Create `skills/result-aggregation/SKILL.md` with:

```markdown
---
name: result-aggregation
description: Use after priority execution records exist and root execution and defect summaries need to be generated or updated.
---

# Result Aggregation

## Goal

Aggregate priority execution records and defect records into root summary files.

## Inputs

Read from:

```text
执行结果/P0/
执行结果/P1/
执行结果/P2/
执行结果/P3/
```

## Outputs

Generate or update at the module artifact root:

- `05-执行记录.md`
- `06-缺陷记录.md`

## Rules

- Root summaries are owned by the main agent.
- Read priority-level `05-执行记录.md` and `06-缺陷记录.md`.
- Summarize total, passed, failed, blocked, untested, and pending-confirmation cases.
- Preserve evidence paths.
- Mark child-agent write boundary violations.
- Do not convert blockers into defects without user confirmation.
```

- [ ] **Step 8: Verify all skill files exist**

Run:

```bash
for f in \
  skills/easy-prd-testing/SKILL.md \
  skills/prd-intake/SKILL.md \
  skills/test-planning/SKILL.md \
  skills/execution-gate/SKILL.md \
  skills/test-execution/SKILL.md \
  skills/result-aggregation/SKILL.md
do
  test -f "$f" || exit 1
done
```

Expected: command exits with status `0`.

- [ ] **Step 9: Commit skills**

Run:

```bash
git add skills
git commit -m "feat: add staged prd testing skills"
```

Expected: commit succeeds.

---

### Task 3: Add Stage Templates

**Files:**
- Create: `skills/prd-intake/templates/00-资料分析与待确认问题.md`
- Create: `skills/test-planning/templates/01-模块拆解.md`
- Create: `skills/test-planning/templates/02-测试用例.md`
- Create: `skills/test-planning/templates/03-执行清单.md`
- Create: `skills/test-planning/templates/04-测试数据与账号.md`
- Create: `skills/execution-gate/templates/执行前确认.md`
- Create: `skills/test-execution/templates/执行结果/优先级/05-执行记录.md`
- Create: `skills/test-execution/templates/执行结果/优先级/06-缺陷记录.md`
- Create: `skills/result-aggregation/templates/05-执行记录.md`
- Create: `skills/result-aggregation/templates/06-缺陷记录.md`

- [ ] **Step 1: Create intake template**

Create `skills/prd-intake/templates/00-资料分析与待确认问题.md`:

```markdown
# 资料分析与待确认问题

## 1. 来源资料

| 类型 | 路径或说明 | 备注 |
| --- | --- | --- |
| PRD |  |  |
| 原型图 |  |  |
| 字段基线 |  |  |
| 用户补充 |  |  |

## 2. 已识别模块信息

| 项目 | 内容 | 来源 |
| --- | --- | --- |
| 模块名称 |  |  |
| 模块边界 |  |  |
| 依赖模块 |  |  |
| 外部跳转 |  |  |
| 权限来源 |  |  |

## 3. 待确认问题

| 编号 | 问题 | 影响范围 | 当前处理状态 |
| --- | --- | --- | --- |
| Q-001 |  |  | 待用户确认 |
```

- [ ] **Step 2: Migrate planning templates**

Copy the existing planning templates into the new template directory:

```bash
mkdir -p skills/test-planning/templates
cp prd-test-planning/templates/01-模块拆解.md skills/test-planning/templates/01-模块拆解.md
cp prd-test-planning/templates/02-测试用例.md skills/test-planning/templates/02-测试用例.md
cp prd-test-planning/templates/03-执行清单.md skills/test-planning/templates/03-执行清单.md
cp prd-test-planning/templates/04-测试数据与账号.md skills/test-planning/templates/04-测试数据与账号.md
```

Expected: copied files exist under `skills/test-planning/templates/`.

- [ ] **Step 3: Update planning templates for output root**

In `skills/test-planning/templates/03-执行清单.md`, ensure the confirmation gate includes this row:

```markdown
| 输出根目录确认 | 用户确认自动化测试结果和规划资料写入哪个输出根目录 |  |
```

Also ensure the document states:

```markdown
所有测试产物统一写入 `<输出根目录>/easy-prd-testing/testing/<模块名>/`。
```

- [ ] **Step 4: Create execution gate template**

Create `skills/execution-gate/templates/执行前确认.md`:

```markdown
# 执行前确认

| 确认项 | 结论 | 说明 |
| --- | --- | --- |
| `01-04` 已定位且可读取 | 是 / 否 | 默认用户已确认规划资料 |
| 测试环境地址 |  |  |
| 测试路径 |  | 菜单路径或 URL |
| 登录方式 | 指定账号 / 复用当前登录态 / 无需登录 |  |
| 账号 |  | 指定账号时填写 |
| 密码获取方式 |  | 指定账号时填写 |
| 权限范围 |  | 指定账号时填写 |
| 执行模式 | 单 agent / 多 agent |  |
| 高风险动作授权 | 允许真实提交 / 仅验证入口、展示、校验、二次确认和提示 |  |
```

- [ ] **Step 5: Migrate priority execution templates**

Copy existing priority execution templates:

```bash
mkdir -p skills/test-execution/templates/执行结果/优先级
cp prd-test-execution/templates/执行结果/优先级/05-执行记录.md skills/test-execution/templates/执行结果/优先级/05-执行记录.md
cp prd-test-execution/templates/执行结果/优先级/06-缺陷记录.md skills/test-execution/templates/执行结果/优先级/06-缺陷记录.md
```

Expected: copied files exist under `skills/test-execution/templates/执行结果/优先级/`.

- [ ] **Step 6: Migrate root aggregation templates**

Copy existing root execution templates:

```bash
mkdir -p skills/result-aggregation/templates
cp prd-test-execution/templates/05-执行记录.md skills/result-aggregation/templates/05-执行记录.md
cp prd-test-execution/templates/06-缺陷记录.md skills/result-aggregation/templates/06-缺陷记录.md
```

Expected: copied files exist under `skills/result-aggregation/templates/`.

- [ ] **Step 7: Verify templates**

Run:

```bash
for f in \
  skills/prd-intake/templates/00-资料分析与待确认问题.md \
  skills/test-planning/templates/01-模块拆解.md \
  skills/test-planning/templates/02-测试用例.md \
  skills/test-planning/templates/03-执行清单.md \
  skills/test-planning/templates/04-测试数据与账号.md \
  skills/execution-gate/templates/执行前确认.md \
  skills/test-execution/templates/执行结果/优先级/05-执行记录.md \
  skills/test-execution/templates/执行结果/优先级/06-缺陷记录.md \
  skills/result-aggregation/templates/05-执行记录.md \
  skills/result-aggregation/templates/06-缺陷记录.md
do
  test -f "$f" || exit 1
done
rg -n "输出根目录|easy-prd-testing/testing" skills/test-planning/templates/03-执行清单.md
```

Expected: file loop exits with status `0`; `rg` prints both output-root references.

- [ ] **Step 8: Commit templates**

Run:

```bash
git add skills/*/templates
git commit -m "feat: add prd testing artifact templates"
```

Expected: commit succeeds.

---

### Task 4: Add Validation Script

**Files:**
- Create: `scripts/validate-plugin.sh`

- [ ] **Step 1: Verify validation script is absent**

Run:

```bash
test ! -f scripts/validate-plugin.sh
```

Expected: command exits with status `0`.

- [ ] **Step 2: Create validation script**

Create `scripts/validate-plugin.sh`:

```bash
#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILED=0

pass() {
  printf '[PASS] %s\n' "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1"
  FAILED=1
}

check_file() {
  local path="$1"
  if [ -f "$ROOT_DIR/$path" ]; then
    pass "$path exists"
  else
    fail "$path exists"
  fi
}

check_dir() {
  local path="$1"
  if [ -d "$ROOT_DIR/$path" ]; then
    pass "$path exists"
  else
    fail "$path exists"
  fi
}

check_file ".codex-plugin/plugin.json"

if python3 -m json.tool "$ROOT_DIR/.codex-plugin/plugin.json" >/dev/null 2>&1; then
  pass ".codex-plugin/plugin.json parses as JSON"
else
  fail ".codex-plugin/plugin.json parses as JSON"
fi

if python3 - "$ROOT_DIR/.codex-plugin/plugin.json" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    data = json.load(fh)
sys.exit(0 if data.get("skills") == "./skills/" else 1)
PY
then
  pass "plugin skills path is ./skills/"
else
  fail "plugin skills path is ./skills/"
fi

for dir in \
  skills/easy-prd-testing \
  skills/prd-intake \
  skills/test-planning \
  skills/execution-gate \
  skills/test-execution \
  skills/result-aggregation
do
  check_dir "$dir"
  check_file "$dir/SKILL.md"
done

for file in \
  skills/prd-intake/templates/00-资料分析与待确认问题.md \
  skills/test-planning/templates/01-模块拆解.md \
  skills/test-planning/templates/02-测试用例.md \
  skills/test-planning/templates/03-执行清单.md \
  skills/test-planning/templates/04-测试数据与账号.md \
  skills/execution-gate/templates/执行前确认.md \
  skills/test-execution/templates/执行结果/优先级/05-执行记录.md \
  skills/test-execution/templates/执行结果/优先级/06-缺陷记录.md \
  skills/result-aggregation/templates/05-执行记录.md \
  skills/result-aggregation/templates/06-缺陷记录.md
do
  check_file "$file"
done

for file in \
  README.md \
  docs/workflow.md \
  docs/artifact-contract.md \
  docs/agent-protocol.md
do
  check_file "$file"
done

if [ "$FAILED" -eq 0 ]; then
  printf 'Plugin validation passed.\n'
else
  printf 'Plugin validation failed.\n'
fi

exit "$FAILED"
```

- [ ] **Step 3: Make validation script executable**

Run:

```bash
chmod +x scripts/validate-plugin.sh
```

Expected: command exits with status `0`.

- [ ] **Step 4: Run validation script**

Run:

```bash
scripts/validate-plugin.sh
```

Expected: output includes `Plugin validation passed.` and command exits with status `0`.

- [ ] **Step 5: Commit validation script**

Run:

```bash
git add scripts/validate-plugin.sh
git commit -m "feat: add plugin validation script"
```

Expected: commit succeeds.

---

### Task 5: Add Scaffold Script

**Files:**
- Create: `scripts/scaffold-testing-docs.sh`

- [ ] **Step 1: Verify scaffold script is absent**

Run:

```bash
test ! -f scripts/scaffold-testing-docs.sh
```

Expected: command exits with status `0`.

- [ ] **Step 2: Create scaffold script**

Create `scripts/scaffold-testing-docs.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  printf 'Usage: %s <output-root> <module-name>\n' "$0" >&2
  exit 64
fi

OUTPUT_ROOT="$1"
MODULE_NAME="$2"

if [ -z "$OUTPUT_ROOT" ] || [ -z "$MODULE_NAME" ]; then
  printf 'Both <output-root> and <module-name> are required.\n' >&2
  exit 64
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$OUTPUT_ROOT/easy-prd-testing/testing/$MODULE_NAME"

copy_if_missing() {
  local src="$1"
  local dest="$2"

  if [ -f "$dest" ]; then
    printf '[SKIP] %s already exists\n' "$dest"
    return
  fi

  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  printf '[CREATE] %s\n' "$dest"
}

mkdir -p "$TARGET_DIR"

copy_if_missing "$ROOT_DIR/skills/prd-intake/templates/00-资料分析与待确认问题.md" "$TARGET_DIR/00-资料分析与待确认问题.md"
copy_if_missing "$ROOT_DIR/skills/test-planning/templates/01-模块拆解.md" "$TARGET_DIR/01-模块拆解.md"
copy_if_missing "$ROOT_DIR/skills/test-planning/templates/02-测试用例.md" "$TARGET_DIR/02-测试用例.md"
copy_if_missing "$ROOT_DIR/skills/test-planning/templates/03-执行清单.md" "$TARGET_DIR/03-执行清单.md"
copy_if_missing "$ROOT_DIR/skills/test-planning/templates/04-测试数据与账号.md" "$TARGET_DIR/04-测试数据与账号.md"

for priority in P0 P1 P2 P3; do
  PRIORITY_DIR="$TARGET_DIR/执行结果/$priority"
  mkdir -p "$PRIORITY_DIR/screenshots" "$PRIORITY_DIR/videos" "$PRIORITY_DIR/scripts"
  copy_if_missing "$ROOT_DIR/skills/test-execution/templates/执行结果/优先级/05-执行记录.md" "$PRIORITY_DIR/05-执行记录.md"
  copy_if_missing "$ROOT_DIR/skills/test-execution/templates/执行结果/优先级/06-缺陷记录.md" "$PRIORITY_DIR/06-缺陷记录.md"
done

copy_if_missing "$ROOT_DIR/skills/result-aggregation/templates/05-执行记录.md" "$TARGET_DIR/05-执行记录.md"
copy_if_missing "$ROOT_DIR/skills/result-aggregation/templates/06-缺陷记录.md" "$TARGET_DIR/06-缺陷记录.md"

printf 'Scaffold complete: %s\n' "$TARGET_DIR"
```

- [ ] **Step 3: Make scaffold script executable**

Run:

```bash
chmod +x scripts/scaffold-testing-docs.sh
```

Expected: command exits with status `0`.

- [ ] **Step 4: Verify missing argument handling**

Run:

```bash
scripts/scaffold-testing-docs.sh
```

Expected: command exits with status `64` and prints `Usage:`.

- [ ] **Step 5: Verify scaffold generation**

Run:

```bash
TMP_DIR="$(mktemp -d)"
scripts/scaffold-testing-docs.sh "$TMP_DIR" "示例模块"
test -f "$TMP_DIR/easy-prd-testing/testing/示例模块/01-模块拆解.md"
test -f "$TMP_DIR/easy-prd-testing/testing/示例模块/执行结果/P0/05-执行记录.md"
test -d "$TMP_DIR/easy-prd-testing/testing/示例模块/执行结果/P3/screenshots"
```

Expected: all commands exit with status `0`.

- [ ] **Step 6: Verify no overwrite behavior**

Run:

```bash
TMP_DIR="$(mktemp -d)"
scripts/scaffold-testing-docs.sh "$TMP_DIR" "示例模块" >/dev/null
printf 'custom marker\n' > "$TMP_DIR/easy-prd-testing/testing/示例模块/01-模块拆解.md"
scripts/scaffold-testing-docs.sh "$TMP_DIR" "示例模块" >/tmp/easy-prd-testing-scaffold.log
rg -n "\\[SKIP\\].*01-模块拆解.md" /tmp/easy-prd-testing-scaffold.log
rg -n "custom marker" "$TMP_DIR/easy-prd-testing/testing/示例模块/01-模块拆解.md"
```

Expected: both `rg` commands find matching lines.

- [ ] **Step 7: Commit scaffold script**

Run:

```bash
git add scripts/scaffold-testing-docs.sh
git commit -m "feat: add testing artifact scaffold script"
```

Expected: commit succeeds.

---

### Task 6: Remove Old Non-Plugin Skill Layout

**Files:**
- Delete: `SKILL.md`
- Delete: `agents/openai.yaml`
- Delete: `prd-test-planning/SKILL.md`
- Delete: `prd-test-planning/agents/openai.yaml`
- Delete: `prd-test-planning/templates/01-模块拆解.md`
- Delete: `prd-test-planning/templates/02-测试用例.md`
- Delete: `prd-test-planning/templates/03-执行清单.md`
- Delete: `prd-test-planning/templates/04-测试数据与账号.md`
- Delete: `prd-test-execution/SKILL.md`
- Delete: `prd-test-execution/agents/openai.yaml`
- Delete: `prd-test-execution/templates/05-执行记录.md`
- Delete: `prd-test-execution/templates/06-缺陷记录.md`
- Delete: `prd-test-execution/templates/执行结果/优先级/05-执行记录.md`
- Delete: `prd-test-execution/templates/执行结果/优先级/06-缺陷记录.md`

- [ ] **Step 1: Verify new plugin layout validates before cleanup**

Run:

```bash
scripts/validate-plugin.sh
```

Expected: output includes `Plugin validation passed.`.

- [ ] **Step 2: Remove old layout**

Run:

```bash
rm -rf SKILL.md agents prd-test-planning prd-test-execution
```

Expected: command exits with status `0`.

- [ ] **Step 3: Verify old layout is gone and new layout remains**

Run:

```bash
test ! -e SKILL.md
test ! -d prd-test-planning
test ! -d prd-test-execution
test -f skills/easy-prd-testing/SKILL.md
test -f skills/test-planning/templates/01-模块拆解.md
```

Expected: all commands exit with status `0`.

- [ ] **Step 4: Re-run validation**

Run:

```bash
scripts/validate-plugin.sh
```

Expected: output includes `Plugin validation passed.`.

- [ ] **Step 5: Commit cleanup**

Run:

```bash
git add -A
git commit -m "refactor: remove legacy skill layout"
```

Expected: commit succeeds.

---

### Task 7: Final Verification

**Files:**
- Verify all repository files touched by Tasks 1-6.

- [ ] **Step 1: Validate plugin**

Run:

```bash
scripts/validate-plugin.sh
```

Expected: output includes `Plugin validation passed.`.

- [ ] **Step 2: Validate scaffold script end to end**

Run:

```bash
TMP_DIR="$(mktemp -d)"
scripts/scaffold-testing-docs.sh "$TMP_DIR" "订单管理"
find "$TMP_DIR/easy-prd-testing/testing/订单管理" -maxdepth 4 -type d | sort
test -f "$TMP_DIR/easy-prd-testing/testing/订单管理/00-资料分析与待确认问题.md"
test -f "$TMP_DIR/easy-prd-testing/testing/订单管理/04-测试数据与账号.md"
test -f "$TMP_DIR/easy-prd-testing/testing/订单管理/执行结果/P3/06-缺陷记录.md"
test -f "$TMP_DIR/easy-prd-testing/testing/订单管理/06-缺陷记录.md"
```

Expected: scaffold command succeeds, `find` lists `P0` through `P3` evidence directories, and all `test -f` commands exit with status `0`.

- [ ] **Step 3: Check for old path contract**

Run:

```bash
! rg -n "docs/testing/<模块名>|docs/testing" README.md docs skills scripts
```

Expected: command exits with status `0`, meaning the old fixed `docs/testing` contract is not present.

- [ ] **Step 4: Check for required path contract**

Run:

```bash
rg -n "<输出根目录>/easy-prd-testing/testing/<模块名>|<output-root>/easy-prd-testing/testing/<module-name>" README.md docs skills scripts
```

Expected: command prints at least one match from README, docs, and skills.

- [ ] **Step 5: Check task-list rules**

Run:

```bash
rg -n "task-list|Visible Task List|用户可见|blocked|completed" skills/easy-prd-testing/SKILL.md docs/workflow.md
```

Expected: command prints task-list status and update rules from both files.

- [ ] **Step 6: Check worktree status**

Run:

```bash
git status --short
```

Expected: no output.

If the worktree has intentional uncommitted changes, commit them with:

```bash
git add -A
git commit -m "chore: verify easy prd testing plugin"
```

Expected: commit succeeds and `git status --short` has no output.

---

## Self-Review

Spec coverage:

- Codex plugin metadata: Task 1.
- Standard `skills/` layout: Task 2.
- Five child skills plus parent orchestration: Task 2.
- Output root gate and `<output-root>/easy-prd-testing/testing/<module-name>/`: Tasks 2, 3, 5, 7.
- Visible task-list progress: Tasks 1, 2, 7.
- `01-04` planning artifacts and explicit confirmation: Tasks 2, 3.
- Execution prerequisite confirmation: Tasks 2, 3.
- Priority-based multi-agent protocol: Tasks 1, 2.
- Result aggregation ownership: Tasks 1, 2, 3.
- Lightweight validation and scaffold scripts: Tasks 4 and 5.
- Legacy layout removal: Task 6.
- Final verification: Task 7.

Placeholder scan:

- This plan intentionally uses `<output-root>`, `<module-name>`, `<输出根目录>`, and `<模块名>` as documented path variables.
- No task relies on unspecified future design work.

Type and name consistency:

- The fixed plugin artifact directory is always `easy-prd-testing`.
- The Codex skills path is always `./skills/`.
- Script names are always `scripts/validate-plugin.sh` and `scripts/scaffold-testing-docs.sh`.
