# Vibecoding Project Tracker — Design Guide

**Status:** Design system implemented and updated to match the current prototype.

## 1. Mood and visual direction

Calm studio board, not a busy Jira clone: quiet surfaces, strong type, and color that only speaks when it means stage, task type or deadline.

References:

- [Linear](https://linear.app) — sparse cards and a restrained accent.
- [Notion](https://www.notion.so/product) — white cards on a cool grey page.
- [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) — readable columns and visible task status.

The interface uses light mode. Task cards use a type stripe and a separate due-date chip. Stage headers use a narrow color bar; column backgrounds remain neutral.

## 2. Implemented color tokens

These values are defined in `tailwind.config.js`. Several text colors were darkened from the starter palette to improve contrast on the light UI while preserving the original color roles.

### Brand and surfaces

| Token | Hex | Use |
|---|---|---|
| `brand-primary` | `#0F766E` | Primary buttons, identity mark and focus outline |
| `brand-accent` | `#0F5F59` | Hover links and button accents |
| `surface-page` | `#F4F6F8` | Page background |
| `surface-card` | `#FFFFFF` | Cards and dialogs |
| `text-primary` | `#0F172A` | Main text |
| `text-muted` | `#596579` | Captions, dates and counts |

### Task type

| Token | Hex | Use |
|---|---|---|
| `type-feature` | `#4F46E5` | Feature stripe and label |
| `type-bug` | `#C026D3` | Bug stripe and label |

### Due-date states

| Token | Hex | Use |
|---|---|---|
| `due-safe` | `#065F46` | At least two days remaining |
| `due-warning` | `#92400E` | Due today or tomorrow |
| `due-overdue` | `#B91C1C` | Past due |
| `due-neutral` | `#526174` | Completed task or no due date |

Date rules use local calendar days, not elapsed hours. Completed status takes priority over the date; no deadline uses neutral; a past date is overdue; today and tomorrow are warning; two or more days away is safe. Date state appears on a chip, never as a full-card fill.

Stage header bars use `text-muted` for To Do, `brand-primary` for In Progress, `due-warning` for Review and `due-safe` for Done.

## 3. Typography

| Role | Font | Use |
|---|---|---|
| Heading and body | Plus Jakarta Sans, with system fallbacks | Interface headings and prose |
| Monospace | System monospace stack | Small metadata where applicable |

Plus Jakarta Sans is loaded from the stylesheet referenced by `index.html` and mapped in `tailwind.config.js`. Typical sizes are 24px for the page heading, 16px for section headings, 14px for card/body text and 12px for metadata.

## 4. Layout and responsive behavior

The desktop composition retains the four-column board and four Anchor Board slots. At smaller widths the content reflows instead of forcing four narrow columns:

| Viewport | Kanban board | Anchor Board | Login choices |
|---|---|---|---|
| Phone, below 640px | One status column per row | One card per row | One choice per row |
| Small/tablet, 640–767px | One status column per row | Two cards per row | One choice per row |
| Tablet, 768–1023px | Two statuses per row | Two cards per row | Three choices per row |
| Desktop, 1024px and wider | Four statuses per row | Four cards per row | Three choices per row |

The task dialog is limited to the viewport height and scrolls internally. Its form fields stack on phone widths and use two columns at wider widths. Page padding, headings, card content and actions wrap to avoid narrow-screen overflow. Several controls use approximately 40px or larger touch targets.

## 5. Components and interactions

- **Task cards:** white surface, subtle slate border, left type stripe, due-date chip, title/description, owner and readiness indicator. Task title/description and URLs wrap when long.
- **Status movement:** a labelled select on every card, rather than drag and drop.
- **Primary buttons:** solid brand color, white text and rounded corners. Secondary buttons use a white surface and slate border. Destructive actions use red text and a confirmation prompt.
- **Task dialog:** centered white card over a dark translucent backdrop; viewport-constrained and internally scrollable on small screens.
- **Empty states:** dashed border and one short line of text.
- **Anchor Board:** four fixed labelled project slots. Users add/edit or remove each URL.
- **Handoff:** the owner selector opens inline; submit records the selected demo-user ID as owner and latest handoff recipient. Cancel and submit return focus to the handoff trigger.

## 6. Simulated login and data-sharing boundary

The login screen presents the predefined demo users by name, role and example.edu email. It does not request credentials or establish identity. The selected user ID is remembered in `vibetracker.currentUserId`; all selected users share the task board and project links stored in the same browser's localStorage. The UI tells users the board is shared in that browser. This is a single-project prototype, not a multi-user service.

## 7. Accessibility implementation

The app uses semantic buttons, forms, headings, fieldsets and labels, with accessible names for task, status, handoff and link controls. Validation feedback is associated with relevant fields; success messages use status announcements and errors use alert semantics. State is communicated with text and symbols as well as color.

Keyboard and focus behavior implemented in the prototype:

- A task dialog receives focus when opened, traps Tab and Shift+Tab among visible controls, and closes on Escape without saving.
- While the dialog is open, the application content behind it is `inert` and hidden from assistive technology. Closing restores focus to the triggering control (or the Add task control if the trigger no longer exists).
- Handoff and Anchor Board edit/cancel flows return focus to their triggering controls.
- A global, solid 3px teal `:focus-visible` outline with 2px offset is used, including on controls with local focus styles.

These are implementation details and do not establish full WCAG 2.2 AA compliance. Manual screen-reader, browser and rendered-contrast checks are still needed; contrast can vary with rendering, context and browser settings.

## 8. Voice and feedback

| Where | Current copy/behavior |
|---|---|
| Main create action | `Add task` |
| Empty status column | `No tasks in this stage.` |
| Successful context copy | `Copied. Paste it into your AI chat.` |
| Delete confirmation | `Delete this task? This cannot be undone.` |
| Successful handoff | `Handed off to {name}.` |
| Storage failure | Accessible warning says which data could not be read/saved and that changes may not survive refresh; offers `Retry storage`. |

Action feedback is announced without moving keyboard focus. A task save that fails reports that the change is only in the current session rather than claiming it was saved.

## 9. Wordmark and scope

- **Product name:** Vibecoding Project Tracker.
- **Wordmark:** Plus Jakarta Sans semibold with a small brand-primary square before the title.
- **Current scope:** one light theme, one project, predefined demo users, local browser storage and no real-time collaboration.
- **Not included:** real authentication, a backend, account permissions, multiple teams, a dark-mode switch or an icon dependency.
