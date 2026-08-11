<div align="center">

<sub>✦ PRDs in, testing confidence out ✦</sub>

<h1>🧪 Easy PRD Testing</h1>

<p><strong>Turn PRDs and prototypes into a confirmable, executable, and traceable automation testing workflow</strong></p>

<p>📄 Intake&nbsp; → &nbsp;🔎 Clarify&nbsp; → &nbsp;🧠 Plan&nbsp; → &nbsp;🧪 Test&nbsp; → &nbsp;📦 Evidence&nbsp; → &nbsp;✅ Regress</p>

<p>
  <a href="https://github.com/dszblackmagic/easy-prd-testing/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/dszblackmagic/easy-prd-testing?style=flat-square&amp;label=release&amp;color=ff6b81"></a>
  <img alt="Agent Skills: 9" src="https://img.shields.io/badge/agent_skills-9-58a6ff?style=flat-square">
  <img alt="Codex Plugin ready" src="https://img.shields.io/badge/Codex_Plugin-ready-5ac8a8?style=flat-square">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-f6c453?style=flat-square"></a>
</p>

<p>
  <a href="README.md">简体中文</a> ·
  <strong>English</strong> ·
  <a href="#let-ai-install-it-for-you">Install with AI</a> ·
  <a href="#main-workflow">Main workflow</a>
</p>

</div>

Easy PRD Testing is a suite of PRD / prototype-driven automation testing skills for AI coding tools. It connects product material intake, requirement clarification, test planning, execution confirmation, automated verification, evidence and defect aggregation, and post-fix regression into one confirmable and traceable workflow.

## When To Use It

- Generate test planning artifacts from a PRD, product specification, prototype, screenshot, or field baseline.
- Derive safe execution details automatically, then confirm only the URL, login, account, scope, or risk items that still need user input or authorization.
- Organize automation tests by P0-P3 and preserve execution records, defects, and evidence.
- Optionally export Markdown test cases to a native XMind file for review.
- Reuse Playwright Test scripts first when verifying defect fixes.

## Main Workflow

Start a complete run from the `easy-prd-testing` parent skill. It routes work to the stage skills at the appropriate nodes:

1. **Provide product material**: Supply a PRD, prototype, screenshot, product notes, or a field baseline.
2. **Analyze and clarify**: `prd-intake` identifies module scope, key flows, and ambiguities, then confirms them with the user one at a time.
3. **Generate test planning artifacts**: After the module name and output directory are confirmed, `test-planning` generates the `01-04` artifacts.
4. **Optionally export XMind**: The user may ask `xmind-export` to generate a native XMind review view after planning; skipping it continues the main workflow.
5. **Confirm the planning gate**: The user must explicitly confirm the complete `01-04` set. Otherwise, the workflow stays in planning and does not prepare execution.
6. **Confirm execution conditions**: `execution-gate` confirms the environment, login method, account, scope, dependencies, and risk authorization step by step.
7. **Run automated tests**: `test-execution` runs in single-agent or P0-P3 multi-agent mode and preserves records, defects, and evidence.
8. **Aggregate test results**: `result-aggregation` combines priority-owned results into module-level execution and defect conclusions.
9. **Run regression when needed**: After a defect is fixed and the scope is known, `regression-testing` reuses existing scripts first to verify the fix. The workflow ends here when regression is not needed.

> `02-测试用例.xmind` is an optional review view. `02-测试用例.md` always remains the single source of truth. Whether or not XMind is exported, all `01-04` artifacts must be complete and explicitly confirmed before execution.

## Let AI Install It For You

Copy the prompt that matches your current tool and give it to the AI. The installation should preserve the whole repository instead of copying only one stage skill.

### General AI Coding Tools

```text
Install and configure the complete Easy PRD Testing repository:
https://github.com/dszblackmagic/easy-prd-testing

First identify the Skill or Plugin mechanism supported by the current AI coding tool, then install the repository according to that tool's official conventions. Preserve the root SKILL.md, .easy-prd-testing-manifest.json, .codex-plugin/, every stage skill under skills/, all templates, and scripts/; do not copy only one skill or omit hidden files. If an installation with the same name already exists, ask me before replacing or migrating it. Run scripts/validate-plugin.sh after installation. If a dependency is missing, tell me how to install it but do not install it automatically. Finally, report the install location, install type, and how to start the complete testing workflow.
```

### Codex: Install As A Skill

Use this option when you want to start the complete workflow directly through `$easy-prd-testing`:

```text
$skill-installer Install easy-prd-testing from https://github.com/dszblackmagic/easy-prd-testing. Use the repository root path "." as the skill and preserve the complete structure containing the root SKILL.md, .easy-prd-testing-manifest.json, .codex-plugin/, skills/, templates, and scripts/ without omitting hidden files. If an installation with the same name exists, ask me before replacing it. Run scripts/validate-plugin.sh after installation. Report missing dependencies without installing them automatically. When finished, tell me the install location and confirm that I can start it with $easy-prd-testing.
```

### Codex: Install As A Plugin

Use this option when you want Codex Plugin loading for all stage skills:

```text
Install https://github.com/dszblackmagic/easy-prd-testing as a complete Codex Plugin. Preserve .easy-prd-testing-manifest.json, .codex-plugin/plugin.json, skills/, templates, and scripts/ without omitting hidden files, then configure and install it according to the current Codex local Plugin and marketplace conventions. If a Plugin with the same name exists, ask me before replacing it. Run scripts/validate-plugin.sh after installation and confirm that easy-prd-testing appears in the Codex plugin list. Report missing dependencies without installing them automatically. Finally, tell me the install location and how to start the workflow.
```

### Claude Code: Install The Complete Skill Suite

```text
Install https://github.com/dszblackmagic/easy-prd-testing in the current Claude Code environment using Claude Code's currently supported Agent Skills directory and loading conventions. Install the complete repository and preserve the root SKILL.md, .easy-prd-testing-manifest.json, .codex-plugin/, every stage skill under skills/, all templates, and scripts/ without omitting hidden files so the parent skill can continue to read stage instructions through their relative paths. If an older installation with the same name exists, ask me before replacing it. Run scripts/validate-plugin.sh after installation. Report missing dependencies without installing them automatically. Finally, tell me the install location and how to invoke easy-prd-testing.
```

### Other Tools With `SKILL.md` Support

Start with the “General AI Coding Tools” prompt above. Skill discovery directories, explicit invocation syntax, and script permissions vary between tools, so this README does not promise native installation on tools that have not been tested. Tools without Agent Skills support can still read this repository and follow the same workflow.

The complete workflow requires an AI coding environment that can read local files and run scripts. XMind export requires Node.js 18 or later. Missing dependencies should be reported to the user, not installed automatically.

<details>
<summary>Manual download and validation</summary>

```bash
git clone https://github.com/dszblackmagic/easy-prd-testing.git
cd easy-prd-testing
scripts/validate-plugin.sh
```

After downloading, reference the directory using the current AI tool's official conventions.

</details>

## 30-Second Quick Start

After installation, provide the PRD path and module name directly:

```text
$easy-prd-testing Use /path/to/order-management-prd.md to generate an automation test plan for the Order Management module. Use /path/to/output as the output root, and confirm the test environment, account, and execution scope with me step by step before execution.
```

You can also attach prototype screenshots, product notes, existing test cases, or a field baseline. The skill clarifies ambiguous content before planning and execution preparation.

### Common Prompt Templates

Complete workflow:

```text
Use easy-prd-testing to plan and execute automated tests for <module name> from <PRD or prototype path>. Write artifacts under <output root>, and confirm every execution gate with me step by step.
```

Planning only:

```text
Use the test-planning stage of easy-prd-testing to generate the 01-04 planning artifacts for <module name> from the confirmed requirements. Use <output root> as the output root and do not execute tests yet.
```

Standalone XMind export:

```text
Use the xmind-export stage of easy-prd-testing to convert <test-case Markdown file or module directory> to a native XMind file without changing the source Markdown.
```

Post-fix regression:

```text
Use the regression-testing stage of easy-prd-testing to run regression for <defect ID, test-case ID, or priority scope>, then update the matching regression records and defect status.
```

## When Each Skill Is Used

| Skill | Workflow node | Routing | Primary result |
| --- | --- | --- | --- |
| `easy-prd-testing` | When work should run from material intake through execution, aggregation, or regression | Default entry for the complete workflow | Stage routing and visible task progress |
| `prd-intake` | When a PRD, prototype, screenshot, or product note first arrives | Automatic in the complete workflow; can analyze independently | Module scope, key flows, and clarification conclusions; `00-资料分析与待确认问题.md` when its prerequisites are met |
| `test-planning` | After requirement scope and output location are confirmed | Automatic in the complete workflow; can generate planning only | `01-模块拆解.md` through `04-测试数据与账号.md` |
| `xmind-export` | After cases exist and an XMind review view is wanted | Optional in the complete workflow; can run independently | Native `.xmind` beside the source Markdown |
| `execution-gate` | After `01-04` are complete and explicitly confirmed | Required node in every execution workflow | Environment, account, scope, mutation, and risk authorization |
| `test-execution` | After every execution gate passes | Automatic in the complete workflow | P0-P3 execution records, defects, and evidence |
| `result-aggregation` | After priority-based execution finishes | Automatic in the complete workflow | Root execution and defect summaries |
| `regression-testing` | After a defect is fixed and the regression scope is known | Independent, on-demand entry | Regression records and defect status updates |

The invocation rule is simple: use `easy-prd-testing` for a complete test workflow and name a stage only for independent requirement analysis, planning, XMind export, or regression. If the selected install type exposes stage skills individually, invoke one directly; otherwise invoke the parent skill and name the stage in the prompt.

## What Happens At Each Stage

### 1. Analyze And Clarify Product Material

`prd-intake` identifies module scope, key flows, fields, permissions, states, and exception scenarios from PRDs, prototypes, product notes, or existing test materials, then confirms ambiguous items one by one.

### 2. Generate Test Planning Artifacts

After the module name and output root are confirmed, `test-planning` generates `01-04` under the fixed directory:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

The user can then opt into `xmind-export` for a native XMind review view. Skipping or failing XMind export does not change the execution confirmation requirements for `01-04`.

### 3. Confirm Execution Conditions

After the user explicitly confirms `01-04`, `execution-gate` first derives target type, service state and ownership, page-readiness basis, and cleanup responsibility from existing material and read-only probes, asking only when a conclusion cannot be made reliably or authorization is required. Existing local services remain running by default, remote services are never started or stopped automatically, and execution does not begin while another required item remains unresolved.

### 4. Execute And Preserve Evidence

`test-execution` keeps `agent-browser` as the default and supports single-agent or P0-P3 priority-based execution. The first visit to each page or key flow follows enter → readiness → reconnaissance → locator → action → assertion → classification → evidence → cleanup, using observable page state instead of requiring `networkidle`; runtime observation records only output the tool actually produced, while priority directories and multi-agent write boundaries remain unchanged.

### 5. Aggregate Test Results

`result-aggregation` consolidates pass results, blockers, defects, and evidence indexes from every priority into a module-level conclusion.

### 6. Regress After Defect Fixes

Once the regression target is known, `regression-testing` reuses existing Playwright Test scripts first, then updates regression records and defect statuses. See [`docs/agent-protocol.md`](docs/agent-protocol.md) for the detailed execution and diagnostic escalation rules.

## Artifacts, Gates, And References

All standard testing artifacts live under:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
├── 01-模块拆解.md
├── 02-测试用例.md
├── 02-测试用例.xmind          # optional; not an execution gate
├── 03-执行清单.md
├── 04-测试数据与账号.md
└── 执行结果/
    ├── P0/
    ├── P1/
    ├── P2/
    └── P3/
```

Two layers of confirmation are required before execution: the `01-04` artifacts must be complete and explicitly confirmed by the user; the test environment, account, scope, and risk authorization must also be confirmed. Standalone `xmind-export` usage is not restricted to the standard artifact directory.

More details:

- [`docs/workflow.md`](docs/workflow.md): complete stage flow, execution gates, and task progress rules.
- [`docs/artifact-contract.md`](docs/artifact-contract.md): planning documents, evidence directories, and regression artifact contracts.
- [`docs/agent-protocol.md`](docs/agent-protocol.md): single-agent, multi-agent, browser execution, and diagnostic escalation rules.

## Update The Complete Skill Suite

> [!TIP]
> **Complete Skill-suite updates are available starting with v0.1.2.** There is no fixed command to memorize and no need to run the internal updater manually. Express an Easy PRD Testing update intent to the AI instead. See the [v0.1.2 release notes](docs/releases/v0.1.2.md).

For example:

```text
Update this version
Check whether these Skills have an update
Bring the Easy PRD Testing plugin up to date
```

The parent skill routes clear version-update intent to `self-update` even when `$self-update` is not named exactly. If “update” could mean the test environment, product version, or test cases, the AI confirms the target first and does not modify this Skill suite.

### How The AI Performs An Update

1. **Check without changing files**: Identify the current installation path, installation type, and version, then query the latest stable Release.
2. **Present the change**: Show the current and target versions, installation path, and 3–5 release highlights.
3. **Ask once**: When an update is available, ask once for confirmation. No files change without explicit approval.
4. **Verify the download**: Download the standard Release Asset and verify it against the SHA-256 digest provided by GitHub. Users of the public repository do not need to sign in to GitHub or configure GitHub CLI.
5. **Validate in a temporary directory**: Extract safely, verify the complete managed-file manifest, and run repository validation before switching the installation.
6. **Switch the installation**: Replace the old version only after validation and prompt the user to reload the Skills or Plugin. Pre-switch failures leave the original installation untouched; switch-stage failures attempt to restore it.

The updater follows only the latest stable GitHub Release. It never updates from `main`, draft Releases, or prereleases. A normal update does not prompt at every step, and the updater never installs a missing Node.js runtime automatically.

### Supported Installation Types

| Current installation | Update behavior |
| --- | --- |
| AI-installed or copied managed installation | Verifies managed files and switches transactionally; local modifications require separate, explicit acceptance of permanent overwrite |
| Git clone of the official repository | Requires the official `origin` and a clean worktree; checks out the exact stable Tag after updating |
| Git worktree with uncommitted changes | Refuses to update and provides no force-overwrite path |
| Symlink, incomplete installation, or Git repository from an unknown origin | Stops safely and explains why instead of guessing or falling back to another update method |

### Update Boundaries

- Node.js 18 or later is required. Missing dependencies are reported, never installed automatically.
- Only the installation used by the current session is updated; copies belonging to other AI tools are not scanned.
- There are no background startup checks and no telemetry.
- Updates do not run during execution-gate, test-execution, result-aggregation, or regression-testing work.
- Successful updates do not keep historical rollback copies; failed updates leave the original installation in place or restore it.
- After success, start a new AI session or reload the current tool's Skills or Plugin so the new instructions take full effect.

### Migrating From `v0.1.1` Or Earlier

Older versions do not contain `self-update`. Give the following one-time migration prompt to your AI:

```text
Reinstall the latest stable Easy PRD Testing release from https://github.com/dszblackmagic/easy-prd-testing and replace the current installation. Check for local modifications and report them before replacement, then run scripts/validate-plugin.sh after installation. If Node.js 18 or another dependency is missing, tell me how to install it but do not install it automatically. Finally, report the installation path and version.
```

Future releases can use the natural-language update flow above after this migration.

## License

MIT

## Thanks And Participation

Thank you for trying Easy PRD Testing. If the workflow helps you, consider giving the project a [Star](https://github.com/dszblackmagic/easy-prd-testing).

If you encounter a problem or have an improvement idea, please open a [GitHub Issue](https://github.com/dszblackmagic/easy-prd-testing/issues). Feedback is especially welcome on:

- Installation and invocation compatibility across AI coding tools.
- Missing or awkward steps between PRD intake and test execution.
- Testing artifacts, execution gates, and multi-agent collaboration.
- Markdown test cases and XMind export results.
- Version checks and complete Skill-suite updates.

Every report from real-world usage helps make this skill suite more reliable and easier to use.
