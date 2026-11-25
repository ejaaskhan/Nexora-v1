import React, { useEffect, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { DrawerModal } from '../ui/DrawerModal';
import { GlowButton } from '../ui/GlowButton';
import {
  CreateTaskInput,
  PlannerTask,
  TaskCategory,
  TaskPriority,
  TaskSubtask,
} from '../../types/productivity';
import { generateId, getTodayISO } from '../../utils/date';

const CATEGORIES: TaskCategory[] = ['Deep Work', 'Planning', 'Admin', 'Personal'];
const PRIORITIES: Array<{ value: TaskPriority; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
const ESTIMATES = [15, 25, 45, 50, 60, 90];

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  editingTask?: PlannerTask | null;
  onSave: (input: CreateTaskInput, existingId?: string) => void;
  onDelete?: (id: string) => void;
  onRequestDelete?: (task: PlannerTask) => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  open,
  onClose,
  defaultDate,
  editingTask,
  onSave,
  onDelete,
  onRequestDelete,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || getTodayISO());
  const [dueTime, setDueTime] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Deep Work');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [confirmInlineDelete, setConfirmInlineDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setDate(editingTask.date);
      setDueTime(editingTask.dueTime ?? '');
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setEstimatedMinutes(editingTask.estimatedMinutes);
      setNotes(editingTask.notes);
      setSubtasks(editingTask.subtasks ? editingTask.subtasks.map((s) => ({ ...s })) : []);
    } else {
      setTitle('');
      setDate(defaultDate || getTodayISO());
      setDueTime('');
      setCategory('Deep Work');
      setPriority('medium');
      setEstimatedMinutes(25);
      setNotes('');
      setSubtasks([]);
    }
    setNewSubtaskTitle('');
    setConfirmInlineDelete(false);
    setError('');
  }, [open, editingTask, defaultDate]);

  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [
      ...prev,
      { id: generateId('sub'), title: trimmed, completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Enter a clear task title before saving.');
      return;
    }

    const pendingSubtask = newSubtaskTitle.trim();
    const finalSubtasks = pendingSubtask
      ? [...subtasks, { id: generateId('sub'), title: pendingSubtask, completed: false }]
      : subtasks;

    onSave(
      {
        title: trimmed,
        date: date || getTodayISO(),
        dueTime: dueTime.trim() ? dueTime.trim() : null,
        category,
        priority,
        estimatedMinutes: Math.max(5, Math.min(480, Number(estimatedMinutes) || 25)),
        notes: notes.trim(),
        subtasks: finalSubtasks,
      },
      editingTask?.id
    );
    onClose();
  };

  const completedSubCount = subtasks.filter((s) => s.completed).length;

  return (
    <DrawerModal
      open={open}
      onClose={onClose}
      title={editingTask ? 'Edit Task' : 'New Task'}
      subtitle={
        editingTask
          ? 'Update deadline, priority, subtasks, or notes.'
          : 'Capture a deliverable with deadline, priority, and checklist.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="task-title-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Task Title
          </label>
          <input
            id="task-title-input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g., Draft quarterly engineering roadmap"
            autoFocus
            className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400"
          />
          {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>

        {/* Deadline Date & Optional Due Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="task-date-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Deadline Date
            </label>
            <input
              id="task-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="task-time-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Due Time (Optional)
              </label>
              {dueTime && (
                <button
                  type="button"
                  onClick={() => setDueTime('')}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              id="task-time-input"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
            />
          </div>
        </div>

        {/* Category & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="task-category-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Category
            </label>
            <select
              id="task-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl nx-input"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-white dark:bg-slate-900">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Priority Level
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {PRIORITIES.map((p) => {
                const active = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      active
                        ? 'nx-glow-button text-white border border-white/15'
                        : 'nx-input text-slate-700 dark:text-slate-300 hover:border-cyan-500/40'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Estimated Duration */}
        <div>
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Estimated Focus Duration
          </span>
          <div className="grid grid-cols-3 gap-2">
            {ESTIMATES.map((mins) => {
              const active = estimatedMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setEstimatedMinutes(mins)}
                  className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-mono tabular-nums transition-all ${
                    active
                      ? 'nx-gradient-primary text-white border border-white/15 shadow-sm'
                      : 'nx-input text-slate-700 dark:text-slate-300 hover:border-cyan-500/40'
                  }`}
                >
                  {mins} min
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Subtasks Checklist Builder */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="task-subtask-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Subtasks Checklist
            </label>
            {subtasks.length > 0 && (
              <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                {completedSubCount}/{subtasks.length} done
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="task-subtask-input"
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
              placeholder="Add a subtask step and press Enter..."
              className="flex-1 min-h-[42px] px-3.5 py-2 text-sm rounded-xl nx-input placeholder:text-slate-400"
            />
            <GlowButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={!newSubtaskTitle.trim()}
              onClick={handleAddSubtask}
              aria-label="Add subtask"
            >
              <Plus className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
            </GlowButton>
          </div>

          {subtasks.length > 0 && (
            <ul className="mt-2.5 divide-y divide-slate-200/60 dark:divide-slate-800/70 border-t border-b nx-divider">
              {subtasks.map((sub) => (
                <li
                  key={sub.id}
                  className="py-2 flex items-center justify-between gap-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(sub.id)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left min-h-[36px]"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        sub.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70'
                      }`}
                    >
                      {sub.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </span>
                    <span
                      className={`truncate ${
                        sub.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {sub.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(sub.id)}
                    aria-label={`Remove subtask ${sub.title}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="task-notes-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Notes
          </label>
          <textarea
            id="task-notes-input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional context, acceptance criteria, or links..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400 resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t nx-divider flex flex-wrap items-center justify-between gap-3">
          {editingTask && (onRequestDelete || onDelete) ? (
            onRequestDelete ? (
              <GlowButton
                variant="danger"
                size="sm"
                onClick={() => {
                  onClose();
                  onRequestDelete(editingTask);
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </GlowButton>
            ) : !confirmInlineDelete ? (
              <GlowButton
                variant="danger"
                size="sm"
                onClick={() => setConfirmInlineDelete(true)}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </GlowButton>
            ) : (
              <div className="flex items-center gap-2">
                <GlowButton
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    onDelete?.(editingTask.id);
                    onClose();
                  }}
                >
                  Confirm Delete
                </GlowButton>
                <GlowButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmInlineDelete(false)}
                >
                  Cancel
                </GlowButton>
              </div>
            )
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <GlowButton variant="ghost" onClick={onClose}>
              Cancel
            </GlowButton>
            <GlowButton type="submit" variant="primary">
              {editingTask ? 'Save Changes' : 'Create Task'}
            </GlowButton>
          </div>
        </div>
      </form>
    </DrawerModal>
  );
};
