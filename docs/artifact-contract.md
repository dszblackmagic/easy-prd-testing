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
