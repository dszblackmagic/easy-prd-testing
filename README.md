<div align="center">

<sub>✦ PRD 进来，测试信心出去 ✦</sub>

<h1>🧪 Easy PRD Testing</h1>

<p><strong>把 PRD 与原型，变成可确认、可执行、可追踪的自动化测试流程</strong></p>

<p>📄 资料&nbsp; → &nbsp;🔎 澄清&nbsp; → &nbsp;🧠 规划&nbsp; → &nbsp;🧪 执行&nbsp; → &nbsp;📦 证据&nbsp; → &nbsp;✅ 回归</p>

<p>
  <a href="https://github.com/dszblackmagic/easy-prd-testing/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/dszblackmagic/easy-prd-testing?style=flat-square&amp;label=release&amp;color=ff6b81"></a>
  <img alt="Agent Skills: 9" src="https://img.shields.io/badge/agent_skills-9-58a6ff?style=flat-square">
  <img alt="Codex Plugin ready" src="https://img.shields.io/badge/Codex_Plugin-ready-5ac8a8?style=flat-square">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-f6c453?style=flat-square"></a>
</p>

<p>
  <strong>简体中文</strong> ·
  <a href="README.en.md">English</a> ·
  <a href="#让-ai-一键安装">AI 一键安装</a> ·
  <a href="#升级整套-skills">版本升级</a> ·
  <a href="#主要流程">主要流程</a>
</p>

</div>

Easy PRD Testing 是一套面向 AI 编码工具的 PRD / 原型驱动自动化自测 Skills。它把产品资料输入、需求澄清、测试规划、执行确认、自动化验证、证据与缺陷汇总，以及缺陷修复后的回归测试串成一条可确认、可追踪的流程。

> [!TIP]
> **v0.1.2 新增整套 Skills 自更新。** 安装本版本后，只需告诉 AI“升级一下版本”或相近意图，即可检查并升级到最新正式 Release，无需记忆固定命令。查看 [v0.1.2 更新说明](docs/releases/v0.1.2.md)。

## 适用场景

- 根据 PRD、产品说明、原型图、截图或字段基线生成测试规划。
- 在执行前逐步确认测试地址、登录方式、账号、范围和风险授权。
- 按 P0-P3 组织自动化测试，并沉淀执行记录、缺陷和证据。
- 按需把 Markdown 测试用例导出为原生 XMind，辅助用例评审。
- 缺陷修复后优先复用 Playwright Test 脚本进行回归验证。
- 通过自然语言检查并安全升级整套 Easy PRD Testing Skills / Plugin。

## 主要流程

完整流程默认从 `easy-prd-testing` 父 Skill 启动，由它按节点调用其他 Skills：

1. **输入产品资料**：提供 PRD、原型、截图、产品说明或字段基线。
2. **分析与澄清**：`prd-intake` 识别模块范围、关键流程和不明确内容，并逐项向用户确认。
3. **生成测试规划**：`test-planning` 在确认模块名和输出目录后生成 `01-04` 测试规划产物。
4. **按需导出 XMind**：规划完成后，用户可以选择由 `xmind-export` 生成原生 XMind 评审视图；跳过后继续主流程。
5. **确认规划门禁**：用户必须明确确认完整的 `01-04`，否则停留在规划阶段，不进入执行准备。
6. **确认执行条件**：`execution-gate` 逐步确认测试环境、登录方式、账号、范围、依赖和风险授权。
7. **执行自动化测试**：`test-execution` 以单 agent 或 P0-P3 多 agent 模式执行，并保存记录、缺陷和证据。
8. **汇总测试结果**：`result-aggregation` 汇总各优先级结果，输出模块级执行与缺陷结论。
9. **按需执行回归**：缺陷修复且回归范围明确后，`regression-testing` 优先复用已有脚本验证修复结果；没有回归需求时流程结束。

> `02-测试用例.xmind` 是可选评审视图，`02-测试用例.md` 始终是唯一权威源。无论是否导出 XMind，执行前都必须完整生成并明确确认 `01-04`。

## 让 AI 一键安装

复制与你当前工具匹配的提示词交给 AI。安装时应保留整个仓库，不要只复制某一个阶段 Skill。

### 通用 AI 编码工具

```text
请安装并配置整个 Easy PRD Testing 仓库：
https://github.com/dszblackmagic/easy-prd-testing

请先识别当前 AI 编码工具支持的 Skill 或 Plugin 机制，再按该工具的官方约定完成安装。保留仓库根 SKILL.md、.easy-prd-testing-manifest.json、.codex-plugin/、skills/ 下的全部阶段 Skills、模板和 scripts/，不要只复制单个 Skill，也不要遗漏隐藏文件。检测到同名旧版本时，覆盖或迁移前先征得我的确认。安装后运行 scripts/validate-plugin.sh；如果缺少依赖，只告诉我安装方法，不要自动安装。最后告诉我安装位置、采用的安装形态，以及如何启动完整测试流程。
```

### Codex：安装为 Skill

适合希望直接通过 `$easy-prd-testing` 使用完整流程的用户：

```text
$skill-installer 请从 https://github.com/dszblackmagic/easy-prd-testing 安装 easy-prd-testing。使用仓库根目录 "." 作为 Skill，保留根 SKILL.md、.easy-prd-testing-manifest.json、.codex-plugin/、skills/、模板和 scripts/ 的完整目录结构，不要遗漏隐藏文件。检测到同名安装时先询问我，不要直接覆盖。安装后运行 scripts/validate-plugin.sh；缺少依赖时只提示，不要自动安装。完成后告诉我安装位置，并确认可以通过 $easy-prd-testing 启动。
```

### Codex：安装为 Plugin

适合希望通过 Codex Plugin 载入全部阶段 Skills 的用户：

```text
请把 https://github.com/dszblackmagic/easy-prd-testing 安装为完整 Codex Plugin。请保留 .easy-prd-testing-manifest.json、.codex-plugin/plugin.json、skills/、模板和 scripts/，不要遗漏隐藏文件，并按照当前 Codex 的本地 Plugin 与 marketplace 约定完成配置和安装。检测到同名 Plugin 时先询问我，不要直接覆盖。安装后运行 scripts/validate-plugin.sh，并用 Codex 的插件列表确认 easy-prd-testing 可见。缺少依赖时只提示，不要自动安装。最后告诉我安装位置和启动方式。
```

### Claude Code：安装整套 Skills

```text
请把 https://github.com/dszblackmagic/easy-prd-testing 安装到当前 Claude Code 环境，使用 Claude Code 当前支持的 Agent Skills 目录和加载约定。请安装整个仓库并保留根 SKILL.md、.easy-prd-testing-manifest.json、.codex-plugin/、skills/ 下的全部阶段 Skills、模板和 scripts/，不要遗漏隐藏文件，确保父 Skill 能继续读取相对路径中的阶段说明。检测到同名旧版本时先询问我，不要直接覆盖。安装后运行 scripts/validate-plugin.sh；缺少依赖时只提示，不要自动安装。最后告诉我安装位置，以及如何调用 easy-prd-testing。
```

### 其他支持 `SKILL.md` 的工具

优先使用上面的“通用 AI 编码工具”提示词。不同工具对 Skills 的扫描目录、显式调用语法和脚本权限可能不同；README 不对未实际验证的工具承诺原生安装体验。不支持 Agent Skills 的工具仍可读取本仓库说明，并按同一流程执行任务。

完整流程需要能够读取本地文件并运行脚本的 AI 编码环境。XMind 导出与整套 Skills 升级需要 Node.js 18 或更高版本；缺少依赖时应提示用户安装，不自动安装。

<details>
<summary>手动下载和验证</summary>

```bash
git clone https://github.com/dszblackmagic/easy-prd-testing.git
cd easy-prd-testing
scripts/validate-plugin.sh
```

下载后，再按当前 AI 工具的官方约定引用该目录。

</details>

## 升级整套 Skills

从 `v0.1.2` 开始，不需要记忆固定指令，也不需要手动运行内部升级脚本。只要向 AI 表达 Easy PRD Testing 的升级意图，例如：

```text
升级一下版本
帮我看看这套 Skills 有没有更新
把 Easy PRD Testing 插件同步到最新版
```

即使没有准确写出 `$self-update`，父 Skill 也会根据上下文把明确的版本升级意图交给它处理。如果“升级”指的是测试环境、产品版本或测试用例，AI 会先确认对象，不会直接修改本套 Skills。

### AI 会如何完成升级

1. **只读检查**：识别当前安装路径、安装形态和版本，并查询最新正式 Release。
2. **展示变更**：告知当前版本、目标版本、安装位置，以及 3～5 条中文更新亮点。
3. **询问一次**：发现可用更新后，只询问一次是否升级；没有得到明确确认前不会修改文件。
4. **验证下载**：下载标准 Release Asset，并使用 GitHub 提供的 SHA-256 digest 校验内容。公开仓库的用户不需要登录 GitHub，也不需要配置 GitHub CLI。
5. **临时验证**：在临时目录安全解包，检查完整文件清单并运行仓库验证；验证通过后才切换安装。
6. **完成切换**：成功后替换旧版本并提示重新加载 Skills / Plugin；任何前置步骤失败时保留原安装，切换阶段失败时尝试恢复原版本。

升级器只跟随 GitHub 上的最新正式 Release，不会从 `main` 分支、草稿 Release 或预发布版本升级。正常流程不会逐步反复询问，也不会自动安装缺失的 Node.js。

### 支持的安装形态

| 当前安装形态 | 升级行为 |
| --- | --- |
| AI 安装或复制的受管副本 | 校验受管文件后事务替换；存在本地修改时，必须额外明确接受永久覆盖 |
| 官方仓库的 Git 克隆 | 仅允许官方 `origin` 且工作区干净；升级后固定到对应正式 Tag |
| 有未提交修改的 Git 工作区 | 拒绝升级，不提供强制覆盖 |
| 符号链接、不完整副本或未知来源 Git 仓库 | 安全停止并说明原因，不猜测或改用其他更新方式 |

### 升级边界

- 需要 Node.js 18 或更高版本；缺少时只提示安装方式，不会自动安装。
- 每次只处理当前会话正在使用的安装，不扫描其他 AI 工具中的副本。
- 不在测试流程启动时后台检查，也不收集遥测数据。
- 不会在执行门禁、测试执行、结果汇总或回归过程中更新自身。
- 成功升级后不保留历史回滚版本；失败时原安装仍会保留或恢复。
- 升级成功后，请新建 AI 会话或重新加载当前工具的 Skills / Plugin，使新版本规则完整生效。

### `v0.1.1` 及更早版本迁移

旧版本还没有 `self-update`，需要先把下面这段话交给 AI 完成一次重新安装：

```text
请从 https://github.com/dszblackmagic/easy-prd-testing 重新安装最新稳定版，替换当前 Easy PRD Testing 安装。替换前检查并告知我是否存在本地修改，安装后运行 scripts/validate-plugin.sh；如果缺少 Node.js 18 或其他依赖，只告诉我安装方法，不要自动安装。完成后告诉我安装位置和版本。
```

完成这次迁移后，后续版本即可使用上面的自然语言升级方式。

## 30 秒快速开始

完成安装后，可以直接给出 PRD 路径和模块名：

```text
$easy-prd-testing 请根据 /path/to/订单管理-PRD.md，为订单管理模块生成自动化测试规划，输出根目录使用 /path/to/output，并在开始执行前逐步向我确认测试环境、账号和执行范围。
```

也可以附加原型截图、产品说明、现有测试用例或字段基线。Skill 会先澄清不明确的内容，再进入规划和执行准备。

### 常用调用模板

完整链路：

```text
使用 easy-prd-testing，根据 <PRD 或原型路径> 为 <模块名> 规划并执行自动化测试，产物输出到 <输出根目录>；所有执行门禁逐步向我确认。
```

只生成测试规划：

```text
使用 easy-prd-testing 的 test-planning 阶段，根据已确认的需求为 <模块名> 生成 01-04 测试规划，输出根目录为 <输出根目录>，暂不执行测试。
```

单独导出 XMind：

```text
使用 easy-prd-testing 的 xmind-export 阶段，把 <测试用例 Markdown 或模块目录> 导出为原生 XMind，并保持源 Markdown 不变。
```

缺陷修复后回归：

```text
使用 easy-prd-testing 的 regression-testing 阶段，对 <缺陷 ID、用例 ID 或优先级范围> 执行回归，并更新对应回归记录与缺陷状态。
```

## 每个 Skill 在何时使用

| Skill | 使用节点 | 路由方式 | 主要结果 |
| --- | --- | --- | --- |
| `easy-prd-testing` | 需要从资料输入走到执行、汇总或回归时 | 完整流程的默认入口 | 阶段路由与可见任务进度 |
| `prd-intake` | 刚收到 PRD、原型、截图或产品说明时 | 完整流程自动进入；也可单独分析 | 模块范围、关键流程与澄清结论；条件满足时生成 `00-资料分析与待确认问题.md` |
| `test-planning` | 需求范围和输出目录确认后 | 完整流程自动进入；也可只生成规划 | `01-模块拆解.md` 至 `04-测试数据与账号.md` |
| `xmind-export` | 用例生成后，希望使用 XMind 评审时 | 完整流程中可选；也可独立调用 | 与源 Markdown 同目录的原生 `.xmind` |
| `execution-gate` | `01-04` 完整且经用户明确确认后 | 完整执行链路的必经节点 | 环境、账号、范围、数据修改与风险授权确认 |
| `test-execution` | 执行门禁全部通过后 | 完整流程自动进入 | P0-P3 执行记录、缺陷和证据 |
| `result-aggregation` | 各优先级执行结束后 | 完整流程自动进入 | 根级执行与缺陷汇总 |
| `regression-testing` | 缺陷修复且回归范围明确后 | 按需独立触发 | 回归记录与缺陷状态更新 |
| `self-update` | 希望检查或升级 Easy PRD Testing 版本时 | 根据升级语义独立触发 | 版本检查、更新摘要与整套 Skills 安全升级 |

调用原则很简单：完整测试默认调用 `easy-prd-testing`；只有独立分析需求、生成规划、导出 XMind、执行回归或升级版本时，才指定对应阶段。版本升级不属于测试主流程，也不会改变 `01-04` 执行门禁。若当前安装形态单独暴露了阶段 Skill，可以直接调用；否则仍调用父 Skill 并在提示词中写明意图。

## 各阶段会做什么

### 1. 分析并澄清产品资料

`prd-intake` 从 PRD、原型、产品说明或已有测试资料中识别模块范围、关键流程、字段、权限、状态和异常场景，并逐项确认不明确内容。

### 2. 生成测试规划

`test-planning` 确认模块名和输出根目录后，在固定目录生成 `01-04`：

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

生成完成后，用户可以选择调用 `xmind-export` 补充原生 XMind 评审视图。XMind 导出失败或被跳过，不会改变 `01-04` 的执行确认要求。

### 3. 确认执行条件

用户明确确认 `01-04` 后，`execution-gate` 再逐步确认测试地址、登录方式、测试账号、数据准备、执行范围、优先级、数据修改权限和高风险操作授权。任何必要信息缺失时都不会直接执行。

### 4. 执行并保留证据

`test-execution` 支持单 agent 或按 P0-P3 拆分执行，并持续更新可见任务进度。执行记录、缺陷、截图、视频和脚本分别写入对应优先级目录。

### 5. 汇总测试结果

`result-aggregation` 汇总各优先级的通过情况、阻塞项、缺陷和证据索引，形成模块级结论。

### 6. 缺陷修复后回归

`regression-testing` 在回归目标明确后，优先复用已有 Playwright Test 脚本验证修复结果，并更新回归记录和缺陷状态。更具体的执行与诊断升级规则见 [`docs/agent-protocol.md`](docs/agent-protocol.md)。

### 独立维护：升级整套 Skills

`self-update` 在没有进行中的执行阶段时检查最新正式 Release，展示更新亮点并等待一次明确确认。升级引擎负责 SHA-256 校验、本地修改保护、安全解包和失败恢复；升级成功后从新会话开始使用新版本。

## 产物、门禁与参考

所有标准测试产物都位于：

```text
<output-root>/easy-prd-testing/testing/<module-name>/
├── 01-模块拆解.md
├── 02-测试用例.md
├── 02-测试用例.xmind          # 可选，不属于执行门禁
├── 03-执行清单.md
├── 04-测试数据与账号.md
└── 执行结果/
    ├── P0/
    ├── P1/
    ├── P2/
    └── P3/
```

开始执行前必须满足两层条件：`01-04` 文件完整且经过用户明确确认；测试环境、账号、范围及风险授权也已确认。单独使用 `xmind-export` 时不受标准产物目录限制。

更多细节：

- [`docs/workflow.md`](docs/workflow.md)：完整阶段流转、执行门禁和任务进度规则。
- [`docs/artifact-contract.md`](docs/artifact-contract.md)：规划文档、证据目录和回归产物契约。
- [`docs/agent-protocol.md`](docs/agent-protocol.md)：单 agent、多 agent、浏览器执行和诊断升级规则。

## License

MIT

## 感谢与参与

感谢你试用 Easy PRD Testing。如果这套流程对你有帮助，欢迎为项目点一个 [Star](https://github.com/dszblackmagic/easy-prd-testing)。

遇到问题或有改进建议，欢迎提交 [GitHub Issue](https://github.com/dszblackmagic/easy-prd-testing/issues)。尤其期待以下反馈：

- 不同 AI 编码工具的安装与调用兼容性。
- 从 PRD 到测试执行过程中缺失或不合理的节点。
- 测试产物、执行门禁和多 agent 协作体验。
- Markdown 用例与 XMind 导出结果。
- 整套 Skills 的版本检查与升级体验。

每一条真实使用反馈，都会帮助这套 Skills 变得更可靠、更容易使用。
