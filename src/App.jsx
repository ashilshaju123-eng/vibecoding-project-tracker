import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { readStoredValue, resolveStorageRetry, writeStoredValue } from './storagePersistence.js';

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
 * @property {string} assigneeId
 * @property {string} assignee Legacy name retained when it cannot be matched safely
 * @property {string|null} handoffRecipientId
 * @property {string} handoffNotes
 * @property {{checks: Array<{label: string, complete: boolean}>, ready: boolean}|null} handoffReadiness
 * @property {string|null} dueDate     ISO 'YYYY-MM-DD'
 * @property {string} createdDate      ISO 'YYYY-MM-DD'
 * @property {string} contextTool     AI tool used (optional)
 * @property {string} aiPrompt        AI prompt history (optional)
 * @property {string} aiResult        AI result or output (optional)
 * @property {string} context         Additional/legacy AI development context (optional)
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

// Stable IDs are stored on tasks; names and roles are resolved for display.
export const DEMO_USERS = [
  { id: 'demo-junior', name: 'Maya Patel', email: 'maya.patel@example.edu', role: 'Junior Developer' },
  { id: 'demo-senior', name: 'Daniel Evans', email: 'daniel.evans@example.edu', role: 'Senior Developer' },
  { id: 'demo-manager', name: 'Ashil Shaju', email: 'ashil.shaju@example.edu', role: 'Project Manager' },
];

export const TEAM = DEMO_USERS;

function getUser(userId) {
  return DEMO_USERS.find((user) => user.id === userId) || null;
}

function getTaskAssignee(task) {
  return getUser(task.assigneeId) || (task.assignee
    ? { id: null, name: task.assignee, role: 'Unmatched legacy assignment' }
    : null);
}

function normalizeTask(task) {
  if (task.assigneeId) return task;
  const matchedUser = DEMO_USERS.find((user) => user.name === task.assignee);
  if (matchedUser) return { ...task, assigneeId: matchedUser.id, assignee: '' };
  return { ...task, assigneeId: '', assignee: task.assignee || '' };
}

function getTaskReadiness(task) {
  return task.handoffReadiness || getHandoffReadiness(task);
}

const ANCHOR_SLOTS = [
  { id: 'presentation', label: 'Presentation', url: null },
  { id: 'demo', label: 'Demo', url: null },
  { id: 'report', label: 'Report', url: null },
  { id: 'documentation', label: 'Documentation', url: null },
];

function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
    { label: 'Owner assigned', complete: Boolean(task.assigneeId || task.assignee?.trim()) },
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
    assigneeId: 'demo-manager',
    dueDate: '2026-10-18',
    createdDate: '2026-10-16',
  },
  {
    id: 'task-kanban-board',
    title: 'Render the four-column Kanban board',
    description: 'Show To Do, In Progress, Review and Done with sample cards from localStorage.',
    type: 'feature',
    status: 'in-progress',
    assigneeId: 'demo-manager',
    dueDate: '2026-10-20',
    createdDate: '2026-10-19',
  },
  {
    id: 'task-empty-column',
    title: 'Empty Review column looks broken',
    description: 'Check that a stage with no cards still shows the empty-state copy instead of collapsing.',
    type: 'bug',
    status: 'todo',
    assigneeId: 'demo-manager',
    dueDate: '2026-10-22',
    createdDate: '2026-10-20',
  },
  {
    id: 'task-modal-fields',
    title: 'Add the task create and edit modal',
    description: 'Collect title, description, type, assignee and due date. Modal is milestone M5.',
    type: 'feature',
    status: 'todo',
    assigneeId: 'demo-manager',
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
export function useLocalStorage(key, initialValue, validateValue = () => true) {
  const [initialState] = useState(() => {
    try {
      return readStoredValue(window.localStorage, key, initialValue, validateValue);
    } catch (error) {
      return { value: initialValue, error, readFailed: true, missing: false };
    }
  });
  const [value, setValue] = useState(initialState.value);
  const valueRef = useRef(initialState.value);
  const [storageError, setStorageError] = useState(initialState.error);
  const [readFailed, setReadFailed] = useState(initialState.readFailed);
  const readFailedRef = useRef(initialState.readFailed);
  const dirtyRef = useRef(false);
  const missingRef = useRef(initialState.missing);

  function persist(nextValue) {
    try {
      const result = writeStoredValue(window.localStorage, key, nextValue);
      if (!result.saved) throw result.error;
      setStorageError(null);
      setReadFailed(false);
      readFailedRef.current = false;
      dirtyRef.current = false;
      return { saved: true };
    } catch (error) {
      setStorageError(error);
      dirtyRef.current = true;
      return { saved: false, error };
    }
  }

  function updateValue(nextValueOrUpdater) {
    const nextValue = typeof nextValueOrUpdater === 'function'
      ? nextValueOrUpdater(valueRef.current)
      : nextValueOrUpdater;
    valueRef.current = nextValue;
    setValue(nextValue);
    if (readFailedRef.current) {
      dirtyRef.current = true;
      return { saved: false, error: storageError };
    }
    return persist(nextValue);
  }

  function retryPersistence() {
    if (readFailedRef.current && !dirtyRef.current) {
      try {
        const recovered = readStoredValue(window.localStorage, key, valueRef.current, validateValue);
        if (recovered.readFailed) throw recovered.error;
        valueRef.current = recovered.value;
        setValue(recovered.value);
        readFailedRef.current = false;
        setReadFailed(false);
        if (!recovered.missing) {
          setStorageError(null);
          return { saved: true, loaded: true };
        }
        return persist(recovered.value);
      } catch (error) {
        setStorageError(error);
        return { saved: false, error };
      }
    }
    if (readFailedRef.current && dirtyRef.current) {
      let resolution;
      try {
        resolution = resolveStorageRetry(
          window.localStorage,
          key,
          validateValue,
          (message) => window.confirm(message),
        );
      } catch (error) {
        setStorageError(error);
        return { saved: false, error };
      }
      if (resolution.action === 'recover-existing') {
        valueRef.current = resolution.value;
        setValue(resolution.value);
        setStorageError(null);
        setReadFailed(false);
        readFailedRef.current = false;
        dirtyRef.current = false;
        return { saved: true, recovered: true };
      }
      if (resolution.action === 'cancel') {
        const error = resolution.error || storageError;
        setStorageError(error);
        return { saved: false, cancelled: true, error };
      }
      readFailedRef.current = false;
      setReadFailed(false);
    }
    return persist(valueRef.current);
  }

  useEffect(() => {
    if (!missingRef.current || readFailedRef.current) return;
    missingRef.current = false;
    persist(valueRef.current);
  }, [key]);

  return [value, updateValue, storageError, retryPersistence, readFailed];
}

function getStorageWarning(key, error, readFailed) {
  if (!error) return '';
  const label = key === 'vibetracker.tasks'
    ? 'Task data'
    : key === 'vibetracker.anchors'
      ? 'Project deliverables'
      : 'Demo user selection';
  const reason = error instanceof SyntaxError
    ? 'Saved data is invalid or corrupted.'
    : error.name === 'QuotaExceededError'
      ? 'Browser storage is full.'
      : error.name === 'SecurityError'
        ? 'The browser blocked access to local storage.'
        : 'The browser could not access local storage.';
  return `${label}: ${readFailed ? 'could not be read. Existing data was left untouched. ' : 'could not be saved. '}${reason} Changes may not survive a refresh.`;
}

function isTaskData(value) {
  return Array.isArray(value) && value.every((task) => (
    task && typeof task === 'object' && typeof task.id === 'string'
    && typeof task.title === 'string' && typeof task.status === 'string'
  ));
}

function isAnchorData(value) {
  return Array.isArray(value) && value.every((anchor) => (
    anchor && typeof anchor === 'object' && typeof anchor.id === 'string'
    && typeof anchor.label === 'string'
  ));
}

function TaskCard({ task, onStatusChange, onEdit, onHandoff }) {
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');
  const handoffTriggerRef = useRef(null);
  const assignee = getTaskAssignee(task);
  const isBug = task.type === 'bug';
  const typeStripe = isBug ? 'border-l-type-bug' : 'border-l-type-feature';
  const typeLabelColor = isBug ? 'text-type-bug' : 'text-type-feature';
  const dueDate = getDueDatePresentation(task);
  const deliverableCount = task.deliverables?.length || 0;
  const handoffReadiness = getTaskReadiness(task);

  function closeHandoff() {
    setHandoffOpen(false);
    requestAnimationFrame(() => handoffTriggerRef.current?.focus());
  }

  return (
    <article className={`min-w-0 rounded-lg border border-l-4 border-[#E2E8F0] ${typeStripe} bg-surface-card p-3 hover:shadow-sm`}>
      <button
        type="button"
        onClick={() => onEdit(task)}
        className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        aria-label={`Edit ${task.title}`}
      >
        <h3 className="break-words text-sm font-medium text-text-primary [overflow-wrap:anywhere]">{task.title}</h3>
        <p className="mt-1 break-words text-sm font-normal text-text-muted [overflow-wrap:anywhere]">{task.description}</p>
      </button>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
        aria-label={`AI handoff readiness: ${handoffReadiness.ready ? 'Ready' : 'Needs context'}`}
        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${handoffReadiness.ready ? 'bg-due-safe/10 text-due-safe' : 'bg-due-warning/10 text-due-warning'}`}
      >
        <span aria-hidden="true">{handoffReadiness.ready ? '✓' : '!'}</span>
        {handoffReadiness.ready ? 'Ready' : 'Needs context'}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <span className="text-xs text-text-muted">Owner</span>
        <span className="min-w-0 max-w-[75%] break-words rounded-full bg-slate-100 px-2.5 py-1 text-right text-xs font-medium text-text-primary [overflow-wrap:anywhere]" title={assignee?.name || 'Unassigned'}>
          {assignee ? `${assignee.name}${assignee.id ? ` · ${assignee.role}` : ' (needs matching)'}` : 'Unassigned'}
        </span>
      </div>
      {handoffOpen ? (
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newOwnerId || newOwnerId === task.assigneeId) return;
            onHandoff(task.id, newOwnerId);
            closeHandoff();
          }}
        >
          <select
            autoFocus
            aria-label={`New owner for ${task.title}`}
            value={newOwnerId}
            onChange={(event) => setNewOwnerId(event.target.value)}
            className="min-h-10 min-w-0 basis-full flex-1 rounded-md border border-slate-300 bg-white px-2 py-2 text-xs focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 sm:basis-0"
          >
            <option value="">Select team member</option>
            {TEAM.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}
          </select>
          <button type="submit" className="min-h-10 rounded-md bg-brand-primary px-3 py-2 text-xs font-medium text-white hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">Hand off</button>
          <button type="button" onClick={closeHandoff} className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">Cancel</button>
        </form>
      ) : (
        <button ref={handoffTriggerRef} type="button" onClick={() => setHandoffOpen(true)} className="mt-2 min-h-10 text-left text-xs font-medium text-brand-primary hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">
          Hand off to…
        </button>
      )}
      <label className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-text-muted">
        <span>Move to</span>
        <select
          aria-label={`Move ${task.title} to another stage`}
          className="min-h-10 min-w-0 max-w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
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
  assigneeId: TEAM[0].id,
  assignee: '',
  handoffRecipientId: null,
  handoffNotes: '',
  handoffReadiness: null,
  dueDate: '',
  context: '',
  contextTool: '',
  aiPrompt: '',
  aiResult: '',
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
    getTaskAssignee(task)?.name || 'Not specified',
    '',
    '## Due Date',
    task.dueDate || 'Not specified',
    '',
    '## AI Tool Used',
    task.contextTool?.trim() || 'Not specified',
    '',
    '## AI Prompt(s)',
    task.aiPrompt?.trim() || 'Not specified',
    '',
    '## AI Result / Output',
    task.aiResult?.trim() || 'Not specified',
    '',
    '## Additional AI Context and Development Notes',
    task.context?.trim() || 'Not specified',
  ].join('\n');
}

function TaskModal({ task, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => task
    ? {
      ...task,
      assigneeId: task.assigneeId || '',
      assignee: task.assignee || '',
      handoffRecipientId: task.handoffRecipientId || null,
      handoffNotes: task.handoffNotes || '',
      dueDate: task.dueDate || '',
      context: task.context || '',
      contextTool: task.contextTool || '',
      aiPrompt: task.aiPrompt || '',
      aiResult: task.aiResult || '',
      deliverables: Array.isArray(task.deliverables) ? task.deliverables : [],
    }
    : EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [copyFeedback, setCopyFeedback] = useState('');
  const [deliverableErrors, setDeliverableErrors] = useState({});
  const [validationAttempt, setValidationAttempt] = useState(0);
  const isEditing = Boolean(task);
  const handoffReadiness = getHandoffReadiness(form);

  const dialogRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => (
        !element.hidden && element.getAttribute('aria-hidden') !== 'true'
        && element.getClientRects().length > 0
      ));
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const currentIndex = focusable.indexOf(document.activeElement);
      if (currentIndex === -1) {
        event.preventDefault();
        (event.shiftKey ? focusable.at(-1) : focusable[0]).focus();
      } else if (event.shiftKey && currentIndex === 0) {
        event.preventDefault();
        focusable.at(-1).focus();
      } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
        event.preventDefault();
        focusable[0].focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  useEffect(() => {
    const firstControl = dialogRef.current?.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
    firstControl?.focus();
  }, []);
  useEffect(() => {
    const invalidControl = dialogRef.current?.querySelector('[aria-invalid="true"]');
    invalidControl?.focus();
  }, [validationAttempt]);
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
    if (!form.assigneeId && !form.assignee.trim()) nextErrors.assigneeId = 'Choose an owner or resolve the unmatched legacy name.';
    setErrors(nextErrors);
    const nextDeliverableErrors = validateDeliverables(form.deliverables);
    setDeliverableErrors(nextDeliverableErrors);
    setValidationAttempt((attempt) => attempt + 1);
    if (Object.keys(nextErrors).length || Object.keys(nextDeliverableErrors).length) return;
    onSave({
      ...form,
      assignee: form.assigneeId ? '' : form.assignee,
      handoffReadiness: getHandoffReadiness(form),
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate || null,
      context: form.context.trim(),
      contextTool: form.contextTool.trim() || null,
      aiPrompt: form.aiPrompt.trim(),
      aiResult: form.aiResult.trim(),
      deliverables: form.deliverables
        .filter((item) => item.label.trim() && item.url.trim())
        .map((item) => ({ label: item.label.trim(), url: item.url.trim() })),
      contextUpdatedAt: (() => {
        const contextChanged = (form.context.trim() !== (task?.context || ''))
          || ((form.contextTool.trim() || null) !== (task?.contextTool || null))
          || (form.aiPrompt.trim() !== (task?.aiPrompt || ''))
          || (form.aiResult.trim() !== (task?.aiResult || ''));
        if (contextChanged) return new Date().toISOString();
        return task?.contextUpdatedAt || null;
      })(),
    });
  }

  const fieldClass = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-2 sm:p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="task-modal-title" tabIndex={-1} className="my-auto max-h-[calc(100dvh-1rem)] w-full min-w-0 max-w-md overflow-y-auto rounded-lg bg-surface-card p-4 sm:max-h-[90vh] sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="task-modal-title" className="font-heading text-lg font-semibold text-text-primary">{isEditing ? 'Edit task' : 'Add task'}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="min-h-10 min-w-10 rounded px-2 py-1 text-text-primary hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">×</button>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <select name="assigneeId" value={form.assigneeId} onChange={updateField} className={fieldClass} aria-invalid={Boolean(errors.assigneeId)} aria-describedby={errors.assigneeId ? 'assignee-error' : undefined}>
                <option value="">Select team member</option>
                {TEAM.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}
              </select>
              {form.assignee && !form.assigneeId && <span className="mt-1 block text-xs text-due-warning">Unmatched saved owner: {form.assignee}. Choose the correct team member to resolve it.</span>}
              {errors.assigneeId && <span id="assignee-error" className="mt-1 block text-xs text-due-overdue" role="alert">{errors.assigneeId}</span>}
            </label>
            <label className="text-sm font-medium text-text-primary">Due date
              <input type="date" name="dueDate" value={form.dueDate} onChange={updateField} className={fieldClass} />
            </label>
          </div>
          <section aria-labelledby="ai-record-heading" className="space-y-4">
            <div>
              <h3 id="ai-record-heading" className="text-sm font-semibold text-text-primary">AI Development Record</h3>
              <p className="mt-1 text-xs text-text-muted">All fields are optional. Record the tool, what you asked, and the result.</p>
            </div>
            <div>
              <label htmlFor="task-context-tool" className="text-sm font-medium text-text-primary">AI Tool Used <span className="font-normal text-text-muted">(optional)</span></label>
              <input
                id="task-context-tool"
                name="contextTool"
                value={form.contextTool}
                onChange={updateField}
                className={fieldClass}
                placeholder="e.g. ChatGPT, Cursor, Codex, Claude"
              />
            </div>
            <div>
              <label htmlFor="task-ai-prompt" className="text-sm font-medium text-text-primary">AI Prompt(s) <span className="font-normal text-text-muted">(optional)</span></label>
              <textarea
                id="task-ai-prompt"
                name="aiPrompt"
                rows="4"
                value={form.aiPrompt}
                onChange={updateField}
                className={fieldClass}
                placeholder="What did you ask the AI to do? Include follow-up prompts if useful."
              />
            </div>
            <div>
              <label htmlFor="task-ai-result" className="text-sm font-medium text-text-primary">AI Result / Output <span className="font-normal text-text-muted">(optional)</span></label>
              <textarea
                id="task-ai-result"
                name="aiResult"
                rows="4"
                value={form.aiResult}
                onChange={updateField}
                className={fieldClass}
                placeholder="What did the AI produce, and what happened when you used it?"
              />
            </div>
            <div>
              <label htmlFor="task-context" className="text-sm font-medium text-text-primary">Additional AI context and development notes <span className="font-normal text-text-muted">(optional)</span></label>
              <p className="mt-1 text-xs text-text-muted">Existing context is retained here alongside the new AI record fields.</p>
              <textarea
                id="task-context"
                name="context"
                rows="3"
                value={form.context}
                onChange={updateField}
                className={fieldClass}
                placeholder="Decisions or other details that will help continue this task."
              />
            </div>
            <div>
              <label htmlFor="handoff-notes" className="text-sm font-medium text-text-primary">Handoff notes <span className="font-normal text-text-muted">(optional)</span></label>
              <textarea id="handoff-notes" name="handoffNotes" rows="3" value={form.handoffNotes} onChange={updateField} className={fieldClass} placeholder="What should the next owner know?" />
            </div>
          </section>
          <section aria-labelledby="handoff-readiness-heading" className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 id="handoff-readiness-heading" className="text-sm font-semibold text-text-primary">Handoff readiness</h3>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${handoffReadiness.ready ? 'bg-due-safe/10 text-due-safe' : 'bg-due-warning/10 text-due-warning'}`}>
                {handoffReadiness.ready ? 'Ready' : 'Needs context'}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Updates as you edit these fields.
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
                    className="min-h-10 rounded px-3 py-2 text-xs font-medium text-due-overdue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                    aria-label={`Remove deliverable link ${index + 1}`}
                  >Remove</button>
                </div>
                <label className="mt-2 block text-xs font-medium text-text-primary" htmlFor={`deliverable-label-${index}`}>Label</label>
                <input id={`deliverable-label-${index}`} value={deliverable.label} onChange={(event) => updateDeliverable(index, 'label', event.target.value)} className={fieldClass} placeholder="e.g. GitHub repository" aria-invalid={Boolean(deliverableErrors[index]?.startsWith('Add a short label'))} aria-describedby={deliverableErrors[index]?.startsWith('Add a short label') ? `deliverable-error-${index}` : undefined} />
                <label className="mt-2 block text-xs font-medium text-text-primary" htmlFor={`deliverable-url-${index}`}>URL</label>
                <input id={`deliverable-url-${index}`} type="url" value={deliverable.url} onChange={(event) => updateDeliverable(index, 'url', event.target.value)} className={fieldClass} placeholder="https://…" aria-invalid={Boolean(deliverableErrors[index] && !deliverableErrors[index].startsWith('Add a short label'))} aria-describedby={deliverableErrors[index] && !deliverableErrors[index].startsWith('Add a short label') ? `deliverable-error-${index}` : undefined} />
                {deliverableErrors[index] && <p id={`deliverable-error-${index}`} role="alert" className="mt-1 text-xs text-due-overdue">{deliverableErrors[index]}</p>}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, deliverables: [...(current.deliverables || []), { label: '', url: '' }] }))}
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-text-primary hover:bg-slate-50"
            >Add deliverable link</button>
            {(form.deliverables || []).some((item) => item.label.trim() && item.url.trim()) && (
              <div className="space-y-1 rounded-md bg-slate-50 p-3">
                <p className="text-xs font-medium text-text-muted">Saved links</p>
                {form.deliverables.filter((item) => item.label.trim() && item.url.trim() && isValidHttpUrl(item.url.trim())).map((item, index) => (
                  <a key={`${item.url}-${index}`} href={item.url.trim()} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center break-all text-sm text-brand-primary underline hover:text-brand-accent">
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
                className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                Copy as Prompt Context
              </button>
              <p className="mt-2 text-xs text-text-muted">Copies saved task values. Save changes before copying to include your edits.</p>

              {copyFeedback && (
                <p role={copyFeedback.startsWith('Copied') ? 'status' : 'alert'} aria-live={copyFeedback.startsWith('Copied') ? 'polite' : 'assertive'} aria-atomic="true" className={`mt-2 text-sm ${copyFeedback.startsWith('Copied') ? 'text-due-safe' : 'text-due-overdue'}`}>
                  {copyFeedback}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-text-muted">* Required fields</p>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            {isEditing ? (
              <button type="button" onClick={onDelete} className="min-h-10 rounded-md px-3 py-2 text-sm font-medium text-due-overdue hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">Delete task</button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-text-primary hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">Cancel</button>
              <button type="submit" className="min-h-10 rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">{isEditing ? 'Save changes' : 'Add task'}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function DemoLogin({ onContinue }) {
  const [selectedUserId, setSelectedUserId] = useState('');

  function submit(event) {
    event.preventDefault();
    if (DEMO_USERS.some((user) => user.id === selectedUserId)) onContinue(selectedUserId);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page p-4 sm:p-8">
      <section aria-labelledby="demo-login-heading" className="w-full min-w-0 max-w-3xl rounded-xl border border-slate-200 bg-surface-card p-4 shadow-sm sm:p-6 lg:p-8">
        <header className="mb-7">
          <p className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold text-brand-primary">
            <span className="inline-block h-2 w-2 bg-brand-primary" aria-hidden="true" />
            Vibecoding Project Tracker
          </p>
          <h1 id="demo-login-heading" className="font-heading text-2xl font-semibold text-text-primary">Choose a demo user</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
            This is a demonstration login. Choose a sample team member to continue; no password or registration is required. Everyone shares the same project board on this browser.
          </p>
        </header>
        <form onSubmit={submit}>
          <fieldset>
            <legend className="mb-3 text-sm font-medium text-text-primary">Select your team role</legend>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {DEMO_USERS.map((user) => (
                <label key={user.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${selectedUserId === user.id ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <input
                    type="radio"
                    name="demo-user"
                    value={user.id}
                    checked={selectedUserId === user.id}
                    onChange={() => setSelectedUserId(user.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-text-primary">{user.name}</span>
                    <span className="mt-1 block text-xs font-medium text-brand-primary">{user.role}</span>
                    <span className="mt-2 block break-all text-xs text-text-muted">{user.email}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-muted">Demo only. This does not verify identity or protect project data.</p>
            <button
              type="submit"
              disabled={!selectedUserId}
              className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >Continue to Tracker</button>
          </div>
        </form>
      </section>
    </main>
  );
}
export default function App() {
  const [storedTasks, setTasks, taskStorageError, retryTasksSave, taskReadFailed] = useLocalStorage('vibetracker.tasks', SEED_TASKS, isTaskData);
  const tasks = storedTasks.map(normalizeTask);
  useEffect(() => {
    if (taskStorageError) return;
    const needsMigration = storedTasks.some((task) => (
      (!task.assigneeId && DEMO_USERS.some((user) => user.name === task.assignee))
      || !task.handoffReadiness
      || typeof task.handoffNotes !== 'string'
      || !('handoffRecipientId' in task)
    ));
    if (needsMigration) {
      setTasks(storedTasks.map((task) => {
        const normalizedTask = normalizeTask(task);
        return {
          ...normalizedTask,
          handoffRecipientId: normalizedTask.handoffRecipientId || null,
          handoffNotes: normalizedTask.handoffNotes || '',
          handoffReadiness: normalizedTask.handoffReadiness || getHandoffReadiness(normalizedTask),
        };
      }));
    }
  }, [storedTasks, setTasks, taskStorageError]);
  const [sessionUserId, setSessionUserId, sessionStorageError, retrySessionSave, sessionReadFailed] = useLocalStorage('vibetracker.currentUserId', null, (value) => value === null || typeof value === 'string');
  const [activeTask, setActiveTask] = useState(undefined);
  const [notice, setNotice] = useState('');
  const modalTriggerRef = useRef(null);
  const addTaskButtonRef = useRef(null);
  const backgroundRef = useRef(null);
  const anchorTriggerRefs = useRef({});

  useLayoutEffect(() => {
    if (backgroundRef.current) backgroundRef.current.inert = activeTask !== undefined;
  }, [activeTask]);

  function restoreModalFocus() {
    requestAnimationFrame(() => {
      const trigger = modalTriggerRef.current;
      (trigger?.isConnected ? trigger : addTaskButtonRef.current)?.focus();
    });
  }

  function openTaskModal(task) {
    modalTriggerRef.current = document.activeElement;
    setActiveTask(task);
  }

  function closeTaskModal() {
    setActiveTask(undefined);
    restoreModalFocus();
  }

  function saveTask(form) {
    const wasEditing = Boolean(activeTask);
    let result;
    if (wasEditing) {
      result = setTasks((current) => current.map((item) => item.id === activeTask.id ? { ...item, ...form } : item));
    } else {
      result = setTasks((current) => [...current, {
        ...form,
        assignee: '',
        handoffRecipientId: null,
        handoffReadiness: getHandoffReadiness(form),
        id: globalThis.crypto?.randomUUID?.() || `task-${Date.now()}`,
        createdDate: getLocalIsoDate(),
      }]);
    }
    setNotice(result.saved
      ? (wasEditing ? 'Task updated.' : 'Task created.')
      : 'Task change is only in this session and may not survive a refresh.');
    setActiveTask(undefined);
    restoreModalFocus();
  }

  function deleteTask() {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    const result = setTasks((current) => current.filter((item) => item.id !== activeTask.id));
    setNotice(result.saved ? 'Task deleted.' : 'Task removal is only in this session and may not survive a refresh.');
    setActiveTask(undefined);
    restoreModalFocus();
  }

  function changeTaskStatus(taskId, status) {
    const result = setTasks((currentTasks) => currentTasks.map((task) => (
      task.id === taskId ? { ...task, status } : task
    )));
    const stage = STAGES.find((item) => item.id === status);
    setNotice(result.saved
      ? 'Task moved to ' + (stage?.label || 'another stage') + '.'
      : 'Task move is only in this session and may not survive a refresh.');
  }

  function handoffTask(taskId, recipientId) {
    const recipient = getUser(recipientId);
    if (!recipient) return;
    const result = setTasks((current) => current.map((rawTask) => {
      const task = normalizeTask(rawTask);
      if (task.id !== taskId) return task;
      return {
        ...task,
        assigneeId: recipient.id,
        assignee: '',
        handoffRecipientId: recipient.id,
        handoffReadiness: getHandoffReadiness(task),
      };
    }));
    setNotice(result.saved
      ? `Handed off to ${recipient.name}.`
      : `Handoff to ${recipient.name} is only in this session and may not survive a refresh.`);
  }

  const [anchors, setAnchors, anchorStorageError, retryAnchorsSave, anchorReadFailed] = useLocalStorage('vibetracker.anchors', ANCHOR_SLOTS, isAnchorData);
  const [editingAnchorId, setEditingAnchorId] = useState(null);
  const [anchorUrlDraft, setAnchorUrlDraft] = useState('');
  const [anchorError, setAnchorError] = useState('');

  const currentUser = DEMO_USERS.find((user) => user.id === sessionUserId);

  const storageWarnings = [
    { key: 'vibetracker.tasks', error: taskStorageError, readFailed: taskReadFailed, retry: retryTasksSave },
    { key: 'vibetracker.anchors', error: anchorStorageError, readFailed: anchorReadFailed, retry: retryAnchorsSave },
    { key: 'vibetracker.currentUserId', error: sessionStorageError, readFailed: sessionReadFailed, retry: retrySessionSave },
  ].filter((item) => item.error);
  const noticeIsError = notice.includes('only in this session') || notice.includes('may not survive a refresh');

  function renderStorageWarnings() {
    if (!storageWarnings.length) return null;
    return (
      <section aria-label="Storage warnings" className="mb-4 space-y-2">
        {storageWarnings.map(({ key, error, readFailed, retry }) => (
          <div key={key} role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p>{getStorageWarning(key, error, readFailed)}</p>
            <button type="button" onClick={() => {
              const result = retry();
              if (result.saved) {
                setNotice(result.recovered || result.loaded
                  ? 'Saved browser data recovered.'
                  : 'Current session changes saved to browser storage.');
              }
            }} className="shrink-0 rounded-md border border-amber-700 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50">Retry storage</button>
          </div>
        ))}
      </section>
    );
  }

  if (!currentUser) {
    return <><DemoLogin onContinue={setSessionUserId} />{renderStorageWarnings()}</>;
  }

  function startEditingAnchor(anchor) {
    setEditingAnchorId(anchor.id);
    setAnchorUrlDraft(anchor.url || '');
    setAnchorError('');
  }

  function saveAnchor(anchorId) {
    const url = anchorUrlDraft.trim();
    if (!isValidHttpUrl(url)) {
      setAnchorError('Enter a valid http:// or https:// URL.');
      return;
    }
    const currentAnchors = Array.isArray(anchors) ? anchors : ANCHOR_SLOTS;
    setAnchors(ANCHOR_SLOTS.map((slot) => {
      const existing = currentAnchors.find((anchor) => anchor.id === slot.id);
      return { ...slot, url: slot.id === anchorId ? url : (existing?.url || null) };
    }));
    setEditingAnchorId(null);
    setAnchorUrlDraft('');
    setAnchorError('');
    requestAnimationFrame(() => anchorTriggerRefs.current[anchorId]?.focus());
  }

  function removeAnchor(anchorId) {
    const currentAnchors = Array.isArray(anchors) ? anchors : ANCHOR_SLOTS;
    setAnchors(ANCHOR_SLOTS.map((slot) => {
      const existing = currentAnchors.find((anchor) => anchor.id === slot.id);
      return { ...slot, url: slot.id === anchorId ? null : (existing?.url || null) };
    }));
    setEditingAnchorId(null);
    setAnchorUrlDraft('');
    setAnchorError('');
    requestAnimationFrame(() => anchorTriggerRefs.current[anchorId]?.focus());
  }
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-surface-page p-3 font-sans text-text-primary sm:p-5 lg:p-6">
      <div ref={backgroundRef} aria-hidden={activeTask !== undefined}>
      {renderStorageWarnings()}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold text-text-primary">
            <span className="inline-block h-2 w-2 bg-brand-primary" aria-hidden="true" />
            Vibecoding Project Tracker
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
            <span>{currentUser.name}</span>
            <span aria-hidden="true">·</span>
            <span>{currentUser.role}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSessionUserId(null)}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2"
        >Switch User</button>
      </header>

      <section aria-labelledby="anchor-board-heading" className="mb-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="anchor-board-heading" className="font-heading text-base font-semibold text-text-primary">Anchor Board</h2>
          <p className="text-xs text-text-muted">Project deliverables</p>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {ANCHOR_SLOTS.map((slot) => {
            const savedAnchor = Array.isArray(anchors) ? anchors.find((anchor) => anchor.id === slot.id) : null;
            const url = savedAnchor?.url || null;
            const isEditing = editingAnchorId === slot.id;
            return (
              <article key={slot.id} className="rounded-lg border border-[#E2E8F0] bg-surface-card p-4">
                <h3 className="text-sm font-medium text-text-primary">{slot.label}</h3>
                {isEditing ? (
                  <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); saveAnchor(slot.id); }}>
                    <label htmlFor={`anchor-url-${slot.id}`} className="text-xs font-medium text-text-muted">HTTP or HTTPS URL</label>
                    <input
                      id={`anchor-url-${slot.id}`}
                      type="url"
                      value={anchorUrlDraft}
                      onChange={(event) => { setAnchorUrlDraft(event.target.value); setAnchorError(''); }}
                      placeholder="https://…"
                      aria-invalid={Boolean(anchorError)}
                      aria-describedby={anchorError ? `anchor-error-${slot.id}` : undefined}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      autoFocus
                    />
                    {anchorError && <p id={`anchor-error-${slot.id}`} role="alert" className="text-xs text-due-overdue">{anchorError}</p>}
                    <div className="flex gap-2">
                      <button type="submit" className="min-h-10 rounded-md bg-brand-primary px-3 py-2 text-xs font-medium text-white hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-primary/30">Save link</button>
                      <button type="button" onClick={() => { setEditingAnchorId(null); setAnchorError(''); requestAnimationFrame(() => anchorTriggerRefs.current[slot.id]?.focus()); }} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-text-primary hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-10 items-center break-all text-sm text-brand-primary underline hover:text-brand-accent">Open deliverable</a>
                    ) : (
                      <p className="mt-2 rounded-md border border-dashed border-[#E2E8F0] px-3 py-4 text-center text-sm text-text-muted">No link added yet.</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button ref={(element) => { anchorTriggerRefs.current[slot.id] = element; }} type="button" onClick={() => startEditingAnchor({ ...slot, url })} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-text-primary hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">{url ? 'Edit link' : 'Add link'}</button>
                      {url && <button type="button" onClick={() => removeAnchor(slot.id)} className="min-h-10 rounded-md px-3 py-2 text-xs font-medium text-due-overdue hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">Remove</button>}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="mb-4 flex justify-end">
        <button ref={addTaskButtonRef} type="button" onClick={() => openTaskModal(null)} className="min-h-11 w-full rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-primary/30 sm:w-auto">Add task</button>
      </div>
      {notice && (
        <p role={noticeIsError ? 'alert' : 'status'} aria-live={noticeIsError ? 'assertive' : 'polite'} aria-atomic="true" className={`mb-4 rounded-md border bg-white px-3 py-2 text-sm ${noticeIsError ? 'border-red-200 text-due-overdue' : 'border-emerald-200 text-due-safe'}`}>
          {notice}
        </p>
      )}
      <main className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <TaskCard key={task.id} task={task} onEdit={openTaskModal} onStatusChange={changeTaskStatus} onHandoff={handoffTask} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </main>
      </div>
      {activeTask !== undefined && (
        <TaskModal
          key={activeTask?.id || 'new-task'}
          task={activeTask}
          onClose={closeTaskModal}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}
