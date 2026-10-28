# Vibecoding Project Tracker — Product Requirements

**Document status:** Assessment-aligned description of the current prototype
**Updated:** 28 October 2026

## 1. Problem and users

Vibecoding teams need a lightweight way to see task progress and retain the AI prompts, outputs and development notes that produced a task. General-purpose project tools can be unnecessarily complex for a small course project, while informal notes make it difficult to continue work or hand it to a teammate.

- **Primary users:** the student team building and demonstrating this prototype.
- **Secondary users:** future students working on similar coursework.

## 2. Product scope

The prototype is a single-project React web application with two main surfaces:

- A four-column Kanban board with To Do, In Progress, Review and Done statuses.
- An Anchor Board with fixed Presentation, Demo, Report and Documentation slots.

Tasks can include an owner, dates, category, AI development record, handoff information and labelled deliverable URLs. Users can copy a Markdown task briefing to continue work in an AI chat.

This is a **single-project prototype**, not a real authenticated multi-user service. Login is a choice among predefined demo users. The selected user ID, tasks and project links are stored in that browser's localStorage. All demo users using the same browser and origin see the same board. There is no account verification, server, shared database or cross-device synchronization.

## 3. Main user flows

1. Select a predefined demo user on the demonstration login screen. No password or registration is requested.
2. View tasks in the four status columns. Add a task or open a card to edit its information.
3. Move a task with its status selector, assign an owner, or hand it off to a team member.
4. Record the AI tool, prompt history, output and additional development context separately.
5. Add labelled task links and use **Copy as Prompt Context** to copy the saved task briefing. Unsaved edits are not included in the copy.
6. Add or update links in the four project-level Anchor Board slots.

## 4. Data model

The implementation stores JSON in three localStorage keys: `vibetracker.tasks`, `vibetracker.anchors` and `vibetracker.currentUserId`.

```js
User = {
  id: string,       // stable predefined demo ID
  name: string,
  email: string,
  role: string,
}

Task = {
  id: string,
  title: string,
  description: string,
  type: 'feature' | 'bug',
  status: 'todo' | 'in-progress' | 'review' | 'done',
  assigneeId: string,                 // ID from the predefined demo-user list
  assignee?: string,                  // legacy name retained only if it cannot be matched
  dueDate: string | null,             // ISO calendar date, YYYY-MM-DD
  createdDate: string,                // ISO calendar date, YYYY-MM-DD
  contextTool: string | null,
  aiPrompt: string,
  aiResult: string,
  context: string,                    // additional development notes/context
  contextUpdatedAt: string | null,    // ISO timestamp updated when AI context changes
  handoffRecipientId: string | null,  // most recent handoff recipient
  handoffNotes: string,
  handoffReadiness: {
    checks: Array<{ label: string, complete: boolean }>,
    ready: boolean,
  } | null,
  deliverables: Array<{ label: string, url: string }>,
}

Anchor = {
  id: 'presentation' | 'demo' | 'report' | 'documentation',
  label: string,
  url: string | null,
}
```

The predefined users are Maya Patel (`demo-junior`, Junior Developer), Daniel Evans (`demo-senior`, Senior Developer) and Ashil Shaju (`demo-manager`, Project Manager). Their example.edu addresses are included in the demo-user records and shown on the login screen. `assigneeId` and `handoffRecipientId` reference these IDs; names and roles are looked up for display.

When older tasks contain a name in `assignee`, exact matches are migrated to the matching stable ID. An unmatched legacy name is retained and shown for the user to resolve; it is not guessed. A handoff updates the current `assigneeId` and records the same person as `handoffRecipientId`. The app records the latest recipient, not a handoff history.

Handoff readiness is derived from four checks: description added, owner assigned, AI context/development notes added, and AI tool name added. The current readiness result and its checks are stored with the task. Prompt/result fields, handoff notes and deliverable URLs are not readiness checks.

## 5. Technology and persistence decisions

| Area | Implementation |
|---|---|
| UI | React 18 with Vite |
| Styling | Tailwind CSS 3 and the tokens in `tailwind.config.js` |
| State | React state and a small `useLocalStorage` hook in `src/App.jsx` |
| Storage helpers | `src/storagePersistence.js`; tests use Node's built-in test runner |
| Persistence | Browser localStorage; no backend or external storage service |
| Entry point | `src/main.jsx` renders the single `App` component |

The hook detects storage access, parsing/validation, serialization and write errors. It keeps changes in memory when a write fails, warns that they may not survive refresh, and offers a retry. Failed initial reads and invalid saved JSON are not automatically replaced with defaults. If retry would replace data that remains unreadable or invalid, the user must confirm; readable saved data can be recovered instead.

localStorage is scoped to a browser profile and origin. Clearing browser data, using another device/profile, private browsing restrictions, or persistent storage failures can prevent recovery or sharing. This persistence choice intentionally supports the course prototype, not collaboration across devices.

## 6. Statuses and team

The four status IDs and display labels are:

| ID | Label |
|---|---|
| `todo` | To Do |
| `in-progress` | In Progress |
| `review` | Review |
| `done` | Done |

Team identity is represented by the predefined demo-user records in `src/App.jsx`. The login is simulated and does not authenticate or authorize users.

## 7. Assessment requirements

The IDs, descriptions and MVP classifications below are the authoritative assessment mapping.

### Functional requirements

| ID | Requirement | Scope |
|---|---|---|
| FR1 | Four-column Kanban board | MVP |
| FR2 | Create, view, edit and delete tasks | MVP |
| FR3 | Move tasks between statuses | MVP |
| FR4 | Simulated login with predefined users | MVP |
| FR5 | Assign tasks to team members | MVP |
| FR6 | Record AI tools, prompts and results | MVP |
| FR7 | Preserve task data across refreshes | MVP |
| FR8 | Deadlines and due-date indicators | Non-MVP |
| FR9 | Feature/Bug categories | Non-MVP |
| FR10 | Task deliverable links | Non-MVP |
| FR11 | Handoff notes and readiness indicators | Non-MVP |
| FR12 | Copy saved task context | Non-MVP |
| FR13 | Project-level deliverable links | Non-MVP |

### Non-functional requirements

| ID | Requirement | Scope |
|---|---|---|
| NFR1 | Accessibility | MVP |
| NFR2 | Usability | MVP |
| NFR3 | Performance | MVP |
| NFR4 | Reliability | MVP |
| NFR5 | Browser compatibility | MVP |
| NFR6 | Responsive design | MVP |
| NFR7 | Data privacy | MVP |
| NFR8 | Visual consistency | Non-MVP |
| NFR9 | Maintainability | Non-MVP |
| NFR10 | Error prevention and feedback | MVP |

### Data requirements

| ID | Requirement | Scope |
|---|---|---|
| DR1 | User ID, name and email | MVP |
| DR2 | Task ID, title and description | MVP |
| DR3 | Task status | MVP |
| DR4 | Assigned user ID | MVP |
| DR5 | AI tool, prompts and results | MVP |
| DR6 | Creation dates and deadlines | Non-MVP |
| DR7 | Feature/Bug category | Non-MVP |
| DR8 | Handoff notes, recipient and readiness | Non-MVP |
| DR9 | Task deliverable labels and URLs | Non-MVP |
| DR10 | Project deliverable labels and URLs | Non-MVP |

## 8. Implementation notes and limits

- The task board, task CRUD, stage changes, demo-user selection, assignments, AI records, task links, project links, due-date indicators and context copy are implemented in `src/App.jsx`.
- Current breakpoint behavior uses a single-column board on phones, two columns on medium screens and four columns at large screens. Anchor cards use one, two and four columns at the corresponding small/large breakpoints.
- Accessibility improvements include labelled controls, validation associations, visible focus, a keyboard-trapped task dialog, inert/hidden background content while it is open, focus restoration, and status/alert announcements. Manual keyboard checks have been reported. These checks do not establish full WCAG 2.2 AA conformance.
- NFR3 targets common actions completing in under one second. Local state changes are synchronous, but no measured performance benchmark is recorded; measure on representative devices if timing evidence is required.
- NFR5 should be backed by a recorded Chrome, Edge and Firefox test matrix; a successful Vite build alone does not establish browser compatibility.
- The main UI and domain logic remain concentrated in `src/App.jsx`; storage helper logic is separated, but maintainability is still limited by the size of the main component.
- **Copy as Prompt Context** includes title, description, type, status, owner, deadline, AI tool, prompts, result and additional context. It does not currently serialize handoff notes, handoff recipient/readiness or task deliverable URLs.
- There is no backend, account security, per-user board, multi-project support or real-time collaboration.

## 9. Design and project context

The visual direction remains a calm studio board: light surfaces, strong typography and restrained color for task type, deadlines and status. `DESIGN.md` records the palette, responsive behavior, keyboard/accessibility treatment and component guidance.

The original milestone sequence (data model, CRUD, task owner, due dates, AI context/copy and Anchor Board) remains useful project history. This document describes the implemented prototype rather than treating the starter PRD's `<TODO>` values or old requirement numbering as current specifications.
