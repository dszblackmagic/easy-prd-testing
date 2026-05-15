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

When enough information exists for planning, produce a concise intake summary.

Create `00-资料分析与待确认问题.md` only after both module name and output root directory are confirmed. The file must be placed under:

```text
<output-root>/easy-prd-testing/testing/<module-name>/
```

If the output root is not confirmed, output the intake summary in chat only and do not create files.

Do not generate `01-04`; that belongs to `test-planning`.
