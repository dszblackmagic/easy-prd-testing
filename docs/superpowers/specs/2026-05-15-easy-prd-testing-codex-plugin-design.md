# Easy PRD Testing Codex Plugin Design

## 1. 背景与目标

当前仓库已经有一个父级 `easy-prd-testing` skill，以及 `prd-test-planning`、`prd-test-execution` 两个子流程。现有结构能表达“规划”和“执行”两个阶段，但还不是一个标准 Codex 插件工程，也缺少从 PRD/原型输入到询问式澄清、测试规划、执行前门禁、多 agent 执行和结果汇总的完整链路。

第一版目标是将仓库重组为一个可安装、可发布、可演进的 Codex 插件工程。插件以用户提供的 PRD 文档、产品原型图或字段基线为起点，通过分阶段技能完成：

1. 分析输入资料并逐项询问不明确内容。
2. 生成可执行测试规划产物。
3. 要求用户显式确认规划资料。
4. 执行前逐步确认测试地址、路径、登录方式、账号、权限、执行模式和风险授权。
5. 支持单 agent 顺序执行，或多 agent 按优先级并行执行。
6. 汇总执行记录、缺陷、阻塞和证据索引。

第一版只面向 Codex 插件标准结构，不做多端插件兼容。插件包含 skills、templates、docs 和轻量脚本，不建设 Web UI，不自动安装测试依赖，不把核心测试判断下沉到脚本。

## 2. 参考原则

设计参考 `obra/superpowers` 的 Codex 插件组织方式和工作流思想：

- 通过 `.codex-plugin/plugin.json` 声明插件元数据，并指向 `./skills/`。
- 通过阶段化 skill 把复杂工作拆成可理解、可签核、可恢复的流程。
- 在关键阶段设置门禁，避免 agent 在输入不明确或用户未确认时直接执行。
- 将计划、执行、并行分派、评审和收口拆开，降低单个 skill 的职责复杂度。
- 强调证据优先和产物落盘，避免只给口头结论。

参考地址：https://github.com/obra/superpowers

## 3. 插件工程结构

目标目录结构：

```text
easy-prd-testing/
  .codex-plugin/
    plugin.json
  skills/
    easy-prd-testing/
      SKILL.md
    prd-intake/
      SKILL.md
      templates/
    test-planning/
      SKILL.md
      templates/
    execution-gate/
      SKILL.md
      templates/
    test-execution/
      SKILL.md
      templates/
    result-aggregation/
      SKILL.md
      templates/
  scripts/
    validate-plugin.sh
    scaffold-testing-docs.sh
  docs/
    workflow.md
    artifact-contract.md
    agent-protocol.md
  README.md
  LICENSE
```

结构规则：

- `.codex-plugin/plugin.json` 是插件入口，声明插件名称、版本、描述、作者、能力、默认 prompt、展示信息和 skills 路径。
- `skills/easy-prd-testing/` 是总入口 skill，只负责阶段识别、门禁判断和调度，不承载所有细节。
- 五个子技能分别负责输入澄清、测试规划、执行前门禁、页面执行和结果汇总。
- 每个阶段的模板放在对应 skill 的 `templates/` 下，减少跨阶段路径歧义。
- `scripts/` 只做结构校验和目录骨架生成，不执行真实页面测试。
- `docs/` 解释工作流、产物协议和多 agent 协议，方便安装、维护和发布。

## 4. 技能职责

### easy-prd-testing

父级总入口。根据用户输入和本地资料判断当前应进入哪个阶段。

职责：

- 识别用户是在提供 PRD/原型、补充澄清、要求生成规划、要求执行测试，还是要求汇总结果。
- 检查当前阶段的前置条件是否满足。
- 将用户引导到最近的有效阶段。
- 阻止跳过规划确认、执行前门禁或风险授权。

不负责：

- 直接解析 PRD 细节。
- 直接生成全部测试用例。
- 直接打开浏览器执行测试。
- 直接写多 agent 子目录结果。

### prd-intake

输入分析和缺口提问阶段。

职责：

- 读取 PRD 文档、原型图、字段基线或用户补充说明。
- 提取模块边界、功能点、字段、操作场景、权限要求和高风险动作。
- 区分信息来源：PRD、原型图、用户补充。
- 对不明确内容逐项提问。
- 形成可交给 `test-planning` 的结构化理解。

门禁：

- 没有 PRD 或原型图时，不进入规划，只询问资料来源。
- 缺模块名称时，不创建模块目录，先询问模块名称。
- PRD 与原型图冲突时，默认以 PRD 为准，并把冲突项列为待确认。
- 仅从原型图推断的字段或交互必须标记待确认。

### test-planning

测试规划产物生成阶段。

职责：

- 询问用户自动化测试结果和规划资料要放在哪个输出根目录下。
- 在 `<输出根目录>/easy-prd-testing/testing/<模块名>/` 下生成 `01-04` 规划资料。
- 为功能点生成 `F-xxx` 编号。
- 为用例生成优先级、执行目录、前置条件、步骤和预期结果。
- 生成字段基线、执行清单、测试数据与账号占位。
- 生成后暂停，要求用户显式确认。

门禁：

- 必须基于 PRD/原型或经过 `prd-intake` 整理后的资料生成。
- 必须确认输出根目录；未确认前不创建测试资料目录。
- 不进入页面执行。
- `01-04` 生成后，必须用户显式确认后才能进入 `execution-gate`。

### execution-gate

执行前门禁确认阶段。

职责：

- 检查 `01-04` 是否存在且可读取。
- 逐步确认测试环境地址和测试路径。
- 逐步确认登录方式：指定账号、复用当前登录态或无需登录。
- 指定账号时继续确认账号、密码获取方式和权限范围。
- 确认执行模式：单 agent 独立执行或多 agent 并行执行。
- 确认高风险动作授权边界。
- 汇总最终执行方案。

门禁：

- 每次只询问一个当前缺失项。
- 没有完整执行前置条件时，不打开页面、不采集字段、不录制视频。
- 高风险动作未授权时，只允许验证入口、展示、校验、二次确认和提示。

### test-execution

页面执行和证据采集阶段。

职责：

- 基于最终执行方案执行页面验证。
- 支持单 agent 按 `P0 -> P1 -> P2 -> P3` 顺序执行。
- 支持多 agent 按优先级并行执行。
- 执行字段一致性比对、操作验证、阻塞记录和失败取证。
- 将结果写入对应优先级目录。

门禁：

- 只能基于已确认的 `01-04` 和最终执行方案执行。
- 多 agent 子任务只能写自己负责的 `执行结果/Px/`。
- 子 agent 不修改 `01-04`，不写根目录汇总文件。
- 依赖不可用时记录降级策略，不自动安装依赖。

### result-aggregation

结果汇总阶段。

职责：

- 读取各优先级目录下的执行记录和缺陷记录。
- 生成或更新模块根目录 `05-执行记录.md`。
- 生成或更新模块根目录 `06-缺陷记录.md`。
- 汇总通过、失败、阻塞、未测、待确认和证据索引。
- 标记子 agent 写入越界、缺失记录或无法归属的问题。

门禁：

- 只从 `执行结果/P0` 至 `执行结果/P3` 读取明细。
- 根目录 `05/06` 只由主流程生成或更新。
- 阻塞默认不登记缺陷，除非用户确认这是产品或实现问题。

## 5. 阶段链路

完整链路：

```text
资料输入
  -> PRD/原型解析与缺口提问
  -> 测试规划产物生成
  -> 用户显式确认 01-04
  -> 执行前逐步确认
  -> 单 agent / 多 agent 执行
  -> 汇总执行结果与缺陷
```

关键规则：

- 没有 PRD 或原型图，不能进入规划。
- 缺模块名称，不能创建模块目录。
- 未确认输出根目录，不能创建测试资料目录。
- 存在关键口径不明确时，先逐项询问，不把推断当确认事实。
- `01-04` 生成后必须用户显式确认。
- 未确认测试地址、路径、登录方式、执行模式和风险授权时，不能进入执行。
- 多 agent 执行时，子 agent 只写所属优先级目录，主流程负责汇总。

## 6. 产物协议

规划阶段必须先确认输出根目录。所有自动化测试规划资料、执行记录、缺陷记录和证据都写入该输出根目录下的固定 skill 目录：

```text
<输出根目录>/easy-prd-testing/testing/<模块名>/
```

`easy-prd-testing` 是固定目录名，用于把本 skill 生成的测试产物与其他工具或人工资料隔离。

规划阶段固定生成：

```text
<输出根目录>/easy-prd-testing/testing/<模块名>/
  01-模块拆解.md
  02-测试用例.md
  03-执行清单.md
  04-测试数据与账号.md
```

执行阶段固定生成：

```text
<输出根目录>/easy-prd-testing/testing/<模块名>/
  执行结果/
    P0/
      05-执行记录.md
      06-缺陷记录.md
      screenshots/
      videos/
      scripts/
    P1/
      05-执行记录.md
      06-缺陷记录.md
      screenshots/
      videos/
      scripts/
    P2/
      05-执行记录.md
      06-缺陷记录.md
      screenshots/
      videos/
      scripts/
    P3/
      05-执行记录.md
      06-缺陷记录.md
      screenshots/
      videos/
      scripts/
  05-执行记录.md
  06-缺陷记录.md
```

`01-04` 约束：

- 功能点统一使用 `F-xxx` 编号。
- 用例统一使用 `<模块缩写>-P<优先级>-NNN` 编号。
- 每条用例必须回连到功能点编号。
- 每条用例必须明确优先级、执行目录、前置条件、测试步骤和预期结果。
- 字段基线必须标注来源：PRD、原型图或用户补充。
- 原型图推断字段必须标记待确认。

`05-06` 约束：

- 通过用例只写实际结果摘要，默认不截图。
- 字段差异、失败、阻塞、高风险提示必须保留证据。
- 字段类失败只截图。
- 操作类失败截图、采集 Console/Network 摘要；Playwright CLI 可用时再录视频。
- 阻塞默认不登记缺陷。
- 根目录 `05/06` 是汇总文件，不承载子 agent 原始执行过程。

## 7. 多 Agent 协议

第一版只支持按优先级分派。

```text
主 agent：确认门禁、生成最终执行方案、分派任务、汇总结果
P0 agent：只执行 P0，只写 执行结果/P0/
P1 agent：只执行 P1，只写 执行结果/P1/
P2 agent：只执行 P2，只写 执行结果/P2/
P3 agent：只执行 P3，只写 执行结果/P3/
```

写入边界：

- 子 agent 不修改 `01-04`。
- 子 agent 不写根目录 `05-执行记录.md` 和 `06-缺陷记录.md`。
- 子 agent 不改其他优先级目录。
- 子 agent 发现规划缺口时，只在本优先级 `05-执行记录.md` 标记待确认或阻塞。
- 主 agent 根据子 agent 记录决定是否回到规划阶段修订。

冲突处理：

- 子 agent 写错目录，汇总阶段标记为协议违规，并要求修正。
- 同一用例被多个子 agent 执行，主流程按执行目录归属保留记录，并标记重复执行。
- 子 agent 无法访问环境、账号或数据时，记录为阻塞，不直接登记缺陷。

## 8. 轻量脚本

第一版包含两个脚本。

### scripts/validate-plugin.sh

用途：发布前自检插件结构。

检查项：

- `.codex-plugin/plugin.json` 存在且 JSON 可解析。
- `plugin.json` 的 `skills` 字段指向 `./skills/`。
- 6 个技能目录和各自 `SKILL.md` 存在。
- 关键模板文件存在。
- `README.md`、`docs/workflow.md`、`docs/artifact-contract.md`、`docs/agent-protocol.md` 存在。
- 输出通过和失败列表。

不负责：

- 不解析 PRD。
- 不生成真实测试用例。
- 不打开浏览器。
- 不安装依赖。

### scripts/scaffold-testing-docs.sh

用途：生成模块测试资料目录骨架。

示例：

```bash
scripts/scaffold-testing-docs.sh "/path/to/output-root" "订单管理"
```

行为：

- 创建 `<输出根目录>/easy-prd-testing/testing/<模块名>/`。
- 创建 `执行结果/P0` 至 `执行结果/P3`。
- 创建每个优先级目录下的 `screenshots/`、`videos/`、`scripts/`。
- 从模板复制 `01-04` 和各优先级 `05-06`。
- 文件已存在时不覆盖，并输出跳过信息。

不负责：

- 不填写具体测试内容。
- 不判断功能优先级。
- 不执行页面验证。

## 9. 插件元数据

`.codex-plugin/plugin.json` 建议内容：

- `name`: `easy-prd-testing`
- `version`: 从 `0.1.0` 开始
- `description`: PRD/prototype driven automation self-testing workflow for Codex
- `license`: 沿用仓库 LICENSE
- `keywords`: `prd`, `testing`, `automation`, `skills`, `codex`, `playwright`
- `skills`: `./skills/`
- `interface.displayName`: `Easy PRD Testing`
- `interface.shortDescription`: PRD/prototype based planning, execution gates, evidence and result aggregation
- `interface.category`: `Testing`
- `interface.capabilities`: `Interactive`, `Read`, `Write`
- `interface.defaultPrompt`: 包含“基于 PRD 或原型图生成自动化自测规划资料”和“根据已确认的测试资料执行页面验证并汇总结果”

## 10. 文档

第一版维护以下文档：

- `README.md`：插件用途、安装方式、使用入口、典型流程和注意事项。
- `docs/workflow.md`：6 阶段工作流、门禁和阶段流转。
- `docs/artifact-contract.md`：`01-06` 文档协议、编号规则、证据规则。
- `docs/agent-protocol.md`：单 agent 和多 agent 执行边界、写入规则、冲突处理。

## 11. 错误处理

- 输入不足：只询问 PRD、原型图或字段基线来源，不创建模块目录。
- 模块不明确：先询问模块名。
- 输出目录不明确：先询问自动化测试结果和规划资料要写入哪个输出根目录。
- 需求不明确：生成待确认问题，逐项询问。
- 规划未确认：阻止进入执行前门禁。
- 执行条件缺失：一次只询问一个缺失项。
- 依赖不可用：记录降级策略，不自动安装。
- 页面阻塞：账号、权限、测试数据、环境异常记为阻塞。
- 子 agent 冲突：汇总阶段标记协议违规并要求修正。

## 12. 测试与自检

实现后需要验证：

- `scripts/validate-plugin.sh` 能识别完整插件结构。
- `scripts/validate-plugin.sh` 能报告缺失的关键技能、模板或文档。
- `scripts/scaffold-testing-docs.sh "/tmp/easy-prd-testing-output" "示例模块"` 能生成目录骨架。
- 脚本不会覆盖已有文件。
- 每个 `SKILL.md` 都有触发条件、输入门禁、输出产物和停止条件。
- 模板中的路径、编号、优先级、证据目录与产物协议一致。
- 多 agent 规则中不存在允许子 agent 写根目录汇总文件的表述。

## 13. 验收标准

第一版完成时必须满足：

1. 仓库符合 Codex 插件标准结构。
2. 插件入口能引导用户从 PRD 或原型图开始。
3. 五个子技能职责明确，且每个阶段都有门禁、产物和停止条件。
4. 规划阶段必须先确认输出根目录，再生成 `<输出根目录>/easy-prd-testing/testing/<模块名>/01-04`，且必须显式确认后才能继续。
5. 执行阶段必须逐步确认地址、路径、登录、账号、模式和风险授权。
6. 多 agent 第一版按 `P0/P1/P2/P3` 分派，写入边界清楚。
7. 汇总阶段只从优先级目录读取结果，生成根目录 `05/06`。
8. 轻量脚本能校验插件结构、生成测试资料骨架，不承担复杂业务判断。
9. 文档能解释安装、工作流、产物协议和多 agent 协议。

## 14. 非目标

第一版不做：

- Web UI 或测试平台。
- 多端插件兼容。
- 自动安装 Chrome DevTools MCP、Playwright CLI 或其他依赖。
- 用脚本替代 agent 的 PRD 理解、测试设计或缺陷判断。
- 按模块、页面或用例批次的复杂多 agent 分派。
- 自动判定真实提交类高风险动作可执行。
