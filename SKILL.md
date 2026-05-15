---
name: easy-prd-testing
description: Use when PRD or prototype based module self-testing needs a two-stage system for planning documents, browser automation execution, field comparison, and failure evidence.
---

# Easy PRD Testing

## 体系入口

本 skill 是 PRD 自动化自测体系的父级入口。它只负责判断当前任务应进入哪个阶段，并加载体系内对应子流程。

## 阶段选择

用户提供 `PRD`、产品原型图、字段基线或希望生成自动化自测资料时，读取并执行：

- `prd-test-planning/SKILL.md`

用户已经确认 `01-04` 规划资料，并要求执行页面验证、字段比对、失败取证或汇总执行结果时，读取并执行：

- `prd-test-execution/SKILL.md`

## 阶段边界

1. 规划阶段只生成和维护 `01-04`，不得进入页面执行。
2. 执行阶段必须基于用户确认后的 `01-04`，不得跳过测试路径、登录方式和执行模式确认。
3. 字段差异、失败取证、视频录制、缺陷归档和最终汇总只属于执行阶段。
4. 如果执行阶段发现规划资料缺失或未确认，先阻塞并回到规划阶段补齐。

## 目录说明

- `prd-test-planning/`：PRD/原型图解析、模块拆解、测试用例、执行清单、测试数据与账号。
- `prd-test-execution/`：依赖检查、Chrome DevTools MCP 执行、Playwright CLI 失败录制、执行记录、缺陷记录。
