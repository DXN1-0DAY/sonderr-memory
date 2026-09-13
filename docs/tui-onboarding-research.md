# TUI Onboarding & First-Run UX Research

Modern TUIs treat first launch as a guided conversation, not a blank screen. The goal is to move users from zero to a meaningful first action in under three minutes while preserving an escape hatch for experienced users.

## 1. Core Principles

| Principle | Rationale |
|-----------|-----------|
| **First-run detection** | Track completion via sentinel file or config state; never re-prompt returning users. |
| **One clear next action** | Lead with a single primary CTA; secondary paths stay visually quieter. |
| **Keyboard-first, no traps** | Every step has a visible exit (`Esc`, `q`, `Ctrl+C`); text-entry modes protect printable quit keys. |
| **Progressive disclosure** | Show only the 20% of features needed for the first win; defer advanced options behind expand/collapse. |
| **Instant feedback** | Render something within 100ms — spinners, status lines, or a welcome screen. |
| **Reopenable flow** | Expose a slash command, key chord, or menu item to re-run setup later. |
| **Context-aware defaults** | Auto-detect existing credentials, repos, shells, or agent CLIs and import them. |

## 2. First-Run Detection

**Pattern:** Check for a sentinel file, config file, or state flag before showing onboarding.

- **Sentinel file (presence-only):** `teamctl-ui` writes an empty `ui-tutorial-completed` file under `.team/state/`. The file's existence is the contract; content is ignored for crash-safety. `teamctl-ui` also tracks a versioned `startuppopupversion` so welcome messages evolve.
- **Config absence:** `octos-tui`, `qvm`, and `jcode` check for `~/.config/<app>/` or a profile. Missing config triggers the wizard; existing config jumps straight into the main UI.
- **Credential probing:** `jcode` and `LibreFang` detect external logins (Claude Code, Codex, Copilot) or API keys before prompting. This lets them offer an "Import all" one-click path instead of forcing manual entry.

**Recommendation:** Use a single sentinel file in XDG_CONFIG_HOME. Gate all first-run UI behind `!sentinel.exists()`. Keep the file empty so crash-during-write doesn't leave a half-valid token.

## 3. Welcome Screen

The welcome screen replaces the empty-state transcript on first launch.

**Examples:**
- **octos-tui** shows a wordmark, tagline, and a short menu of setup steps. It auto-provisions its backend server in the background and drops the user on the welcome screen.
- **jcode** renders a centered onboarding block with a telemetry header, title, keyboard hint, and phase-specific body (login prompt, import summary, or suggestion cards).
- **LibreFang** differentiates first-run vs returning users at the menu level. First-run users see "Get started" as the highlighted primary action; returning users see "Chat with an agent" or "Open dashboard."

**Pattern:**
- Title / wordmark (bold, centered)
- One-sentence value proposition
- Primary action (highlighted)
- Secondary actions (dimmed)
- Footer hint bar with key bindings

## 4. Onboarding Wizard Structure

Wizards break setup into sequential steps with progress indicators.

**Step budget:** Keep it under 10 steps. `teamctl-ui` enforces `STEPS.len() <= 10` with a test and budgets each step for a ~90s skim.

**Progress indicators:**
- **Step N of M** with a checklist (`octos-tui`, `qvm`).
- **Dot row** in the footer (`Daintree`, `qvm`).
- **Phase body** that advances automatically as the backend confirms state changes (`octos-tui`).

**Common steps:**
1. Welcome / language selection
2. Profile creation (name, email, workspace)
3. Provider / model selection
4. API key entry with live connectivity test
5. Workspace validation
6. First action (open session, run doctor, launch dashboard)

**Esc hatch:** Every step must offer an escape. `octos-tui` includes an "Exit octos-tui" row because onboarding swallows `Esc`. `teamctl-ui` allows `Esc` to skip entirely and exposes the tutorial later via `t`.

## 5. Empty States as Onboarding

When the main UI has no data, the empty state is the first-run experience.

**Pattern hierarchy (from strongest to weakest):**
1. **Copyable CLI command** as the primary CTA (`kiroxy`). The action is a command snippet with a copy button — not a big button.
2. **Outcome + object headline:** "Your first project lives here" instead of "No projects yet."
3. **One primary action, one secondary:** "Create your first project" + "Import from template."
4. **Faded preview of populated state** (optional): A single demo row teaches the domain vocabulary without animation.
5. **Doc link:** "Read the account guide →"

**Anti-patterns:**
- Generic "Nothing here yet" copy.
- Big primary button in a CLI-first product.
- Apology copy ("Sorry, no data yet!").
- Same empty state for first-time, filtered, and error cases.

## 6. Suggestion Cards & Starter Prompts

After auth/setup, drop users into a suggestion screen rather than a blank input.

**Patterns:**
- **Numbered prompt cards:** `jcode` shows `[1] Summarize this repo`, `[2] Write a test for X`. Users press a number or type anything.
- **Action picker:** `jcode` offers a two-card choice — "Run a suggested Git-based bug and architecture review" vs "Start a blank new session."
- **Contextual shortcuts:** `btop` shows colored letter hints on each panel; `lazygit` shows a welcome popup with the four essential keys.

**Recommendation:** Show 3–5 starter prompts that match the detected project context. Pre-select the most common one. Keep the input field visible and focused.

## 7. External Context Detection

Modern TUIs import existing state to reduce manual work.

- **Credential import:** `jcode` scans `~/.codex/`, `~/.claude/`, and `~/.cursor/` for OAuth files and transcripts, then offers a one-click import.
- **Repo detection:** `LibreFang` detects installed CLIs and existing daemons. `qvm` scans `/sys/class/net` for bridges and `~/.ssh/` for keys.
- **Shell detection:** `BossTerm` detects the current shell (Zsh, Bash, Fish) and suggests matching customizations.

**Pattern:** Probe well-known paths in the background during the welcome screen. Show detected items as checkmarked rows. Default everything to "imported" and let the user opt out.

## 8. Recovery & Resilience

Users abandon broken TUIs fast. Build escape hatches and timeouts into every flow.

- **Decision timeouts:** `jcode` auto-selects the default Yes/No after 60s (`DECISION_TIMEOUT`) so users don't get stuck on a countdown.
- **Import watchdog:** If a login import takes >20s without confirmation, `jcode` recovers to a failure screen with a retry path.
- **Text-entry guards:** `codex-rs/tui` suppresses the printable `q` quit key only after the user starts typing in an API-key field. Empty input still exits.
- **Non-interactive fallback:** `jarvy` and `LibreFang` degrade to `--non-interactive` flags when stdin is not a TTY.

## 9. Reopening Onboarding

Experienced users should be able to re-run setup.

- **Slash command:** `octos-tui` exposes `/setup` and `/onboard` from any non-modal state.
- **Key chord:** `teamctl-ui` uses `t` (always visible as `· t tutorial` in the statusline).
- **Menu item:** `BossTerm` places "Welcome Wizard..." under Help.
- **State reset:** `lazygit` lets users clear `state.yml` to reset the welcome popup version.

## 10. Demo / Mock Mode

Let users explore without committing to configuration.

- **`octos-tui --mode mock`** opens a demo with canned replies — no server, no API key.
- **`lazygit --debug`** and `--logs` provide diagnostic surfaces without entering the main UI.
- **`blueprint-tui`** reads a `.blueprint/` directory and runs an interactive tour without requiring a real project.

## 11. Recommendations

### For any TUI
1. Detect first run via a sentinel file in XDG_CONFIG_HOME.
2. Show a centered welcome screen with one primary action and keyboard hints within 100ms of launch.
3. Keep wizards under 10 steps; show progress as dots or "Step N of M."
4. Always offer an escape hatch (`Esc`, `q`, or an explicit "Exit" row).
5. Reopen onboarding from a slash command or statusline hint.

### For stateful TUIs (agents, coding assistants)
6. Auto-detect external credentials (OAuth files, API keys, recent sessions) and offer a one-click import.
7. After setup, land users on a suggestion screen with 3–5 starter prompts, not a blank input.
8. Use a state machine with explicit transitions and a graph invariant test to prevent drift.
9. Add decision timeouts (30–60s) and import watchdogs to recover from wedged auth flows.
10. Provide a `--mode mock` or demo flag so users can explore before configuring.

### For tooling TUIs (system monitors, Git clients, infra)
11. Skip heavy onboarding; instead, show a transient welcome popup with the 3–4 essential keys and a "Don't show again" toggle.
12. Use empty states to teach: show a copyable CLI command or a single example row instead of a blank panel.
13. Pre-fetch likely context (recent repos, detected binaries, network bridges) while the user reads the welcome screen.

---

## Example: Minimal First-Run Flow

```
1. User runs `my-tui`
2. App checks ~/.config/my-tui/sentinel
3. If missing:
   a. Show welcome screen (wordmark, tagline, "Get started" highlighted)
   b. Run background pre-flight (check for git, node, API keys)
   c. Wizard Step 1: Language (en/zh) — 1 click
   d. Wizard Step 2: Profile — name, email (local only)
   e. Wizard Step 3: Provider — detect existing logins, offer import
   f. Wizard Step 4: API key — paste with live test
   g. Wizard Step 5: First action — "Open a coding session"
   h. Write sentinel file
   i. Drop into main UI with suggestion cards
4. If present: jump straight to main UI
5. At any time: `/setup` reopens the wizard
```

---

*Research compiled from octos-tui, jcode, codex-rs, cline, teamctl-ui, qvm, lazygit, btop, Daintree, blueprint-tui, db-mcp, LibreFang, kiroxy, Terraform UI, and CLI UX literature.*
