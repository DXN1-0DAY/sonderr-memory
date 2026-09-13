# TUI Feedback & Responsiveness Research

## 1. Loading States

Modern TUIs use explicit, state-driven loading indicators rather than silent blocking. Patterns include:

- **Inline spinners / progress bars**: Reserve space so layout doesn't shift (e.g., Bubble Tea `spinner.TickMsg`, ratatui `Gauge`/`LineGauge`).
- **Action verb by tool state**: Show semantic messages per phase (pending → "Planning...", running → tool title, completed → result, error → `{ToolName}: {errorMessage}`).
- **Reserved lines / zero-refactor log ports**: Keep output viewports stable and append logs as-is (Build Your Own Coding Agent pattern).
- **Progressive disclosure**: Show light indicators early, full content only after completion.

## 2. Async Feedback

Async work is communicated through the event loop, not blocking calls:

- **Channel-based messaging**: `tokio::sync::mpsc` or `UnboundedSender<Event>` from background tasks back to the UI loop. Avoid shared mutable state across threads.
- **`tokio::select!` multiplexing**: Main loop waits on input stream + tick interval + background result channel in one non-blocking select.
- **Progress updates**: Send `Progress(current, total)` messages so renderer can update a bar without redrawing everything.
- **Cancellation tokens**: Long operations should be cancellable; UI exposes a cancel action and drops the token.

## 3. Error Handling

- **Dedicated error events**: Send typed `Event::Error` rather than panicking or printing to stdout.
- **Contextual error surfaces**: Red border / background, include tool name and human-readable message.
- **Graceful degradation**: Terminal resize, raw mode failures, and event stream errors should recover or exit cleanly with `color-eyre` / structured reporting.
- **Non-blocking app suspension**: When launching editors/git clients, suspend the TUI, stop the event handler, then restore terminal state on return.

## 4. Status Messaging

- **Status line / footer**: Render tool name, subagent status, and active todo inline (e.g., `⠹ thinking... · research`).
- **State lifecycle**: Pending → running → completed/error mapped to consistent visual states.
- **Truncation + tooltip**: Truncate long paths/content in constrained widths; expose full value on hover/expand.

## 5. Keeping Flow Without Breaking It

- **Separate render and tick rates**: Render at ~30–60 fps, tick at lower frequency for state-only updates.
- **Stderr for TUI rendering**: Leave stdout available for piped subprocess output.
- **Debounced input**: Filter/reduce spam from fast keystrokes before heavy async work.
- **Mode-aware input**: Approval/confirm states block agent logic via channel, not by freezing `Update`.

## Recommendations

1. Define a small `Status` enum (`Idle`, `Loading {message}`, `Progress {current, total}`, `Success`, `Error`) and derive rendering + sound from it.
2. Route all background work through typed channels; never mutate UI state directly from a spawned task.
3. Reserve layout space for feedback indicators so resize and log appends don't cause jitter.
4. Always include context in errors: tool/command name + user-actionable message.
5. Keep stdout clean for programmatic use; render only on stderr/alternate screen.
