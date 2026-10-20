# Vibecoding Project Tracker — Design

**Status:** `design-done` · M3 design system filled in.

**Why this file exists.** This tracker is your tool. It should look like *your* tool — not a generic Kanban with default Tailwind blue. Twenty minutes of design decisions here will be visible on every screen for the next six weeks of Module 5.

**Who owns this.** Person B, during the same window the rest of the team is reviewing the PRD. By the time the team converges to start M4 (`data-model`), this file should be filled in and the colors should already be in `tailwind.config.js`.

---

## 1. Mood / vibe

One sentence that captures the feeling the tracker should leave you with.

Calm studio board, not a busy Jira clone: quiet surfaces, strong type, and colour that only speaks when it means stage, task type, or deadline.

Two or three references that capture the vibe (links to dribbble shots, screenshots of apps you admire, Pinterest boards — anything visual):

- [Linear](https://linear.app) — sparse cards, one accent, no chrome
- [Notion](https://www.notion.so/product) — white cards on a cool grey page
- [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) — readable columns, status obvious at a glance

Anti-references — what we are explicitly **not** trying to look like:

- Default Tailwind indigo page with drop shadows on everything; rainbow Kanban columns; neon dark-mode “hacker” dashboards

---

## 2. Color palette

These are the colors the build milestones will reference. Once chosen, paste the hex values into `tailwind.config.js` so the rest of the team can use Tailwind utility classes (e.g. `bg-brand-primary`, `border-due-warning`).

Light mode only. Two colour channels on cards, never mixed:

1. **Type** = a 4px **left stripe** (`type-feature` / `type-bug`).
2. **Due date** = a small **date chip** (`due-*`). Warning and overdue chips stay high-contrast.

**Stages** reuse existing tokens as a 3px bar on the column header (no extra palette):

| Column | Header bar token |
|---|---|
| To Do | `text-muted` |
| In Progress | `brand-primary` |
| Review | `due-warning` |
| Done | `due-safe` |

Column bodies stay the same pale page grey so the cards carry the meaning.

### Brand

| Token | Hex | Where it shows up |
|---|---|---|
| `brand-primary` | `#0F766E` | Header, "+" button, focus rings |
| `brand-accent` | `#0D9488` | Highlights, hover states, links |
| `surface-page` | `#F4F6F8` | Page background |
| `surface-card` | `#FFFFFF` | Card background |
| `text-primary` | `#0F172A` | Body text |
| `text-muted` | `#64748B` | Captions, dates, counts |

### Task type (M6 `tag-style`)

Feature and bug must not share red/green with due states.

| Token | Hex | When used |
|---|---|---|
| `type-feature` | `#4F46E5` | Cards tagged `feature` (accent stripe + icon) |
| `type-bug` | `#C026D3` | Cards tagged `bug` (accent stripe + icon) |

### Due-date states (M8 `due-tint`)

| Token | Hex | When used |
|---|---|---|
| `due-safe` | `#059669` | Two or more full calendar days remaining |
| `due-warning` | `#D97706` | Due today or tomorrow (0–48 hours on a date-only scale) |
| `due-overdue` | `#B91C1C` | Past due |
| `due-neutral` | `#64748B` | Done (overrides date), or no due date |

#### Unambiguous due-date colour rule

`Task.dueDate` is an ISO calendar date (`YYYY-MM-DD`) with no time. Compare **local calendar days**, not clock milliseconds. Let `daysUntil` be `dueDate − today` in whole days.

Apply the **first matching** rule:

1. If `status` is `done`, use **`due-neutral`**. This overrides the date, including overdue and due-today tasks that are already finished.
2. If `dueDate` is `null`, use **`due-neutral`** (no deadline to warn about).
3. If `daysUntil < 0`, use **`due-overdue`**.
4. If `daysUntil` is `0` or `1`, use **`due-warning`**.
   - `0` = due today (under 24 hours on a date-only scale).
   - `1` = due tomorrow (**the 24–48 hour window**).
5. If `daysUntil >= 2`, use **`due-safe`**.

There is no uncoloured gap: every task hits exactly one of the four tokens.

| `status` | `dueDate` | `daysUntil` | Token |
|---|---|---|---|
| `done` | any, including null | any | `due-neutral` |
| not `done` | `null` | n/a | `due-neutral` |
| not `done` | set | `< 0` | `due-overdue` |
| not `done` | set | `0` (today) | `due-warning` |
| not `done` | set | `1` (tomorrow, 24–48h) | `due-warning` |
| not `done` | set | `>= 2` | `due-safe` |

Use these colours on a **chip**, not a full-card fill, so a fuchsia bug stripe and a red overdue chip can both stay visible.

---

## 3. Typography

| Role | Font | Why |
|---|---|---|
| Heading | Plus Jakarta Sans | Geometric, modern dashboard titles without default Inter/Roboto. |
| Body | Plus Jakarta Sans | Same family keeps the UI quiet; 14px regular stays easy to scan. |
| Monospace (tags, badges, code) | ui-monospace, SFMono, Menlo | Tags and tool names read as metadata, not prose; no extra font file. |

Loaded in `index.html` (Google Fonts stylesheet for Plus Jakarta Sans weights 400 / 500 / 600). Mapped in `tailwind.config.js` as `font-sans` / `font-heading` and `font-mono`. Not an npm dependency.

Suggested sizes (override only if the design demands it):

- Page title: 24 px / semibold
- Section header: 16 px / semibold uppercase
- Card title: 14 px / medium
- Body: 14 px / regular
- Caption: 12 px / regular muted

---

## 4. Component principles

One short sentence per element. These set the tone for the build phase — Person A's modal and Person B's anchor board should both feel like they came from this doc.

- **Cards:** White, 1px `#E2E8F0` border, `rounded-lg`, no shadow until hover (`shadow-sm`); left type stripe; due chip top-right; title 14px medium; meta 12px muted.
- **Buttons:** Solid `brand-primary`, white label, `rounded-md`, no gradient; secondary is white with a slate border; delete uses overdue red text, not a red fill, until confirm.
- **Modal:** Centered, `max-w-md`, white `surface-card`, slate-900 backdrop at 50% opacity; field spacing matches the card so add/edit feel like the board.
- **Empty states:** Dashed border, `text-muted`, one short line; never an illustration or apology.
- **Drag affordance (if used):** None — we use a status dropdown.

---

## 5. Voice / microcopy

Three lines of microcopy that capture the tone of the product. Keep it short — these are the words a stressed user reads at 11pm.

| Where | Text |
|---|---|
| "+" button label | `Add task` |
| Empty column placeholder | `No tasks in this stage.` |
| Toast after "Copy as Prompt Context" | `Copied. Paste it into your AI chat.` |
| Confirm-delete message | `Delete this task? This cannot be undone.` |
| Handoff toast (M7 `task-owner`) | `Handed off to {name}.` |

---

## 6. Logo / wordmark

The tracker probably doesn't need a logo, but it does need a name and a wordmark style.

- **Product name:** Vibecoding Project Tracker
- **Wordmark style:** The name in Plus Jakarta Sans semibold, `text-primary`, with an 8px `brand-primary` square before it; no icon set.

---

## 7. Out of scope (this hackathon)

To keep design tight, the following are explicitly not part of `design-done`:

- A dark mode toggle. Pick one mode and ship it.
- Multiple themes. One brand, applied consistently.
- Animations beyond a 200 ms fade on toast notifications.
- A custom icon set. Use [Lucide icons](https://lucide.dev) via Tailwind classes if you need any.

---

*DESIGN.md version: hackathon-starter v1*
