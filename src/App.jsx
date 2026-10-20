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

function getDueDatePresentation(task, today = new Date()) {
  const dateLabel = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
      new Date(year, month - 1, day),
    );
  };

  if (!task.dueDate) {
    return { label: 'No due date', color: 'text-due-neutral', background: 'bg-due-neutral/10' };
  }

  const [year, month, day] = task.dueDate.split('-').map(Number);
  const dueOrdinal = Date.UTC(year, month - 1, day);
  const todayOrdinal = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysUntil = Math.round((dueOrdinal - todayOrdinal) / 86400000);
  const date = dateLabel(task.dueDate);

  if (task.status === 'done') {
    return { label: `Done · ${date}`, color: 'text-due-neutral', background: 'bg-due-neutral/10' };
  }
  if (daysUntil < 0) {
    return { label: `Overdue · ${date}`, color: 'text-due-overdue', background: 'bg-due-overdue/10' };
  }
  if (daysUntil === 0) {
    return { label: 'Due today', color: 'text-due-warning', background: 'bg-due-warning/10' };
  }
  if (daysUntil === 1) {
    return { label: 'Due tomorrow', color: 'text-due-warning', background: 'bg-due-warning/10' };
  }
  return { label: date, color: 'text-due-safe', background: 'bg-due-safe/10' };
}

function getHandoffReadiness(task) {
  const checks = [
    { label: 'Description added', complete: Boolean(task.description?.trim()) },
    { label: 'Owner assigned', complete: Boolean(task.assignee?.trim()) },
    { label: 'AI context or development notes added', complete: Boolean(task.context?.trim()) },
    { label: 'AI tool name added', complete: Boolean(task.contextTool?.trim()) },
  ];
  return { checks, ready: checks.every((check) => check.complete) };
}

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

function TaskCard({ task, onStatusChange, onEdit, onHandoff }) {
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [newOwner, setNewOwner] = useState('');
  const isBug = task.type === 'bug';
  const typeStripe = isBug ? 'border-l-type-bug' : 'border-l-type-feature';
  const typeLabelColor = isBug ? 'text-type-bug' : 'text-type-feature';
  const dueDate = getDueDatePresentation(task);
  const deliverableCount = task.deliverables?.length || 0;
  const handoffReadiness = getHandoffReadiness(task);

  return (
    <article className={`rounded-lg border border-l-4 border-[#E2E8F0] ${typeStripe} bg-surface-card p-3 hover:shadow-sm`}>
      <button
        type="button"
        onClick={() => onEdit(task)}
        className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        aria-label={`Edit ${task.title}`}
      >
        <h3 className="text-sm font-medium text-text-primary">{task.title}</h3>
        <p className="mt-1 text-sm font-normal text-text-muted">{task.description}</p>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-medium ${typeLabelColor}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isBug ? 'bg-type-bug' : 'bg-type-feature'}`} />
          {isBug ? 'Bug' : 'Feature'}
        </span>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${dueDate.color} ${dueDate.background}`}>
          {dueDate.label}
        </span>
      </div>
      {deliverableCount > 0 && (
        <p className="mt-2 text-xs text-text-muted">{deliverableCount} {deliverableCount === 1 ? 'deliverable link' : 'deliverable links'}</p>
      )}
      <p
        role="status"
        aria-label={`AI handoff readiness: ${handoffReadiness.ready ? 'Ready' : 'Needs context'}`}
        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${handoffReadiness.ready ? 'bg-due-safe/10 text-due-safe' : 'bg-due-warning/10 text-due-warning'}`}
      >
        <span aria-hidden="true">{handoffReadiness.ready ? '✓' : '!'}</span>
        {handoffReadiness.ready ? 'Ready' : 'Needs context'}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <span className="text-xs text-text-muted">Owner</span>
        <span className="max-w-[70%] truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-text-primary" title={task.assignee}>
          {task.assignee || 'Unassigned'}
        </span>
      </div>
      {handoffOpen ? (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const owner = newOwner.trim();
            if (!owner || owner === task.assignee) return;
            onHandoff(task.id, owner);
            setNewOwner('');
            setHandoffOpen(false);
          }}
        >
          <input
            autoFocus
            aria-label={`New owner for ${task.title}`}
            placeholder="Enter name"
            value={newOwner}
            onChange={(event) => setNewOwner(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
          <button type="submit" className="rounded-md bg-brand-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-accent">Hand off</button>
          <button type="button" onClick={() => setHandoffOpen(false)} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-text-primary">Cancel</button>
        </form>
      ) : (
        <button type="button" onClick={() => setHandoffOpen(true)} className="mt-2 text-xs font-medium text-brand-primary hover:text-brand-accent">
          Hand off to…
        </button>
      )}
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

const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'feature',
  status: 'todo',
  assignee: TEAM[0],
  dueDate: '',
  context: '',
  contextTool: '',
  deliverables: [],
};

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildTaskPrompt(task) {
  const stage = STAGES.find((item) => item.id === task.status)?.label || 'Not specified';
  const type = task.type === 'feature' ? 'Feature' : task.type === 'bug' ? 'Bug' : 'Not specified';

  return [
    '# Continue Work on This Task',
    '',
    'Use the saved task information and development context below to help continue work on this task. Do not invent missing information; ask questions when more detail is needed.',
    '',
    '## Task Title',
    task.title?.trim() || 'Not specified',
    '',
    '## Description',
    task.description?.trim() || 'Not specified',
    '',
    '## Type',
    type,
    '',
    '## Current Kanban Status',
    stage,
    '',
    '## Owner',
    task.assignee?.trim() || 'Not specified',
    '',
    '## Due Date',
    task.dueDate || 'Not specified',
    '',
    '## AI Tool Used',
    task.contextTool?.trim() || 'Not specified',
    '',
    '## AI Context and Development Notes',
    task.context?.trim() || 'Not specified',
  ].join('\n');
}

function TaskModal({ task, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => task
    ? {
      ...task,
      dueDate: task.dueDate || '',
      context: task.context || '',
      contextTool: task.contextTool || '',
      deliverables: Array.isArray(task.deliverables) ? task.deliverables : [],
    }
    : EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [copyFeedback, setCopyFeedback] = useState('');
  const [deliverableErrors, setDeliverableErrors] = useState({});
  const isEditing = Boolean(task);
  const handoffReadiness = getHandoffReadiness(task || {});

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  }

  function updateDeliverable(index, field, value) {
    setForm((current) => ({
      ...current,
      deliverables: current.deliverables.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
    setDeliverableErrors((current) => ({ ...current, [index]: undefined }));
  }

  function validateDeliverables(deliverables) {
    const nextErrors = {};
    deliverables.forEach((item, index) => {
      const label = item.label.trim();
      const url = item.url.trim();
      if (!label && !url) return;
      if (!label) nextErrors[index] = 'Add a short label for this link.';
      else if (!url) nextErrors[index] = 'Enter a URL for this link.';
      else if (!isValidHttpUrl(url)) nextErrors[index] = 'Enter a valid http:// or https:// URL.';
    });
    return nextErrors;
  }

  async function copySavedTaskContext() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable in this browser context.');
      }
      await navigator.clipboard.writeText(buildTaskPrompt(task));
      setCopyFeedback('Copied. Paste it into your AI chat.');
    } catch {
      setCopyFeedback('Could not copy the prompt. Check clipboard permission and try again.');
    }
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Enter a task title.';
    if (!form.description.trim()) nextErrors.description = 'Enter a task description.';
    if (!form.assignee.trim()) nextErrors.assignee = 'Enter an owner name.';
    setErrors(nextErrors);
    const nextDeliverableErrors = validateDeliverables(form.deliverables);
    setDeliverableErrors(nextDeliverableErrors);
    if (Object.keys(nextErrors).length || Object.keys(nextDeliverableErrors).length) return;
    onSave({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate || null,
      context: form.context.trim(),
      contextTool: form.contextTool.trim() || null,
      deliverables: form.deliverables
        .filter((item) => item.label.trim() && item.url.trim())
        .map((item) => ({ label: item.label.trim(), url: item.url.trim() })),
      contextUpdatedAt: (() => {
        const contextChanged = (form.context.trim() !== (task?.context || ''))
          || ((form.contextTool.trim() || null) !== (task?.contextTool || null));
        if (contextChanged) return new Date().toISOString();
        return task?.contextUpdatedAt || null;
      })(),
    });
  }

  const fieldClass = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="task-modal-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-surface-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="task-modal-title" className="font-heading text-lg font-semibold text-text-primary">{isEditing ? 'Edit task' : 'Add task'}</h2>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-text-muted hover:bg-slate-100" aria-label="Close dialog">×</button>
        </div>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="task-title" className="text-sm font-medium text-text-primary">Title <span aria-hidden="true">*</span></label>
            <input id="task-title" name="title" value={form.title} onChange={updateField} className={fieldClass} autoFocus aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined} />
            {errors.title && <p id="title-error" className="mt-1 text-xs text-due-overdue" role="alert">{errors.title}</p>}
          </div>
          <div>
            <label htmlFor="task-description" className="text-sm font-medium text-text-primary">Description <span aria-hidden="true">*</span></label>
            <textarea id="task-description" name="description" rows="3" value={form.description} onChange={updateField} className={fieldClass} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-error' : undefined} />
            {errors.description && <p id="description-error" className="mt-1 text-xs text-due-overdue" role="alert">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm font-medium text-text-primary">Type
              <select name="type" value={form.type} onChange={updateField} className={fieldClass}>
                <option value="feature">Feature</option><option value="bug">Bug</option>
              </select>
            </label>
            <label className="text-sm font-medium text-text-primary">Status
              <select name="status" value={form.status} onChange={updateField} className={fieldClass}>
                {STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-text-primary">Assignee
              <input name="assignee" value={form.assignee} onChange={updateField} className={fieldClass} placeholder="Enter owner name" aria-invalid={Boolean(errors.assignee)} />
              {errors.assignee && <span className="mt-1 block text-xs text-due-overdue" role="alert">{errors.assignee}</span>}
            </label>
            <label className="text-sm font-medium text-text-primary">Due date
              <input type="date" name="dueDate" value={form.dueDate} onChange={updateField} className={fieldClass} />
            </label>
          </div>
          <div>
            <label htmlFor="task-context" className="text-sm font-medium text-text-primary">AI context and development notes</label>
            <p className="mt-1 text-xs text-text-muted">Add prompts, decisions, or details that will help continue this task.</p>
            <textarea
              id="task-context"
              name="context"
              rows="4"
              value={form.context}
              onChange={updateField}
              className={fieldClass}
              placeholder="What should the next person or AI know?"
            />
          </div>
          <div>
            <label htmlFor="task-context-tool" className="text-sm font-medium text-text-primary">AI tool used <span className="font-normal text-text-muted">(optional)</span></label>
            <input
              id="task-context-tool"
              name="contextTool"
              value={form.contextTool}
              onChange={updateField}
              className={fieldClass}
              placeholder="e.g. Cursor, GitHub Copilot, Codex"
            />
          </div>
          <section aria-labelledby="handoff-readiness-heading" className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 id="handoff-readiness-heading" className="text-sm font-semibold text-text-primary">Handoff readiness</h3>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${handoffReadiness.ready ? 'bg-due-safe/10 text-due-safe' : 'bg-due-warning/10 text-due-warning'}`}>
                {handoffReadiness.ready ? 'Ready' : 'Needs context'}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {isEditing ? 'Based on saved task details.' : 'Readiness updates after you save the task.'}
            </p>
            <ul className="mt-2 space-y-1">
              {handoffReadiness.checks.map((check) => (
                <li key={check.label} className={`flex items-center gap-2 text-xs ${check.complete ? 'text-due-safe' : 'text-due-warning'}`}>
                  <span aria-hidden="true" className="font-semibold">{check.complete ? '✓' : '!'}</span>
                  <span>{check.label}</span>
                  <span className="ml-auto font-medium">{check.complete ? 'Complete' : 'Missing'}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="deliverables-heading" className="space-y-3 border-t border-slate-100 pt-4">
            <div>
              <h3 id="deliverables-heading" className="text-sm font-semibold text-text-primary">Deliverables</h3>
              <p className="mt-1 text-xs text-text-muted">Attach repositories, pull requests, designs, deployments, or documentation.</p>
            </div>
            {(form.deliverables || []).map((deliverable, index) => (
              <div key={index} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium text-text-muted">Link {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, deliverables: current.deliverables.filter((_, itemIndex) => itemIndex !== index) }));
                      setDeliverableErrors((current) => {
                        const remaining = {};
                        Object.entries(current).forEach(([key, message]) => {
                          if (Number(key) < index) remaining[key] = message;
                          if (Number(key) > index) remaining[Number(key) - 1] = message;
                        });
                        return remaining;
                      });
                    }}
                    className="text-xs font-medium text-due-overdue hover:underline"
                    aria-label={`Remove deliverable link ${index + 1}`}
                  >Remove</button>
                </div>
                <label className="mt-2 block text-xs font-medium text-text-primary" htmlFor={`deliverable-label-${index}`}>Label</label>
                <input id={`deliverable-label-${index}`} value={deliverable.label} onChange={(event) => updateDeliverable(index, 'label', event.target.value)} className={fieldClass} placeholder="e.g. GitHub repository" />
                <label className="mt-2 block text-xs font-medium text-text-primary" htmlFor={`deliverable-url-${index}`}>URL</label>
                <input id={`deliverable-url-${index}`} type="url" value={deliverable.url} onChange={(event) => updateDeliverable(index, 'url', event.target.value)} className={fieldClass} placeholder="https://…" aria-invalid={Boolean(deliverableErrors[index])} />
                {deliverableErrors[index] && <p role="alert" className="mt-1 text-xs text-due-overdue">{deliverableErrors[index]}</p>}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, deliverables: [...(current.deliverables || []), { label: '', url: '' }] }))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-text-primary hover:bg-slate-50"
            >Add deliverable link</button>
            {(form.deliverables || []).some((item) => item.label.trim() && item.url.trim()) && (
              <div className="space-y-1 rounded-md bg-slate-50 p-3">
                <p className="text-xs font-medium text-text-muted">Saved links</p>
                {form.deliverables.filter((item) => item.label.trim() && item.url.trim() && isValidHttpUrl(item.url.trim())).map((item, index) => (
                  <a key={`${item.url}-${index}`} href={item.url.trim()} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-brand-primary underline hover:text-brand-accent">
                    {item.label.trim()}
                  </a>
                ))}
              </div>
            )}
          </section>
          {isEditing && (
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={copySavedTaskContext}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                Copy as Prompt Context
              </button>
              {copyFeedback && (
                <p role="status" aria-live="polite" className={`mt-2 text-sm ${copyFeedback.startsWith('Copied') ? 'text-due-safe' : 'text-due-overdue'}`}>
                  {copyFeedback}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-text-muted">* Required fields</p>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            {isEditing ? (
              <button type="button" onClick={onDelete} className="rounded-md px-3 py-2 text-sm font-medium text-due-overdue hover:bg-red-50">Delete task</button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-text-primary hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-accent">{isEditing ? 'Save changes' : 'Add task'}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useLocalStorage('vibetracker.tasks', SEED_TASKS);
  const [activeTask, setActiveTask] = useState(undefined);
  const [notice, setNotice] = useState('');

  function saveTask(form) {
    if (activeTask) {
      setTasks((current) => current.map((item) => item.id === activeTask.id ? { ...item, ...form } : item));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setTasks((current) => [...current, {
        ...form,
        id: globalThis.crypto?.randomUUID?.() || `task-${Date.now()}`,
        createdDate: today,
      }]);
    }
    setActiveTask(undefined);
  }

  function deleteTask() {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setTasks((current) => current.filter((item) => item.id !== activeTask.id));
    setActiveTask(undefined);
  }

  function changeTaskStatus(taskId, status) {
    setTasks((currentTasks) => currentTasks.map((task) => (
      task.id === taskId ? { ...task, status } : task
    )));
  }

  function handoffTask(taskId, assignee) {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, assignee } : task));
    setNotice(`Handed off to ${assignee}.`);
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

      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => setActiveTask(null)} className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-primary/30">Add task</button>
      </div>
      {notice && (
        <p role="status" aria-live="polite" className="mb-4 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-due-safe">
          {notice}
        </p>
      )}
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
                    <TaskCard key={task.id} task={task} onEdit={setActiveTask} onStatusChange={changeTaskStatus} onHandoff={handoffTask} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </main>
      {activeTask !== undefined && (
        <TaskModal
          key={activeTask?.id || 'new-task'}
          task={activeTask}
          onClose={() => setActiveTask(undefined)}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}
