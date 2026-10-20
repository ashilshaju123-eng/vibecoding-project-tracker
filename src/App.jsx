import { useState, useEffect } from 'react';

/**
 * Vibecoding Project Tracker — starter scaffold.
 *
 * This file is intentionally almost empty. The boilerplate (Vite, React,
 * Tailwind) is configured for you, plus a few shared constants and a
 * localStorage helper. Everything visible on screen, you build.
 *
 * Where to start (build sequence in Phase 3):
 *   - M4  data-model    : render the four columns and the task cards below.
 *   - M5  crud-modal    : add the "+" button modal and the edit-on-click modal.
 *   - M6  tag-style     : feature vs. bug color coding (uses DESIGN.md §2 colors).
 *   - M7  task-owner    : assignee badge + "Hand off to..." dropdown.
 *   - M8  due-tint      : color cards by due date (uses DESIGN.md §2 due-state colors).
 *   - M9  context       : a curated Context briefing field on the modal.
 *   - M10 copy-prompt   : a "Copy as Prompt Context" button that serializes the task + context.
 *   - M11 anchors       : the Anchor Board above the Kanban.
 *   - M12 secret-sauce  : the one open-ended thing that makes your tracker yours.
 *
 * Search the file for `TODO M<n>` to find the right hook for each milestone.
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'feature'|'bug'} type
 * @property {'todo'|'in-progress'|'review'|'done'} status
 * @property {string} assignee
 * @property {string|null} dueDate     ISO 'YYYY-MM-DD'
 * @property {string} createdDate      ISO 'YYYY-MM-DD'
 */

// The four columns of the board, in render order.
// Use these IDs everywhere — do not invent new ones.
export const STAGES = [
  { id: 'todo',        label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review',      label: 'Review' },
  { id: 'done',        label: 'Done' },
];

const STAGE_BAR = {
  todo: 'bg-text-muted',
  'in-progress': 'bg-brand-primary',
  review: 'bg-due-warning',
  done: 'bg-due-safe',
};

// Names from PRD §8 — the only valid values for Task.assignee.
export const TEAM = ['Ashil Shaju'];

const SEED_TASKS = [
  {
    id: 'task-prd-review',
    title: 'Review the project PRD',
    description: 'Confirm the locked task schema, stages, and MVP scope before building the board.',
    type: 'feature',
    status: 'done',
    assignee: 'Ashil Shaju',
    dueDate: '2026-10-18',
    createdDate: '2026-10-16',
  },
  {
    id: 'task-kanban-board',
    title: 'Render the four-column Kanban board',
    description: 'Show To Do, In Progress, Review and Done with sample cards from localStorage.',
    type: 'feature',
    status: 'in-progress',
    assignee: 'Ashil Shaju',
    dueDate: '2026-10-20',
    createdDate: '2026-10-19',
  },
  {
    id: 'task-empty-column',
    title: 'Empty Review column looks broken',
    description: 'Check that a stage with no cards still shows the empty-state copy instead of collapsing.',
    type: 'bug',
    status: 'todo',
    assignee: 'Ashil Shaju',
    dueDate: '2026-10-22',
    createdDate: '2026-10-20',
  },
  {
    id: 'task-modal-fields',
    title: 'Add the task create and edit modal',
    description: 'Collect title, description, type, assignee and due date. Modal is milestone M5.',
    type: 'feature',
    status: 'todo',
    assignee: 'Ashil Shaju',
    dueDate: '2026-10-23',
    createdDate: '2026-10-20',
  },
];

/**
 * A tiny localStorage hook — survives reloads, no library needed.
 *
 * Usage:
 *   const [tasks, setTasks] = useLocalStorage('vibetracker.tasks', []);
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or private-mode error — silently ignore for hackathon */
    }
  }, [key, value]);

  return [value, setValue];
}

function TaskCard({ task, onStatusChange }) {
  const typeStripe = task.type === 'bug' ? 'border-l-type-bug' : 'border-l-type-feature';

  return (
    <article className={`rounded-lg border border-l-4 border-[#E2E8F0] ${typeStripe} bg-surface-card p-3 hover:shadow-sm`}>
      <h3 className="text-sm font-medium text-text-primary">{task.title}</h3>
      <p className="mt-1 text-sm font-normal text-text-muted">{task.description}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-text-muted">{task.type}</span>
        {task.dueDate ? (
          <span className="text-xs text-text-muted">{task.dueDate}</span>
        ) : null}
      </div>
      <label className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-text-muted">
        <span>Move to</span>
        <select
          aria-label={`Move ${task.title} to another stage`}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          value={task.status}
          onChange={(event) => onStatusChange(task.id, event.target.value)}
        >
          {STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
        </select>
      </label>
    </article>
  );
}

export default function App() {
  const [tasks, setTasks] = useLocalStorage('vibetracker.tasks', SEED_TASKS);

  function changeTaskStatus(taskId, status) {
    setTasks((currentTasks) => currentTasks.map((task) => (
      task.id === taskId ? { ...task, status } : task
    )));
  }

  // TODO M5 crud-modal:
  //   const [editing, setEditing] = useState(null);
  //
  // TODO M11 anchors:
  //   const [anchors, setAnchors] = useLocalStorage('vibetracker.anchors', [...]);

  return (
    <div className="min-h-screen bg-surface-page p-6 font-sans text-text-primary">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold text-text-primary">
            <span className="inline-block h-2 w-2 bg-brand-primary" aria-hidden="true" />
            Vibecoding Project Tracker
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Ashil Shaju
          </p>
        </div>
      </header>

      {/* TODO M11 anchors: render the Anchor Board (Presentation / Demo / Report / Documentation) above the board. */}

      {/*
        TODO M5 crud-modal:
          Add a "+" button that opens a modal with every Task field.
          Clicking a card should open the same modal in edit mode.
      */}
      <main className="grid grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const columnTasks = tasks.filter((task) => task.status === stage.id);

          return (
            <section key={stage.id} className="min-h-[24rem]">
              <div className={`h-[3px] w-full ${STAGE_BAR[stage.id]}`} />
              <div className="mt-3 flex items-baseline justify-between">
                <h2 className="text-base font-semibold uppercase tracking-wide text-text-primary">
                  {stage.label}
                </h2>
                <span className="text-xs text-text-muted">{columnTasks.length}</span>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {columnTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#E2E8F0] px-3 py-6 text-center text-sm text-text-muted">
                    No tasks in this stage.
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onStatusChange={changeTaskStatus} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
