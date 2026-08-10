---
name: self-update
description: Check and safely upgrade the complete Easy PRD Testing Skill or Plugin installation to the latest stable release. Use when the user expresses an intent to upgrade, update, sync, or check the version of Easy PRD Testing, its Skills, or its Plugin, even without an exact command. Do not treat test-case updates, test-environment upgrades, negated requests, hypothetical questions, or general upgrade advice as authorization to run an update.
---

# Self Update

Use the repository updater as the only mutation engine. Keep version discovery read-only, show the confirmed release before changing files, and never improvise copy, pull, or overwrite commands.

## Route The Request

- Treat phrases such as “升级版本”, “更新 Skills”, “同步最新版”, and “检查插件更新” as update intent when the object or current context is Easy PRD Testing.
- When the update object is ambiguous, ask whether the user means the complete Easy PRD Testing installation.
- For negated, hypothetical, or explanatory requests, explain the behavior without running the updater.
- Do not route “更新测试用例”, “升级测试环境”, XMind refreshes, or product-version testing here.

## Check Before Confirmation

1. Do not update while the current conversation is in execution-gate, test-execution, result-aggregation, or regression-testing. Ask the user to finish or stop that active workflow first.
2. Resolve the repository root from this file as `../..`. Do not scan for other installations.
3. Require Node.js 18 or newer. If it is unavailable, tell the user how to install it; never install it automatically.
4. Run the read-only check:

```bash
node <repository-root>/scripts/easy-prd-testing.mjs check --json
```

5. If the installation is current, ahead, incompatible, symlinked, incomplete, or unsupported, report the returned reason and stop. Do not invent a fallback mutation.
6. When an update is available, show the installation path and type, current and target versions, 3–5 release highlights, the Release Notes link, and any local changes.

## Confirm Once

- Ask one explicit question to install the displayed target release.
- If a managed installation contains local modifications, state that a successful update permanently deletes them and does not keep a backup. Treat only an explicit acceptance of that loss as force authorization.
- Never force-update a Git installation with changes.
- Do not treat a vague acknowledgement as permission to add `--force`.

## Install The Confirmed Release

Use exactly the version and digest returned by the check:

```bash
node <repository-root>/scripts/easy-prd-testing.mjs upgrade \
  --to v<target-version> \
  --expected-digest <sha256:digest-from-check> \
  --expected-state <sha256:local-state-from-check> \
  --yes \
  --json
```

Add `--force` only after the managed-copy overwrite confirmation above. Do not replace the command with `git pull`, a Skill installer, manual copying, or direct Release extraction.

## Report The Result

- On success, report the previous and current versions, installation path and type, SHA-256 verification, validation result, and Release Notes link.
- Tell the user to start a new AI session or reload the current tool's Skills or Plugin. Do not claim that the current context hot-reloaded.
- On failure, report the structured error and confirm that the original installation remains in place when the updater says so.
- Keep the response in the user's language.
