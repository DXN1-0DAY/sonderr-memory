# Reddit Research: Memory & Knowledge Management Tool Preferences

> Sources: r/selfhosted, r/productivity, r/ProductivityApps, r/noteTaking, r/ObsidianMD, r/logseq, r/Notion

---

## 1. What Users Actually Want

### Ownership & Portability
- Plain-text / Markdown files are the baseline expectation for serious users.
- Users are deeply wary of vendor lock-in, cloud-only architectures, and data-loss incidents.
- "Your files should still be yours" is a recurring litmus test.

### Fast, Low-Friction Capture
- Capture must be near-instant — users consistently complain about friction when jotting a thought on mobile.
- Many describe a need for a "dumping ground" that requires zero pre-categorization.
- The tool should stay out of the way; filing/organizing can happen later or be automated.

### AI That Works For Them, Not Around Them
- Auto-tagging, auto-linking, and surfacing related notes are the most desired AI features.
- Users want AI to reduce manual maintenance — not add another workflow to manage.
- Frustration is high when AI summaries are unreliable, models are hidden, or context gets truncated.

### Search That Scales
- A recurring complaint across every major app: search feels like an afterthought.
- Users want fast, precise search over large vaults — fuzzy, semantic, and block-level.
- Many resort to VS Code "find in file" as a workaround, signaling a real gap.

### Unified Workspace, Not App Stacking
- Strong desire for a single tool that handles notes, tasks, habits, time tracking, and calendar — rather than duct-taping five apps together.
- When tools specialize too narrowly, users feel the overhead of context-switching.

### Calm, Not Cluttered
- A noticeable backlash against "productivity porn" — users are exhausted by complex setups and plugin rabbit holes.
- Simplicity and reliability are preferred over feature sprawl.

---

## 2. Pain Points With Existing Tools

### Obsidian
- **Plugin bloat / overwhelm** — power is there, but the onboarding cost is high.
- **Mobile editing is buggy** — cursor jumping, text duplication, block rendering issues.
- **Embedding experience is incomplete** — embedding canvases or notes feels 90% done.
- **Search is not good enough** for large vaults; users want native improvements.
- **Journaling is possible but not native** — requires daily notes plugins to compete with Logseq.

### Logseq
- **Sync is the #1 frustration** — long-running issues with reliability, memory leaks, and performance on large graphs.
- **DB version transition** creates uncertainty; users are hesitant to commit.
- **Asset / image management** is messy — random filenames, duplicates, and stability issues.
- **Performance degradation** with many embedded blocks, even on strong hardware.
- **Documentation is weak** for a tool that prides itself on structured thinking.
- **PDF and export** workflows are inconsistent.

### Notion
- **Speed and reliability** — loading times, page resets, content disappearing during AI edits.
- **Hard database limits** that feel arbitrary after years of "limitless" positioning.
- **No true offline mode** — a deal-breaker for users who need access anywhere.
- **Steep learning curve** combined with limited customization at the UI level (fonts, margins, colors).
- **AI integration is shallow** — no direct database property editing, context limits, and unreliable summaries.
- **Data-loss incidents** with no easy restore path erode trust.
- **Missing core features** — simple time calculations, granular sharing, recurring tasks, habit tracking.

### Self-Hosted Ecosystem
- **Fragmentation** — users test many apps before settling, indicating none fully satisfies.
- **Mobile support is inconsistent** — many self-hosted apps are desktop-only or have weak mobile UIs.
- **Sync is a DIY puzzle** — users cobble together Syncthing, Git, WebDAV, or self-hosted backends.
- **Setup and maintenance overhead** — especially for non-technical users who still want data ownership.
- **Plugin ecosystems are small** compared to Obsidian, limiting extensibility.

### General Across All Tools
- **Capture vs. synthesis gap** — tools excel at hoarding information but offer little help distilling it.
- **Knowledge graph fatigue** — users feel the graph is decorative rather than useful.
- **Export / migration is painful** — moving between apps often loses formatting, links, or attachments.
- **AI is marketed, not integrated** — features feel bolted-on rather than foundational.

---

## 3. Opportunity Themes

| Theme | What Users Are Saying |
|---|---|
| **Auto-organization** | "I never organize my notes — the model should do it." |
| **Block-native** | Queries, references, and tasks at the block level are table stakes for power users. |
| **Offline-first + sync** | Must work without connectivity; sync should be transparent, not a feature unlock. |
| **One workspace** | Notes, tasks, habits, calendar, and time tracking in one place. |
| **Open data** | Markdown or equivalent; users want to leave any app without data loss. |
| **Fast search** | Fuzzy, semantic, block-level — over large vaults, instantly. |
| **AI as infrastructure** | Summarization, linking, tagging, and Q&A over the user's own knowledge base. |
| **Mobile parity** | Capture and review on phone must be as good as desktop. |

---

## 4. Representative Quotes

> "I just want a better search." — r/ObsidianMD

> "How is it 2025 and writing a quick note on mobile is still this hard?" — r/PKMS

> "I love the journal and tagging feature of Logseq DB, but I don't care for the database file." — r/ObsidianMD

> "The application has not changed since I've started using it in 2023. No communication from the devs." — r/logseq

> "These tools are great at hoarding information but terrible at helping me distill it. And the work is always on me." — r/PKMS

> "A few thousand notes later, it's just an unreadable hairball. It feels like productivity porn more than something that actually helps me think." — r/PKMS

> "Why in the year 2025 can we still not calculate the total of time spent on a given task?" — r/Notion
