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
