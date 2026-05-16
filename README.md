# Easy PRD Testing

[中文](README.md) | [English](README.en.md)

Easy PRD Testing 是一个面向 Codex 的 PRD / 原型驱动自动化自测插件。它把一个模块从产品资料输入、需求澄清、测试规划、执行前确认、浏览器自动化验证、证据沉淀、结果汇总，一直串联到缺陷修复后的回归验证。

## 适用场景

- 你有 PRD、产品说明、原型图或字段基线，希望自动生成测试规划。
- 你希望在执行前逐步确认测试地址、账号密码、登录方式和执行范围。
- 你希望自动化执行过程中持续看到 task-list 风格的进度。
- 你希望按 P0-P3 优先级拆分多 agent 执行，并汇总缺陷与证据。
- 你希望缺陷修复后优先复用 Playwright Test 脚本做长期回归。

## 安装

推荐将本仓库作为完整 Codex Plugin 使用，而不是只复制单个 skill。完整插件会保留父级编排、阶段路由、产物目录契约和执行进度展示。

```bash
git clone git@github.com:dszblackmagic/easy-prd-testing.git
cd easy-prd-testing
scripts/validate-plugin.sh
```

然后在你的 Codex 本地插件配置中引用这个仓库目录，使 Codex 能读取：

```text
.codex-plugin/plugin.json
skills/
```

如果你只想研究某个阶段，也可以直接查看 `skills/<skill-name>/SKILL.md`，但日常使用建议通过 `easy-prd-testing` 父 skill 启动完整链路。

## 快速开始

在 Codex 中输入类似请求：

```text
使用 easy-prd-testing，根据这个 PRD 为订单管理模块生成自动化测试规划，并在执行前逐步向我确认测试环境、账号和执行范围。
```

你可以提供：

- PRD 文档路径。
- 原型图或截图。
- 产品说明文本。
- 现有测试用例或字段基线。

插件会先分析资料中不明确的地方，并通过问题向你确认；确认后才会进入测试规划和执行准备。

## 完整使用教程

### 1. 输入产品资料

从 PRD、原型图、产品说明或已有测试资料开始。`prd-intake` 会识别模块范围、关键流程、字段、权限、状态和异常场景，并把不明确内容整理成待确认问题。

### 2. 生成测试规划

`test-planning` 会先询问测试产物输出根目录，然后在固定目录下生成规划文件：

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

规划阶段产物包括：

- `01-模块拆解.md`
- `02-测试用例.md`
- `03-执行清单.md`
- `04-测试数据与账号.md`

### 3. 执行前确认

`execution-gate` 会逐步确认：

- 测试地址。
- 登录方式。
- 是否需要账号密码。
- 测试账号与数据准备方式。
- 执行范围和优先级。
- 是否允许修改数据。
- 执行后端策略。

在 `01-04` 文件未生成、未确认或关键信息缺失时，不会直接开始执行。

### 4. 自动化执行

`test-execution` 支持单 agent 执行，也支持按 P0-P3 优先级拆分多 agent 执行。完整链路会展示类似 task-list 的进度，让你看到哪些阶段已完成、哪些任务仍在执行。

浏览器自动化默认优先使用更轻量的执行方式；失败诊断时再升级到 Chrome DevTools CLI；Chrome DevTools MCP 只作为最后兜底。

### 5. 结果汇总

执行结果会按优先级写入：

```text
执行结果/P0/
执行结果/P1/
执行结果/P2/
执行结果/P3/
```

每个优先级目录包含：

- `05-执行记录.md`
- `06-缺陷记录.md`
- `screenshots/`
- `videos/`
- `scripts/`

`result-aggregation` 会再汇总根级执行记录和缺陷记录，方便查看整体通过率、阻塞项和缺陷分布。

### 6. 回归测试

缺陷修复后，可以使用 `regression-testing` 独立执行回归链路。它会优先运行已沉淀的 Playwright Test 脚本；只有脚本结果不足以判断时，才升级到 `agent-browser` 复核，再按需要使用 Chrome DevTools CLI 或 MCP 做诊断。

回归产物直接放在对应优先级目录下，与 `05-执行记录.md`、`06-缺陷记录.md` 同层：

```text
执行结果/P0/07-回归记录.md
执行结果/P0/08-回归缺陷状态.md
执行结果/P0/regression-screenshots/
执行结果/P0/regression-videos/
执行结果/P0/regression-traces/
执行结果/P0/regression-scripts/
```

## 内置 Skills

- `easy-prd-testing`：父级编排、阶段路由和 task-list 进度展示。
- `prd-intake`：PRD / 原型资料分析和澄清问题生成。
- `test-planning`：生成测试规划文档，并确认输出目录。
- `execution-gate`：执行前确认测试地址、账号、范围和风险授权。
- `test-execution`：执行页面验证、证据捕获和缺陷记录。
- `regression-testing`：缺陷修复后的脚本优先回归验证。
- `result-aggregation`：汇总执行记录、缺陷记录和回归状态。

## 辅助脚本

验证插件结构：

```bash
scripts/validate-plugin.sh
```

创建测试产物目录：

```bash
scripts/scaffold-testing-docs.sh "/path/to/output-root" "订单管理"
```

辅助脚本只负责结构验证和目录生成，不负责解析 PRD、打开浏览器、执行测试或判断缺陷。

## 产物目录契约

所有测试产物都必须位于：

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

固定的 `easy-prd-testing` 目录用于隔离本插件产物，避免和业务项目自身文档混在一起。

## 文档索引

- `docs/workflow.md`：完整阶段流转、执行 gate 和 task-list 规则。
- `docs/artifact-contract.md`：生成文档、证据目录和回归产物契约。
- `docs/agent-protocol.md`：单 agent、多 agent、浏览器执行和诊断升级规则。

## 贡献

提交前请运行：

```bash
scripts/validate-plugin.sh
bash -n scripts/validate-plugin.sh scripts/scaffold-testing-docs.sh
```

贡献规范见 `AGENTS.md`。

## License

MIT
