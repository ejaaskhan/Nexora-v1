import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { DrawerModal } from '../ui/DrawerModal';
import { GlowButton } from '../ui/GlowButton';
import { PlannerTask, TaskCategory, TimeBlock, TimeBlockStatus } from '../../types/productivity';
import { formatMinuteOfDay, getTodayISO } from '../../utils/date';

const CATEGORIES: TaskCategory[] = ['Deep Work', 'Planning', 'Admin', 'Personal'];
const DURATIONS = [15, 30, 45, 60, 90, 120];
const STATUS_OPTIONS: Array<{ value: TimeBlockStatus; label: string }> = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const START_MINUTE_OPTIONS: number[] = [];
for (let m = 6 * 60; m <= 21 * 60 + 45; m += 15) {
  START_MINUTE_OPTIONS.push(m);
}

interface TimeBlockFormModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultStartMinute?: number;
  editingBlock?: TimeBlock | null;
  availableTasks: PlannerTask[];
  existingBlocks: TimeBlock[];
  onSave: (input: Omit<TimeBlock, 'id'>, existingId?: string) => void;
  onDelete?: (id: string) => void;
}

export const TimeBlockFormModal: React.FC<TimeBlockFormModalProps> = ({
  open,
  onClose,
  defaultDate,
  defaultStartMinute,
  editingBlock,
  availableTasks,
  existingBlocks,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || getTodayISO());
  const [startMinute, setStartMinute] = useState(defaultStartMinute ?? 9 * 60);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [category, setCategory] = useState<TaskCategory>('Deep Work');
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [status, setStatus] = useState<TimeBlockStatus>('scheduled');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingBlock) {
      setTitle(editingBlock.title);
      setDate(editingBlock.date);
      setStartMinute(editingBlock.startMinute);
      setDurationMinutes(editingBlock.durationMinutes);
      setCategory(editingBlock.category);
      setLinkedTaskId(editingBlock.linkedTaskId ?? '');
      setStatus(editingBlock.status);
      setNotes(editingBlock.notes);
    } else {
      setTitle('');
      setDate(defaultDate || getTodayISO());
      setStartMinute(defaultStartMinute ?? 9 * 60);
      setDurationMinutes(60);
      setCategory('Deep Work');
      setLinkedTaskId('');
      setStatus('scheduled');
      setNotes('');
    }
    setError('');
  }, [open, editingBlock, defaultDate, defaultStartMinute]);

  const isExistingBlock = Boolean(editingBlock && editingBlock.id);

  const overlappingBlocks = useMemo(() => {
    const endMinute = startMinute + durationMinutes;
    return existingBlocks.filter((b) => {
      if (b.date !== date) return false;
      if (isExistingBlock && editingBlock && b.id === editingBlock.id) return false;
      const bEnd = b.startMinute + b.durationMinutes;
      return startMinute < bEnd && endMinute > b.startMinute;
    });
  }, [existingBlocks, date, startMinute, durationMinutes, editingBlock, isExistingBlock]);

  const handleLinkedTaskChange = (nextTaskId: string) => {
    setLinkedTaskId(nextTaskId);
    if (nextTaskId && !title.trim()) {
      const found = availableTasks.find((t) => t.id === nextTaskId);
      if (found) {
        setTitle(found.title);
        setCategory(found.category);
        if (found.estimatedMinutes >= 15 && found.estimatedMinutes <= 180) {
          setDurationMinutes(found.estimatedMinutes);
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Enter a block title before scheduling.');
      return;
    }
    if (startMinute + durationMinutes > 24 * 60) {
      setError('Time block extends past midnight. Choose an earlier start or shorter duration.');
      return;
    }

    onSave(
      {
        title: trimmed,
        date: date || getTodayISO(),
        startMinute,
        durationMinutes,
        category,
        linkedTaskId: linkedTaskId || null,
        status,
        notes: notes.trim(),
      },
      isExistingBlock && editingBlock ? editingBlock.id : undefined
    );
    onClose();
  };

  return (
    <DrawerModal
      open={open}
      onClose={onClose}
      title={isExistingBlock ? 'Edit Time Block' : 'Schedule Time Block'}
      subtitle="Reserve a protected execution window on your daily timeline."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="block-title-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Block Title
          </label>
          <input
            id="block-title-input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g., Architecture Deep Work"
            autoFocus
            className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400"
          />
          {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="block-date-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Date
            </label>
            <input
              id="block-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
            />
          </div>

          <div>
            <label
              htmlFor="block-start-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Start Time
            </label>
            <select
              id="block-start-select"
              value={startMinute}
              onChange={(e) => setStartMinute(Number(e.target.value))}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
            >
              {START_MINUTE_OPTIONS.map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-slate-900">
                  {formatMinuteOfDay(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Duration</span>
            <span className="text-xs font-mono tabular-nums text-cyan-700 dark:text-cyan-300">
              {formatMinuteOfDay(startMinute)} – {formatMinuteOfDay(startMinute + durationMinutes)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map((mins) => {
              const active = durationMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
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

        {overlappingBlocks.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Schedule overlap detected</p>
              <p className="mt-0.5 opacity-90">
                Overlaps with {overlappingBlocks[0].title} (
                {formatMinuteOfDay(overlappingBlocks[0].startMinute)}–
                {formatMinuteOfDay(
                  overlappingBlocks[0].startMinute + overlappingBlocks[0].durationMinutes
                )}
                ). You can still save if intentional.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="block-category-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Category
            </label>
            <select
              id="block-category-select"
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
            <label
              htmlFor="block-status-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Status
            </label>
            <select
              id="block-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as TimeBlockStatus)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl nx-input"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="block-linked-task"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Linked Task (Optional)
          </label>
          <select
            id="block-linked-task"
            value={linkedTaskId}
            onChange={(e) => handleLinkedTaskChange(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl nx-input"
          >
            <option value="" className="bg-white dark:bg-slate-900">
              No linked task
            </option>
            {availableTasks.map((t) => (
              <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900">
                {t.title} ({t.estimatedMinutes}m)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="block-notes-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Session Notes
          </label>
          <textarea
            id="block-notes-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Define the primary deliverable for this block..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400 resize-none"
          />
        </div>

        <div className="pt-3 border-t nx-divider flex items-center justify-between gap-3">
          {isExistingBlock && editingBlock && onDelete ? (
            <GlowButton
              variant="danger"
              size="sm"
              onClick={() => {
                onDelete(editingBlock.id);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </GlowButton>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <GlowButton variant="ghost" onClick={onClose}>
              Cancel
            </GlowButton>
            <GlowButton type="submit" variant="primary">
              {isExistingBlock ? 'Save Block' : 'Schedule Block'}
            </GlowButton>
          </div>
        </div>
      </form>
    </DrawerModal>
  );
};
