# Browser Execution Protocol

Apply this protocol before the first navigation for each page or key flow and whenever a browser recheck encounters an unknown page state. Follow the same behavior with `agent-browser`, Playwright Test, or a DevTools diagnostic backend.

## Select the reconnaissance path

- For static HTML, inspect the source or rendered DOM first, identify stable structure and targets, then wait for the document and target element to become ready.
- For a dynamic application, confirm readiness through observable product state: expected URL or title, visible heading or region, enabled control, rendered data, completed key response, or a disappeared loading indicator.
- Do not require `networkidle`. Background polling, analytics, streaming, or long-lived connections can keep a healthy application busy. Prefer web-first assertions or an equivalent retrying observation tied to the expected UI state.
- If no reliable readiness signal exists, record the chosen fallback, timeout, and evidence limitation instead of treating elapsed time alone as proof of readiness.

## Establish observation before navigation

Before navigation or a failure-prone key operation, enable only the observation channels supported and needed by the confirmed backend:

- Console errors and relevant warnings.
- Uncaught page errors.
- Failed requests and key responses with 4xx, 5xx, timeout, CORS, or redirect-loop symptoms.
- URL changes and redirects when navigation is part of the expected behavior.

Register listeners before the event they must capture. Keep successful-run output concise. Persist detailed logs, trace, HAR, screenshots, or video only when required by the evidence rules or diagnosis. Never claim an observation channel that the backend did not produce.

## Execute the reconnaissance loop

1. **Enter:** Open the confirmed URL or page and record the actual URL, redirect result, and start condition.
2. **Confirm readiness:** Wait for an observable page-specific condition or web-first assertion. If it does not appear within the confirmed threshold, capture the current state and classify the result before escalating.
3. **Reconnoitre:** Inspect the rendered DOM and visible state; use a screenshot when layout, overlays, canvas, or visual state affects the next action.
4. **Choose a locator:** Select the most stable locator available and record risk when forced to use a fragile one.
5. **Act:** Confirm the target is visible and actionable, perform one meaningful operation, and avoid blind retries that could duplicate a submission or other side effect.
6. **Assert:** Verify the user-visible outcome and, when relevant, the key response or persisted state. Do not infer success from a click completing without error.
7. **Classify:** Use exactly one first-run status: `通过`, `失败`, `阻塞`, `未测`, or `待确认`. Separate a reproducible product mismatch from missing environment, account, permission, data, dependency, or insufficient evidence.
8. **Preserve evidence:** On failure or blockage, save the required evidence and diagnostic context before closing a page, browser session, or temporary service.
9. **Clean up:** Release only resources owned by this run and record the cleanup outcome.

## Choose locators by stability

Use the first suitable locator in this order:

1. Role plus accessible name.
2. Associated label.
3. Stable test ID.
4. Stable user-visible text.
5. Stable CSS based on durable attributes.

Use DOM depth, generated classes, positional selectors such as `nth-child`, or transient text only as a last resort. When a fragile locator is unavoidable, record why it was used, the affected step, and the script-drift risk. Do not silently replace an ambiguous match with the first element.

## Preserve evidence before cleanup

For a failed operation, capture the current URL, relevant visible state, screenshot, Console summary, Network summary, and video or diagnostic artifact when available. Record observation gaps when a channel is unavailable. Escalate through the backend sequence defined in `SKILL.md` only when the collected evidence cannot classify or reproduce the result.

Use this cleanup order even after failure or interruption:

1. Finish writing evidence files and Markdown references.
2. Close pages, contexts, or priority-isolated browser sessions created by this run.
3. Stop a temporary application service only when this run started it.
4. Record cleanup success, failure, and any resource intentionally retained.

Do not log out, clear storage, delete cookies, close a user-owned browser session, or stop a pre-existing service when the execution plan says to reuse it. For reused sessions, close only run-owned pages when doing so cannot disturb the user's state.

## Preserve backend compatibility

- Keep `agent-browser` as the default first-run backend and retain priority-isolated sessions in multi-agent mode.
- Save Playwright Test regression script drafts only when the final execution plan requests script persistence or when a P0/P1 failure needs future regression. Do not turn draft generation into a prerequisite for first-run execution.
- Use Chrome DevTools CLI and then Chrome DevTools MCP only under the diagnostic escalation rules in `SKILL.md`.
- When a backend cannot implement an observation or cleanup step, record the downgrade and evidence gap, then continue only if the remaining evidence is sufficient.
